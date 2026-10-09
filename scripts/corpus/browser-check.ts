// Loads popular factorioprints blueprints in a real browser and reports anything that breaks the page.
// Usage: tsx scripts/corpus/browser-check.ts <base-url> <corpus-dir> [concurrency]
// Download the corpus first with scripts/corpus/fetch-top-blueprints.sh.
import {readFileSync, readdirSync} from 'node:fs';
import {join} from 'node:path';

import {chromium, type Browser} from 'playwright';

import databaseJson from '../../src/generated/mod-db.json';
import {deserializeBlueprint} from '../../src/parsing/blueprintParser';
import type {ModDatabase} from '../../src/parsing/modDetection/types';
import type {BlueprintString} from '../../src/parsing/types';

interface Visit {
	key: string;
	selection: string | undefined;
}

interface VisitResult extends Visit {
	problems: string[];
	missingVanillaIcons: string[];
	longestTaskMs: number;
	seconds: number;
}

declare global {
	interface Window {
		longTasks: number[];
	}
}

if (process.argv.length < 4) {
	throw new Error('Usage: tsx scripts/corpus/browser-check.ts <base-url> <corpus-dir> [concurrency]');
}
const [baseUrl, corpusDirectory, concurrencyArgument = '4'] = process.argv.slice(2);
const concurrency = Number(concurrencyArgument);
const SETTLE_TIMEOUT_MS = 90_000;

// The icon CDN only hosts the game's own icons, so a missing icon is a bug only for a vanilla name.
const database = databaseJson as ModDatabase;
// Names that exist only in Factorio 1.1 and earlier, like steel-axe, have no icon there either.
const VANILLA_SOURCE_IDS = new Set([
	'base',
	'space-age',
	'quality',
	'elevated-rails',
	'map-editor',
	'space-age-map-editor',
]);
const ICON_URL = /factorio-icon-cdn\.pages\.dev\/[^/]+\/(?<name>[^/]+)\.webp$/;

function isVanillaName(name: string): boolean {
	const mask = database.names[name] ?? 0;
	return database.sources.some((source, index) => (mask & (1 << index)) !== 0 && VANILLA_SOURCE_IDS.has(source.id));
}

function entityCount(blueprint: BlueprintString): number {
	return (
		(blueprint.blueprint?.entities?.length ?? 0) +
		(blueprint.blueprint_book?.blueprints ?? []).reduce((total, child) => total + entityCount(child), 0)
	);
}

// The root, plus the book's largest top-level child, since lint cost grows with entity count.
function visitsFor(file: string): Visit[] {
	const key = file.replace(/\.txt$/, '');
	const encoded = readFileSync(join(corpusDirectory, file), 'utf8').trim();
	const visits: Visit[] = [{key, selection: undefined}];
	try {
		const children = deserializeBlueprint(encoded).blueprint_book?.blueprints ?? [];
		const largest = children
			.map((child, index) => ({index, entities: entityCount(child)}))
			.sort((first, second) => second.entities - first.entities)
			.at(0);
		if (largest !== undefined) visits.push({key, selection: String(largest.index + 1)});
	} catch {
		// The page reports strings it cannot parse; the root visit checks that.
	}
	return visits;
}

// Ads, analytics, and comments fail in headless runs; key-cdn misses are expected before the Firebase fallback.
const IGNORED_SOURCES = [
	'googletagmanager',
	'googlesyndication',
	'adsbygoogle',
	'browsingTopics',
	'disqus',
	'factorio-blueprint-key-cdn',
];

function isIgnored(source: string): boolean {
	return IGNORED_SOURCES.some((ignored) => source.includes(ignored));
}

