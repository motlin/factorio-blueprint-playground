import fs from 'node:fs/promises';
import path from 'node:path';
import {chromium, type Page} from '@playwright/test';
import pixelmatch from 'pixelmatch';
import {PNG} from 'pngjs';
import {z} from 'zod';

import captureManifestJson from './capture-manifest.json';
import {canonicalViewports, captureManifestSchema} from './config';
import {startStaticServer} from './static-server';

const captureManifest = captureManifestSchema.parse(captureManifestJson);
const repositoryRoot = path.resolve(import.meta.dirname, '../..');
const storybookDirectory = path.join(repositoryRoot, 'storybook-static');
const snapshotDirectory = path.join(repositoryRoot, 'test/visual/__snapshots__/storybook');
const failureArtifactDirectory = path.join(repositoryRoot, 'test-results/visual-conformance');
const updateSnapshots = process.argv.slice(2).includes('--update');
const snapshotFailures: string[] = [];

if (process.argv.slice(2).some((argument) => argument !== '--update') || process.argv.slice(2).length > 1) {
	throw new Error('Usage: capture.ts [--update]');
}

function attachFailureListeners(page: Page, failures: string[]): void {
	page.on('console', (message) => {
		if (message.type() === 'error') failures.push(`console error: ${message.text()}`);
	});
	page.on('pageerror', (error) => failures.push(`page error: ${error.message}`));
	page.on('requestfailed', (request) => {
		failures.push(
			`request failed: ${request.method()} ${request.url()} (${request.failure()?.errorText ?? 'unknown'})`,
		);
	});
	page.on('response', (response) => {
		if (response.status() >= 400) failures.push(`HTTP ${response.status().toString()}: ${response.url()}`);
	});
}

async function waitForStory(page: Page, storyId: string): Promise<void> {
	await page.waitForFunction((expectedStoryId) => {
		const preview = (
			window as Window & {
				__STORYBOOK_PREVIEW__?: {storyRenders?: Array<{id: string; phase: string}>};
			}
		).__STORYBOOK_PREVIEW__;
		return preview?.storyRenders?.some(
			(storyRender) => storyRender.id === expectedStoryId && storyRender.phase === 'finished',
		);
	}, storyId);
	await page.evaluate(async () => {
		await document.fonts.ready;
		await Promise.all(
			Array.from(document.images).map(async (image) => {
				if (!image.complete) {
					await new Promise<void>((resolve, reject) => {
						image.addEventListener(
							'load',
							() => {
								resolve();
							},
							{once: true},
						);
						image.addEventListener(
							'error',
							() => {
								reject(new Error(`Image failed to load: ${image.currentSrc}`));
							},
							{
								once: true,
							},
						);
					});
				}
				if (image.currentSrc !== '') await image.decode();
			}),
		);
	});
}

async function inspectPage(page: Page): Promise<string[]> {
	return page.evaluate(async () => {
		const defects: string[] = [];
		const documentOverflow = document.documentElement.scrollWidth - window.innerWidth;
		if (documentOverflow > 1) defects.push(`horizontal page overflow: ${documentOverflow.toString()}px`);

		const brokenImages = Array.from(document.images)
			.filter((image) => image.currentSrc !== '' && (!image.complete || image.naturalWidth === 0))
			.map((image) => image.currentSrc);
		if (brokenImages.length > 0) defects.push(`broken images: ${brokenImages.join(', ')}`);

		const clippedRegions = Array.from(
			document.querySelectorAll<HTMLElement>(
				'[role="dialog"] > header, [role="dialog"] > footer, .transform-workbench__header, .transform-workbench__footer',
			),
		)
			.filter((element) => element.offsetParent !== null)
			.filter((element) => {
				const bounds = element.getBoundingClientRect();
				return (
					bounds.left < -1 ||
					bounds.top < -1 ||
					bounds.right > window.innerWidth + 1 ||
					bounds.bottom > window.innerHeight + 1
				);
			})
			.map((element) => element.className || element.tagName);
		if (clippedRegions.length > 0) defects.push(`clipped headers or footers: ${clippedRegions.join(', ')}`);

		const focusableSelector =
			'a[href], button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), ' +
			'[tabindex]:not([tabindex="-1"])';
		const focusableElements = Array.from(document.querySelectorAll<HTMLElement>(focusableSelector)).filter(
			(element) => {
				const bounds = element.getBoundingClientRect();
				const style = getComputedStyle(element);
				return (
					bounds.width > 0 && bounds.height > 0 && style.visibility !== 'hidden' && style.display !== 'none'
				);
			},
		);
		for (const element of focusableElements) {
			element.focus();
			await new Promise<void>((resolve) => {
				requestAnimationFrame(() => {
					resolve();
				});
			});
			if (document.activeElement !== element) {
				// Inert or aria-hidden subtrees reject focus; controls the user
				// cannot reach need no focus indicator.
				continue;
			}
			const bounds = element.getBoundingClientRect();
			if (
				bounds.left < -1 ||
				bounds.top < -1 ||
				bounds.right > window.innerWidth + 1 ||
				bounds.bottom > window.innerHeight + 1
			) {
				defects.push(
					`focused control is clipped: ${element.getAttribute('aria-label') ?? element.textContent}`,
				);
				continue;
			}
			const style = getComputedStyle(element);
			const outlineVisible =
				style.outlineStyle !== 'none' &&
				Number.parseFloat(style.outlineWidth === '' ? '0' : style.outlineWidth) > 0;
			const shadowVisible = style.boxShadow !== 'none';
			if (!outlineVisible && !shadowVisible) {
				defects.push(`missing focus indicator: ${element.getAttribute('aria-label') ?? element.textContent}`);
			}
		}
		return defects;
	});
}

