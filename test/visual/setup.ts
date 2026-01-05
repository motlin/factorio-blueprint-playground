import fs from 'node:fs/promises';
import path from 'node:path';
import {chromium} from '@playwright/test';
import pixelmatch from 'pixelmatch';
import {PNG} from 'pngjs';
import {afterAll, beforeAll} from 'vitest';

let browser: ReturnType<typeof chromium.launch> | null = null;
let page: Awaited<ReturnType<Awaited<ReturnType<typeof chromium.launch>>['newPage']>> | null = null;

const skipBrowserTests = process.env.CI === 'true' || process.env.SKIP_BROWSER_TESTS === 'true';

const tempDir = path.join(__dirname, 'temp');
const snapshotDir = path.join(__dirname, '__snapshots__');

beforeAll(async () => {
	await fs.mkdir(tempDir, {recursive: true});
	await fs.mkdir(snapshotDir, {recursive: true});

	if (skipBrowserTests) {
		console.warn('Skipping browser tests');
		return;
	}

	try {
		browser = await chromium.launch({
			headless: true,
		});
		page = await browser.newPage();
	} catch (error) {
		console.warn('Browser tests skipped: Unable to launch browser', error);
	}
});

afterAll(async () => {
	if (browser) {
		await browser.close();
	}

	const files = await fs.readdir(tempDir);
	for (const file of files) {
		if (file.endsWith('-temp.html') || file.endsWith('-temp.png')) {
			await fs.unlink(path.join(tempDir, file));
		}
	}
});

export async function renderToHtmlFile(html: string, testName: string): Promise<string> {
	const factorioCssPath = path.resolve(__dirname, '../../src/styles/factorio-a76ef767.css');
	const mainCssPath = path.resolve(__dirname, '../../src/styles/main.css');
	const factorioIconCssPath = path.resolve(__dirname, '../../src/components/core/icons/FactorioIcon.module.css');

	const factorioCss = await fs.readFile(factorioCssPath, 'utf-8');
	const mainCss = await fs.readFile(mainCssPath, 'utf-8');
	const factorioIconCss = await fs.readFile(factorioIconCssPath, 'utf-8');

	const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Visual Test</title>
        <style>
            ${factorioCss}
        </style>
        <style>
            ${mainCss}
        </style>
        <style>
            /* Transform CSS module classes to match runtime behavior */
            ${factorioIconCss.replace(/\.[a-zA-Z0-9_]+/g, (match) => {
				// Keep the CSS selectors but use data-attribute selectors to match the HTML
				return `[class*="${match.slice(1)}"]`;
			})}
        </style>
    </head>
    <body>
        <div id="root">${html}</div>
    </body>
    </html>
    `;

	const filePath = path.join(tempDir, `${testName}-temp.html`);
	await fs.writeFile(filePath, htmlContent);
	return filePath;
}

export async function compareScreenshots(testName: string, html: string, selector = '#root'): Promise<void> {
	if (skipBrowserTests) {
		console.warn(`Browser tests are disabled, skipping visual test for "${testName}"`);
		return;
	}

	if (!page) {
		console.warn(`Browser is not initialized, skipping visual test for "${testName}"`);
		return;
	}

	const htmlPath = await renderToHtmlFile(html, testName);
	const fileUrl = `file://${htmlPath}`;
	const snapshotPath = path.join(snapshotDir, `${testName}.png`);
	const tempPath = path.join(tempDir, `${testName}-temp.png`);

	await page.goto(fileUrl);
	await page.waitForSelector(selector);

	const element = await page.$(selector);
	if (!element) {
		throw new Error(`Element ${selector} not found`);
	}

	await element.screenshot({path: tempPath});

	try {
		const baselineBuffer = await fs.readFile(snapshotPath);
		const currentBuffer = await fs.readFile(tempPath);

		const baseline = PNG.sync.read(baselineBuffer);
		const current = PNG.sync.read(currentBuffer);

		if (baseline.width !== current.width || baseline.height !== current.height) {
			throw new Error(
				`Screenshot dimensions mismatch for ${testName}: ` +
					`baseline ${baseline.width}x${baseline.height} vs current ${current.width}x${current.height}`,
			);
		}

		const diff = new PNG({width: baseline.width, height: baseline.height});
		const mismatchedPixels = pixelmatch(baseline.data, current.data, diff.data, baseline.width, baseline.height, {
			threshold: 0.1,
		});

		const totalPixels = baseline.width * baseline.height;
		const mismatchPercentage = (mismatchedPixels / totalPixels) * 100;

		// Allow up to 0.1% pixel difference to account for anti-aliasing variations
		if (mismatchPercentage > 0.1) {
			const diffPath = path.join(tempDir, `${testName}-diff.png`);
			await fs.writeFile(diffPath, PNG.sync.write(diff));
			throw new Error(
				`Screenshot mismatch for ${testName}: ${mismatchPercentage.toFixed(2)}% pixels differ. ` +
					`Diff saved to ${diffPath}`,
			);
		}

		await fs.unlink(tempPath);
	} catch (error: unknown) {
		if (error instanceof Error && 'code' in error && (error as {code?: string}).code === 'ENOENT') {
			// No baseline exists, create it
			await fs.rename(tempPath, snapshotPath);
			console.warn(`Created new baseline for ${testName}`);
		} else {
			throw error;
		}
	}
}