async function check(browser: Browser, visit: Visit): Promise<VisitResult> {
	const page = await browser.newPage();
	const problems: string[] = [];
	const missingVanillaIcons: string[] = [];
	page.on('pageerror', (error) => {
		if (!isIgnored(`${error.stack ?? ''} ${error.message}`)) problems.push(`page error: ${error.message}`);
	});
	page.on('console', (message) => {
		// Failed requests are reported with their URL by the response handler instead.
		const failedRequest = message.text().startsWith('Failed to load resource');
		if (message.type() === 'error' && !failedRequest && !isIgnored(message.location().url)) {
			problems.push(`console error: ${message.text().slice(0, 200)}`);
		}
	});
	page.on('response', (response) => {
		const iconName = ICON_URL.exec(response.url())?.groups?.name;
		if (iconName !== undefined && response.status() >= 400) {
			// A broken icon is a gap in the icon CDN, not a broken page, so report it without failing.
			if (isVanillaName(decodeURIComponent(iconName))) missingVanillaIcons.push(response.url());
			return;
		}
		if (response.status() >= 400 && !isIgnored(response.url())) {
			problems.push(`HTTP ${response.status()}: ${response.url().slice(0, 200)}`);
		}
	});
	await page.addInitScript(() => {
		const tasks: number[] = [];
		window.longTasks = tasks;
		new PerformanceObserver((list) => {
			for (const entry of list.getEntries()) tasks.push(entry.duration);
		}).observe({type: 'longtask', buffered: true});
	});

	const pasted = encodeURIComponent(`https://factorioprints.com/view/${visit.key}`);
	const selection = visit.selection === undefined ? '' : encodeURIComponent(JSON.stringify(visit.selection));
	const start = Date.now();
	await page.goto(`${baseUrl}/?pasted=${pasted}&selection=${selection}`);
	try {
		await page.waitForFunction(
			() => {
				const text = document.body.innerText;
				const shown = text.includes('Basic Information') || document.querySelector('.alert-error') !== null;
				const settled =
					!text.includes('Checking blueprint for problems') && !text.includes('Checking mod requirements');
				return shown && settled;
			},
			undefined,
			{timeout: SETTLE_TIMEOUT_MS, polling: 250},
		);
	} catch {
		problems.push(`did not settle within ${SETTLE_TIMEOUT_MS / 1000}s`);
	}
	const text = await page.evaluate(() => document.body.innerText);
	const alert = await page.evaluate(() => document.querySelector('.alert-error')?.textContent.trim());
	if (alert !== undefined) problems.push(`error shown: ${alert.slice(0, 200)}`);
	if (text.includes('Could not check this blueprint')) problems.push('lint failed');
	const longestTaskMs = await page.evaluate(() => Math.max(0, ...window.longTasks));
	await page.close();
	return {
		...visit,
		problems,
		missingVanillaIcons,
		longestTaskMs: Math.round(longestTaskMs),
		seconds: (Date.now() - start) / 1000,
	};
}

const visits = readdirSync(corpusDirectory)
	.filter((file) => file.endsWith('.txt'))
	.sort()
	.flatMap(visitsFor);
const browser = await chromium.launch();
const results: VisitResult[] = [];
let next = 0;
await Promise.all(
	Array.from({length: concurrency}, async () => {
		while (next < visits.length) {
			const visit = visits.at(next);
			next += 1;
			if (visit === undefined) continue;
			const result = await check(browser, visit);
			results.push(result);
			const label = `${result.key}${result.selection === undefined ? '' : ` #${result.selection}`}`;
			const status = result.problems.length === 0 ? 'ok' : result.problems.join('; ');
			console.log(
				`${results.length}/${visits.length} ${label} ${result.seconds}s longest task ${result.longestTaskMs}ms: ${status}`,
			);
		}
	}),
);
await browser.close();

const failed = results.filter((result) => result.problems.length > 0);
const slowest = [...results].sort((first, second) => second.longestTaskMs - first.longestTaskMs).slice(0, 5);
const missingIcons = [...new Set(results.flatMap((result) => result.missingVanillaIcons))].sort();
console.log(`\n${results.length - failed.length}/${results.length} visits had no problems.`);
console.log(`Icon CDN misses for vanilla names: ${missingIcons.length === 0 ? 'none' : missingIcons.join(', ')}`);
console.log(
	`Longest main-thread tasks: ${slowest.map((result) => `${result.key} ${result.longestTaskMs}ms`).join(', ')}`,
);
process.exitCode = failed.length === 0 ? 0 : 1;