async function compareSnapshot(snapshotPath: string, screenshot: Buffer): Promise<void> {
	if (updateSnapshots) {
		await fs.writeFile(snapshotPath, screenshot);
		return;
	}

	let expectedBytes: Buffer;
	try {
		expectedBytes = await fs.readFile(snapshotPath);
	} catch (error) {
		if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
			throw new Error(
				`Missing web snapshot ${path.relative(repositoryRoot, snapshotPath)}; rerun with --update.`,
			);
		}
		throw error;
	}
	const expected = PNG.sync.read(expectedBytes);
	const actual = PNG.sync.read(screenshot);
	if (expected.width !== actual.width || expected.height !== actual.height) {
		throw new Error(
			`Snapshot dimensions differ for ${path.basename(snapshotPath)}: ` +
				`${expected.width.toString()}×${expected.height.toString()} versus ${actual.width.toString()}×${actual.height.toString()}.`,
		);
	}
	const diff = new PNG({height: expected.height, width: expected.width});
	const differentPixels = pixelmatch(expected.data, actual.data, diff.data, expected.width, expected.height, {
		threshold: 0.1,
	});
	const difference = differentPixels / (expected.width * expected.height);
	if (difference > 0.001) {
		await fs.mkdir(failureArtifactDirectory, {recursive: true});
		const snapshotName = path.basename(snapshotPath, '.png');
		await Promise.all([
			fs.writeFile(path.join(failureArtifactDirectory, `${snapshotName}--expected.png`), expectedBytes),
			fs.writeFile(path.join(failureArtifactDirectory, `${snapshotName}--actual.png`), screenshot),
			fs.writeFile(path.join(failureArtifactDirectory, `${snapshotName}--diff.png`), PNG.sync.write(diff)),
		]);
		throw new Error(
			`${path.basename(snapshotPath)} differs by ${(difference * 100).toFixed(3)}%; ` +
				`wrote expected, actual, and diff images to ${path.relative(repositoryRoot, failureArtifactDirectory)}.`,
		);
	}
}

const requiredStateCoverage = new Set(captureManifest.stories.flatMap(({requiredStates}) => requiredStates));
const expectedStates = [
	'rest',
	'hover',
	'focus',
	'pressed',
	'selected',
	'disabled',
	'empty',
	'filled',
	'error',
] satisfies Array<(typeof captureManifest.stories)[number]['requiredStates'][number]>;
const expectedStateCoverage = new Set(expectedStates);
if (
	requiredStateCoverage.size !== expectedStateCoverage.size ||
	[...expectedStateCoverage].some((state) => !requiredStateCoverage.has(state))
) {
	throw new Error('Capture manifest must cover every required stable visual state.');
}

await fs.mkdir(snapshotDirectory, {recursive: true});
const server = await startStaticServer(storybookDirectory);
const browser = await chromium.launch({headless: true});

try {
	const storyIndex = z
		.object({entries: z.record(z.string(), z.object({type: z.string()}))})
		.parse(await (await fetch(`${server.url}/index.json`)).json());
	for (const {id: storyId} of captureManifest.stories) {
		if (storyIndex.entries[storyId]?.type !== 'story') {
			throw new Error(`Capture manifest story does not exist in the built Storybook: ${storyId}`);
		}
		for (const viewport of canonicalViewports) {
			const context = await browser.newContext({
				colorScheme: 'dark',
				deviceScaleFactor: 1,
				locale: 'en-US',
				reducedMotion: 'reduce',
				timezoneId: 'UTC',
				viewport: {height: viewport.height, width: viewport.width},
			});
			const page = await context.newPage();
			const failures: string[] = [];
			attachFailureListeners(page, failures);
			await page.goto(`${server.url}/iframe.html?id=${storyId}&viewMode=story`, {waitUntil: 'networkidle'});
			await waitForStory(page, storyId);
			const screenshot = await page.screenshot({animations: 'disabled', fullPage: false});
			failures.push(...(await inspectPage(page)));
			await context.close();
			if (failures.length > 0) {
				throw new Error(
					`${storyId} at ${viewport.width.toString()}×${viewport.height.toString()}:\n${failures.join('\n')}`,
				);
			}
			const snapshotPath = path.join(
				snapshotDirectory,
				`${storyId}--${viewport.width.toString()}x${viewport.height.toString()}.png`,
			);
			// Collect every snapshot mismatch so one run reports (and uploads)
			// all divergent captures instead of stopping at the first.
			try {
				await compareSnapshot(snapshotPath, screenshot);
				console.log(`✓ ${storyId} ${viewport.width.toString()}×${viewport.height.toString()}`);
			} catch (error) {
				snapshotFailures.push(error instanceof Error ? error.message : String(error));
			}
		}
	}
	if (snapshotFailures.length > 0) {
		throw new Error(snapshotFailures.join('\n'));
	}
} finally {
	await browser.close();
	await server.close();
}
