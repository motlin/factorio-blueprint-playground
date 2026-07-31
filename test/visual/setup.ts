import fs from 'node:fs/promises';
import path from 'node:path';
import {chromium} from '@playwright/test';
import pixelmatch from 'pixelmatch';
import {PNG} from 'pngjs';
import {afterAll, beforeAll} from 'vite-plus/test';

let browser: Awaited<ReturnType<typeof chromium.launch>> | null = null;
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
}, 30_000);

async function renderToHtmlFile(html: string, testName: string): Promise<string> {
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
            ${factorioIconCss.replace(/\.[a-zA-Z_][a-zA-Z0-9_-]*/g, (match) => {
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

	try {
		await page.goto(fileUrl);
		await page.waitForSelector(selector);

		const element = await page.$(selector);
		if (!element) {
			throw new Error(`Element ${selector} not found`);
		}

		await element.screenshot({path: tempPath});

		let baselineBuffer: Buffer;
		try {
			baselineBuffer = await fs.readFile(snapshotPath);
		} catch (error: unknown) {
			if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
				await fs.rename(tempPath, snapshotPath);
				console.warn(`Created new baseline for ${testName}`);
				return;
			}
			throw error;
		}
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
	} finally {
		await Promise.all([fs.rm(htmlPath, {force: true}), fs.rm(tempPath, {force: true})]);
	}
}

export interface DialogViewportLayout {
	backdropCoversViewport: boolean;
	bodyFitsHorizontally: boolean;
	bodyOwnsScrolling: boolean;
	closeControlMatchesPriorArt: boolean;
	dialogFaceMatchesPriorArt: boolean;
	dialogFitsViewport: boolean;
	footerVisible: boolean;
	headerVisible: boolean;
	mapperOwnsHorizontalScrolling: boolean;
	mappingSourceWidthHonored: boolean;
	panelInsetsPreserved: boolean;
	singleMapperScrollRegion: boolean;
	titleColorMatchesPriorArt: boolean;
}

export interface BlueprintEditorViewportLayout {
	backdropCoversViewport: boolean;
	bodyFitsHorizontally: boolean;
	dialogFitsViewport: boolean;
	footerVisible: boolean;
	headerVisible: boolean;
	noPreviewRegion: boolean;
	settingsFitsHorizontally: boolean;
	settingsOwnsScrolling: boolean;
	settingsSourceWidthHonored: boolean;
	titleRowStaysOutsideScrollPane: boolean;
}

export async function inspectBlueprintEditorViewport(
	testName: string,
	html: string,
	viewport: {height: number; width: number},
): Promise<BlueprintEditorViewportLayout | undefined> {
	if (skipBrowserTests || browser === null) {
		return undefined;
	}

	const viewportPage = await browser.newPage({viewport});
	const htmlPath = await renderToHtmlFile(
		html,
		`${testName}-${viewport.width.toString()}x${viewport.height.toString()}`,
	);
	try {
		await viewportPage.goto(`file://${htmlPath}`);
		await viewportPage.waitForSelector('.transform-workbench--blueprint');

		return await viewportPage.evaluate(() => {
			const dialog = document.querySelector<HTMLElement>('.transform-workbench--blueprint');
			const backdrop = document.querySelector<HTMLElement>('.blueprint-editor__backdrop');
			if (dialog === null || backdrop === null) {
				throw new Error('Expected the Blueprint Editor dialog and backdrop.');
			}
			const body = dialog.querySelector<HTMLElement>(':scope > .blueprint-editor__layout');
			const footer = dialog.querySelector<HTMLElement>(':scope > .transform-workbench__footer');
			const header = dialog.querySelector<HTMLElement>(':scope > .transform-workbench__header');
			const settings = dialog.querySelector<HTMLElement>('.blueprint-editor__settings');
			const settingsScroll = dialog.querySelector<HTMLElement>('.blueprint-editor__settings-scroll');
			const titleRow = dialog.querySelector<HTMLElement>('.blueprint-editor__title-row');
			if (
				body === null ||
				footer === null ||
				header === null ||
				settings === null ||
				settingsScroll === null ||
				titleRow === null
			) {
				throw new Error('Expected the complete Blueprint Editor settings layout.');
			}

			const backdropBounds = backdrop.getBoundingClientRect();
			const dialogBounds = dialog.getBoundingClientRect();
			const footerBounds = footer.getBoundingClientRect();
			const headerBounds = header.getBoundingClientRect();
			const settingsBounds = settings.getBoundingClientRect();
			const bodyStyle = getComputedStyle(body);
			const dialogStyle = getComputedStyle(dialog);
			const settingsStyle = getComputedStyle(settings);
			const settingsScrollStyle = getComputedStyle(settingsScroll);
			const bodyContentWidth =
				body.clientWidth - Number.parseFloat(bodyStyle.paddingLeft) - Number.parseFloat(bodyStyle.paddingRight);
			const settingsAvailableWidth =
				bodyContentWidth -
				Number.parseFloat(settingsStyle.marginLeft) -
				Number.parseFloat(settingsStyle.marginRight);

			return {
				backdropCoversViewport:
					backdropBounds.top === 0 &&
					backdropBounds.right === window.innerWidth &&
					backdropBounds.bottom === window.innerHeight &&
					backdropBounds.left === 0,
				bodyFitsHorizontally: body.scrollWidth <= body.clientWidth,
				dialogFitsViewport:
					dialogBounds.top >= 0 &&
					dialogBounds.right <= window.innerWidth &&
					dialogBounds.bottom <= window.innerHeight &&
					dialogBounds.left >= 0,
				footerVisible: footerBounds.bottom <= window.innerHeight,
				headerVisible: headerBounds.top >= 0,
				noPreviewRegion:
					dialog.querySelector('[data-blueprint-preview]') === null &&
					![...dialog.querySelectorAll('h1, h2, h3, h4, h5, h6')].some(
						(heading) => heading.textContent.trim() === 'Preview',
					),
				settingsFitsHorizontally: settings.scrollWidth <= settings.clientWidth,
				settingsOwnsScrolling:
					settingsScrollStyle.overflowY === 'auto' &&
					bodyStyle.overflow === 'hidden' &&
					dialogStyle.overflow === 'hidden',
				settingsSourceWidthHonored: Math.abs(settingsBounds.width - Math.min(432, settingsAvailableWidth)) <= 1,
				titleRowStaysOutsideScrollPane:
					titleRow.parentElement === settings && !settingsScroll.contains(titleRow),
			};
		});
	} finally {
		await Promise.all([viewportPage.close(), fs.rm(htmlPath, {force: true})]);
	}
}

export async function inspectDialogViewport(
	testName: string,
	html: string,
	viewport: {height: number; width: number},
): Promise<DialogViewportLayout | undefined> {
	if (skipBrowserTests || browser === null) {
		return undefined;
	}

	const viewportPage = await browser.newPage({viewport});
	const htmlPath = await renderToHtmlFile(
		html,
		`${testName}-${viewport.width.toString()}x${viewport.height.toString()}`,
	);
	try {
		await viewportPage.goto(`file://${htmlPath}`);
		await viewportPage.waitForSelector('.upgrade-planner-dialog');

		return await viewportPage.evaluate(() => {
			const dialog = document.querySelector<HTMLElement>('.upgrade-planner-dialog');
			const body = document.querySelector<HTMLElement>('.upgrade-planner-dialog__body');
			if (dialog === null || body === null) {
				throw new Error('Expected the upgrade planner dialog and body.');
			}
			const header = dialog.querySelector<HTMLElement>(':scope > .upgrade-planner-dialog__title-bar');
			const footer = dialog.querySelector<HTMLElement>(':scope > .transform-workbench__footer');
			const closeControl = dialog.querySelector<HTMLElement>(
				':scope > .upgrade-planner-dialog__title-bar .transform-dialog__close',
			);
			const title = dialog.querySelector<HTMLElement>(':scope > .upgrade-planner-dialog__title-bar h3');
			const mapping = dialog.querySelector<HTMLElement>('.upgrade-mapping-grid__slots');
			const mapperScroll = dialog.querySelector<HTMLElement>('.upgrade-planner-dialog__scroll-region');
			const editor = dialog.querySelector<HTMLElement>('.upgrade-planner-dialog__editor-shell');
			const application = dialog.querySelector<HTMLElement>('.upgrade-planner-dialog__application');
			const replacements = dialog.querySelector<HTMLElement>('.book-wide-replacements');
			const backdrop = document.querySelector<HTMLElement>('.upgrade-planner-dialog__backdrop');
			if (
				header === null ||
				footer === null ||
				closeControl === null ||
				title === null ||
				mapping === null ||
				mapperScroll === null ||
				editor === null ||
				application === null ||
				replacements === null ||
				backdrop === null
			) {
				throw new Error('Expected the complete upgrade planner layout.');
			}

			const backdropBounds = backdrop.getBoundingClientRect();
			const closeBounds = closeControl.getBoundingClientRect();
			const dialogBounds = dialog.getBoundingClientRect();
			const headerBounds = header.getBoundingClientRect();
			const footerBounds = footer.getBoundingClientRect();
			const mapperScrollStyle = getComputedStyle(mapperScroll);
			const mappingBounds = mapping.getBoundingClientRect();
			const editorBounds = editor.getBoundingClientRect();
			const applicationBounds = application.getBoundingClientRect();
			const replacementsBounds = replacements.getBoundingClientRect();
			const bodyStyle = getComputedStyle(body);
			const closeStyle = getComputedStyle(closeControl);
			const dialogStyle = getComputedStyle(dialog);
			return {
				backdropCoversViewport:
					backdropBounds.top === 0 &&
					backdropBounds.right === window.innerWidth &&
					backdropBounds.bottom === window.innerHeight &&
					backdropBounds.left === 0,
				bodyFitsHorizontally: body.scrollWidth <= body.clientWidth,
				bodyOwnsScrolling: bodyStyle.overflowY === 'auto' && dialogStyle.overflow === 'hidden',
				closeControlMatchesPriorArt:
					closeBounds.width === 36 &&
					closeBounds.height === 36 &&
					closeStyle.backgroundColor === 'rgb(100, 100, 100)',
				dialogFaceMatchesPriorArt: dialogStyle.backgroundColor === 'rgb(48, 48, 48)',
				dialogFitsViewport:
					dialogBounds.top >= 0 &&
					dialogBounds.right <= window.innerWidth &&
					dialogBounds.bottom <= window.innerHeight &&
					dialogBounds.left >= 0,
				footerVisible: footerBounds.bottom <= window.innerHeight,
				headerVisible: headerBounds.top >= 0,
				mapperOwnsHorizontalScrolling:
					mapperScrollStyle.overflowX === 'auto' && mapperScroll.scrollWidth >= mapperScroll.clientWidth,
				mappingSourceWidthHonored: Math.abs(mappingBounds.width - 400) < 1,
				panelInsetsPreserved:
					Math.abs(applicationBounds.left - editorBounds.left - 4) < 1 &&
					Math.abs(editorBounds.left - replacementsBounds.left) < 1,
				singleMapperScrollRegion:
					dialog.querySelectorAll('[data-factorio-style="mappers_scroll_pane"]').length === 1,
				titleColorMatchesPriorArt: getComputedStyle(title).color === 'rgb(255, 230, 192)',
			};
		});
	} finally {
		await Promise.all([viewportPage.close(), fs.rm(htmlPath, {force: true})]);
	}
}
