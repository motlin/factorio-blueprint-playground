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
	/*
	 * Workers can run several visual files against one module instance, so the
	 * handles have to be dropped as well as closed. Leaving them set hands the
	 * next file a closed browser that it believes is still live.
	 */
	browser = null;
	page = null;
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
	compactFooterUsesAtMostTwoRows: boolean;
	closeControlMatchesPriorArt: boolean;
	dialogFaceMatchesPriorArt: boolean;
	dialogFitsViewport: boolean;
	footerActionsShareUniformHeight: boolean;
	footerVisible: boolean;
	headerVisible: boolean;
	mapperFitsHorizontally: boolean;
	mapperOwnsHorizontalScrolling: boolean;
	mappingHeadingsAlignToColumns: boolean;
	mappingReflowsBelowSourceWidth: boolean;
	mappingSourceWidthHonored: boolean;
	panelInsetsPreserved: boolean;
	primaryActionVisible: boolean;
	singleMapperScrollRegion: boolean;
	titleColorMatchesPriorArt: boolean;
	titleStripeSpansToCloseControl: boolean;
}

export interface BlueprintEditorViewportLayout {
	backdropCoversViewport: boolean;
	bodyFitsHorizontally: boolean;
	dialogFitsViewport: boolean;
	footerVisible: boolean;
	headerVisible: boolean;
	noPreviewRegion: boolean;
	recordHeaderClearsScrolledIconRow: boolean;
	settingsFitsHorizontally: boolean;
	settingsOwnsScrolling: boolean;
	settingsSourceWidthHonored: boolean;
	titleRowStaysOutsideScrollPane: boolean;
}

export interface PageViewportLayout {
	documentFitsHorizontally: boolean;
	exportButtonsFitHorizontally: boolean;
	navigationFitsHorizontally: boolean;
	treeLabelsFitHorizontally: boolean;
}

export async function inspectPageViewport(
	testName: string,
	html: string,
	viewport: {height: number; width: number},
): Promise<PageViewportLayout | undefined> {
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
		await viewportPage.waitForSelector('.blueprint-export-actions');

		return await viewportPage.evaluate(() => {
			const navigation = document.querySelector<HTMLElement>('.site-navigation');
			const exportButtons = [...document.querySelectorAll<HTMLElement>('.blueprint-export-actions button')];
			const treeLabels = [...document.querySelectorAll<HTMLElement>('.blueprint-tree .label')];
			if (navigation === null || exportButtons.length !== 3 || treeLabels.length === 0) {
				throw new Error('Expected the page navigation, three export buttons, and blueprint tree labels.');
			}

			const fitsViewport = (element: HTMLElement): boolean => {
				const bounds = element.getBoundingClientRect();
				return bounds.left >= 0 && bounds.right <= document.documentElement.clientWidth;
			};

			return {
				documentFitsHorizontally: document.documentElement.scrollWidth === document.documentElement.clientWidth,
				exportButtonsFitHorizontally: exportButtons.every(fitsViewport),
				navigationFitsHorizontally: fitsViewport(navigation),
				treeLabelsFitHorizontally: treeLabels.every(fitsViewport),
			};
		});
	} finally {
		await Promise.all([viewportPage.close(), fs.rm(htmlPath, {force: true})]);
	}
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
			const iconRow = dialog.querySelector<HTMLElement>('.blueprint-label-icons__slots');
			if (
				body === null ||
				footer === null ||
				header === null ||
				settings === null ||
				settingsScroll === null ||
				titleRow === null ||
				iconRow === null
			) {
				throw new Error('Expected the complete Blueprint Editor settings layout.');
			}

			settingsScroll.scrollTop = iconRow.offsetTop + iconRow.offsetHeight / 2;

			const backdropBounds = backdrop.getBoundingClientRect();
			const dialogBounds = dialog.getBoundingClientRect();
			const footerBounds = footer.getBoundingClientRect();
			const headerBounds = header.getBoundingClientRect();
			const iconRowBounds = iconRow.getBoundingClientRect();
			const settingsBounds = settings.getBoundingClientRect();
			const settingsScrollBounds = settingsScroll.getBoundingClientRect();
			const titleRowBounds = titleRow.getBoundingClientRect();
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
				recordHeaderClearsScrolledIconRow:
					settingsScroll.scrollTop > 0 &&
					iconRowBounds.top < settingsScrollBounds.top &&
					titleRowBounds.bottom <= settingsScrollBounds.top &&
					!document
						.elementsFromPoint(iconRowBounds.left + 1, titleRowBounds.bottom - 1)
						.some((element) => element.closest('.blueprint-label-icons__slots') !== null),
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
			const footerActions = [...(footer?.querySelectorAll<HTMLButtonElement>('button') ?? [])];
			const primaryAction = footerActions.find((button) => button.textContent.includes('Apply Upgrade'));
			const closeControl = dialog.querySelector<HTMLElement>(
				':scope > .upgrade-planner-dialog__title-bar .transform-dialog__close',
			);
			const title = dialog.querySelector<HTMLElement>(':scope > .upgrade-planner-dialog__title-bar h3');
			const mapping = dialog.querySelector<HTMLElement>('.upgrade-mapping-grid__slots');
			const headings = [...dialog.querySelectorAll<HTMLElement>('.upgrade-mapping-grid__headings > div')].filter(
				(heading) => heading.getBoundingClientRect().width > 0,
			);
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
				backdrop === null ||
				primaryAction === undefined
			) {
				throw new Error('Expected the complete upgrade planner layout.');
			}

			const backdropBounds = backdrop.getBoundingClientRect();
			const closeBounds = closeControl.getBoundingClientRect();
			const dialogBounds = dialog.getBoundingClientRect();
			const headerBounds = header.getBoundingClientRect();
			const titleBounds = title.getBoundingClientRect();
			const footerBounds = footer.getBoundingClientRect();
			const footerActionRows = new Set(
				footerActions.map((button) => Math.round(button.getBoundingClientRect().top)),
			).size;
			const primaryActionBounds = primaryAction.getBoundingClientRect();
			/*
			 * A label long enough to wrap grows its button past the shared
			 * min-height, so equal heights and unwrapped labels are the same
			 * check read two ways.
			 */
			const footerActionHeights = new Set(
				footerActions.map((button) => Math.round(button.getBoundingClientRect().height)),
			);
			const footerActionsUnwrapped = footerActions.every(
				(button) =>
					Math.round(button.getBoundingClientRect().height) ===
					Math.round(Number.parseFloat(getComputedStyle(button).minHeight)),
			);
			const mapperScrollStyle = getComputedStyle(mapperScroll);
			const mappingBounds = mapping.getBoundingClientRect();
			const pairBounds = [...mapping.children].map((pair) => pair.getBoundingClientRect());
			const firstRowPairs =
				pairBounds.length === 0
					? []
					: pairBounds.filter((bounds) => Math.round(bounds.top) === Math.round(pairBounds[0].top));
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
				compactFooterUsesAtMostTwoRows: window.innerWidth > 620 || footerActionRows <= 2,
				closeControlMatchesPriorArt:
					closeBounds.width === 24 &&
					closeBounds.height === 24 &&
					closeStyle.backgroundColor === 'rgba(0, 0, 0, 0)',
				dialogFaceMatchesPriorArt: dialogStyle.backgroundColor === 'rgb(48, 48, 48)',
				dialogFitsViewport:
					dialogBounds.top >= 0 &&
					dialogBounds.right <= window.innerWidth &&
					dialogBounds.bottom <= window.innerHeight &&
					dialogBounds.left >= 0,
				footerActionsShareUniformHeight: footerActionHeights.size === 1 && footerActionsUnwrapped,
				footerVisible: footerBounds.bottom <= window.innerHeight,
				headerVisible: headerBounds.top >= 0,
				mapperFitsHorizontally: mapperScroll.scrollWidth <= mapperScroll.clientWidth,
				mapperOwnsHorizontalScrolling:
					mapperScrollStyle.overflowX === 'auto' && mapperScroll.scrollWidth >= mapperScroll.clientWidth,
				mappingHeadingsAlignToColumns:
					headings.length === firstRowPairs.length &&
					headings.every(
						(heading, index) =>
							Math.abs(heading.getBoundingClientRect().left - firstRowPairs[index].left) < 1,
					),
				mappingReflowsBelowSourceWidth:
					mapperScroll.clientWidth >= 400 ? firstRowPairs.length === 4 : firstRowPairs.length === 2,
				mappingSourceWidthHonored: mapperScroll.clientWidth < 400 || Math.abs(mappingBounds.width - 400) < 1,
				panelInsetsPreserved:
					Math.abs(applicationBounds.left - editorBounds.left - 4) < 1 &&
					Math.abs(editorBounds.left - replacementsBounds.left) < 1,
				primaryActionVisible:
					primaryActionBounds.top >= footerBounds.top &&
					primaryActionBounds.bottom <= footerBounds.bottom &&
					primaryActionBounds.bottom <= window.innerHeight,
				singleMapperScrollRegion:
					dialog.querySelectorAll('[data-factorio-style="mappers_scroll_pane"]').length === 1,
				titleColorMatchesPriorArt: getComputedStyle(title).color === 'rgb(255, 230, 192)',
				titleStripeSpansToCloseControl:
					getComputedStyle(title, '::after').content !== 'none' &&
					Math.abs(closeBounds.left - titleBounds.right) <= 1,
			};
		});
	} finally {
		await Promise.all([viewportPage.close(), fs.rm(htmlPath, {force: true})]);
	}
}

export interface DiscardConfirmationLayout {
	actionsFitHorizontally: boolean;
	backdropCoversViewport: boolean;
	buttonLabelsFit: boolean;
	buttonsDoNotOverlap: boolean;
	confirmationCentered: boolean;
	confirmationFitsViewport: boolean;
}

export async function inspectDiscardConfirmationViewport(
	testName: string,
	html: string,
	viewport: {height: number; width: number},
): Promise<DiscardConfirmationLayout | undefined> {
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
		await viewportPage.waitForSelector('.transform-dialog--confirmation');

		return await viewportPage.evaluate(() => {
			const backdrop = document.querySelector<HTMLElement>('.transform-dialog-backdrop--confirmation');
			const confirmation = document.querySelector<HTMLElement>('.transform-dialog--confirmation');
			if (backdrop === null || confirmation === null) {
				throw new Error('Expected the discard confirmation backdrop and dialog.');
			}
			const actions = confirmation.querySelector<HTMLElement>('.transform-dialog__actions');
			if (actions === null) {
				throw new Error('Expected the discard confirmation actions.');
			}
			const buttons = [...actions.querySelectorAll<HTMLElement>('.factorio-button')];
			if (buttons.length !== 2) {
				throw new Error('Expected two discard confirmation buttons.');
			}

			const backdropBounds = backdrop.getBoundingClientRect();
			const confirmationBounds = confirmation.getBoundingClientRect();
			const [keepEditing, discard] = buttons.map((button) => button.getBoundingClientRect());

			return {
				actionsFitHorizontally: actions.scrollWidth <= actions.clientWidth,
				backdropCoversViewport:
					backdropBounds.top <= 0 &&
					backdropBounds.left <= 0 &&
					backdropBounds.right >= window.innerWidth &&
					backdropBounds.bottom >= window.innerHeight,
				buttonLabelsFit: buttons.every((button) => {
					const content = button.querySelector<HTMLElement>('.factorio-button__content');
					const contentBounds = content?.getBoundingClientRect();
					const buttonBounds = button.getBoundingClientRect();
					return (
						contentBounds !== undefined &&
						contentBounds.left >= buttonBounds.left - 1 &&
						contentBounds.right <= buttonBounds.right + 1 &&
						contentBounds.top >= buttonBounds.top - 1 &&
						contentBounds.bottom <= buttonBounds.bottom + 1
					);
				}),
				buttonsDoNotOverlap: keepEditing.right <= discard.left + 1 || discard.right <= keepEditing.left + 1,
				confirmationCentered:
					Math.abs(confirmationBounds.left - (window.innerWidth - confirmationBounds.width) / 2) < 2,
				confirmationFitsViewport:
					confirmationBounds.top >= 0 &&
					confirmationBounds.left >= 0 &&
					confirmationBounds.right <= window.innerWidth &&
					confirmationBounds.bottom <= window.innerHeight,
			};
		});
	} finally {
		await Promise.all([viewportPage.close(), fs.rm(htmlPath, {force: true})]);
	}
}

export interface PixelSnappingLayout {
	backdropChildSnapped: boolean;
	containerSnapped: boolean;
	frameSnapped: boolean;
	layoutWidthIsOdd: boolean;
	librarySnapped: boolean;
	topBarInnerSnapped: boolean;
}

export async function inspectPixelSnapping(
	testName: string,
	html: string,
	viewport: {height: number; width: number},
): Promise<PixelSnappingLayout | undefined> {
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
		await viewportPage.waitForSelector('.container');

		return await viewportPage.evaluate(() => {
			const select = (selector: string): HTMLElement => {
				const element = document.querySelector<HTMLElement>(selector);
				if (element === null) {
					throw new Error(`Expected ${selector} in the pixel snapping fixture.`);
				}
				return element;
			};
			const onWholePixels = (element: HTMLElement): boolean => {
				const bounds = element.getBoundingClientRect();
				return Number.isInteger(bounds.left) && Number.isInteger(bounds.right);
			};

			return {
				backdropChildSnapped: onWholePixels(select('.factorio-dialog')),
				containerSnapped: onWholePixels(select('.container')),
				frameSnapped: onWholePixels(select('.factorio-frame')),
				layoutWidthIsOdd: document.body.clientWidth % 2 === 1,
				librarySnapped: onWholePixels(select('.blueprint-library')),
				topBarInnerSnapped: onWholePixels(select('.top-bar-inner')),
			};
		});
	} finally {
		await Promise.all([viewportPage.close(), fs.rm(htmlPath, {force: true})]);
	}
}

export interface FrameEdge {
	borderImageSource: string;
	borderStyle: string;
	borderWidth: string;
	boxShadow: string;
}

export interface FrameEdgeSurvey {
	deepInsetDark: FrameEdge;
	deepInsetLight: FrameEdge;
	deepScrollFrame: FrameEdge;
	shallowDialog: FrameEdge;
	shallowPanel: FrameEdge;
}

export async function inspectFrameEdges(testName: string, html: string): Promise<FrameEdgeSurvey | undefined> {
	if (skipBrowserTests || browser === null) {
		return undefined;
	}

	const viewportPage = await browser.newPage({viewport: {height: 900, width: 1280}});
	const htmlPath = await renderToHtmlFile(html, testName);
	try {
		await viewportPage.goto(`file://${htmlPath}`);
		await viewportPage.waitForSelector('[data-frame-sample]');

		return await viewportPage.evaluate(() => {
			const edgeOf = (sample: string): FrameEdge => {
				const element = document.querySelector<HTMLElement>(`[data-frame-sample="${sample}"]`);
				if (element === null) {
					throw new Error(`Expected the ${sample} frame sample.`);
				}
				const style = getComputedStyle(element);
				return {
					borderImageSource: style.borderImageSource,
					borderStyle: style.borderTopStyle,
					borderWidth: style.borderTopWidth,
					boxShadow: style.boxShadow,
				};
			};

			return {
				deepInsetDark: edgeOf('deep-inset-dark'),
				deepInsetLight: edgeOf('deep-inset-light'),
				deepScrollFrame: edgeOf('deep-scroll-frame'),
				shallowDialog: edgeOf('shallow-dialog'),
				shallowPanel: edgeOf('shallow-panel'),
			};
		});
	} finally {
		await Promise.all([viewportPage.close(), fs.rm(htmlPath, {force: true})]);
	}
}

export interface DialogChildInset {
	left: number;
	right: number;
	sample: string;
}

export async function inspectDialogChildInsets(
	testName: string,
	html: string,
): Promise<DialogChildInset[] | undefined> {
	if (skipBrowserTests || browser === null) {
		return undefined;
	}

	const viewportPage = await browser.newPage({viewport: {height: 900, width: 1280}});
	const htmlPath = await renderToHtmlFile(html, testName);
	try {
		await viewportPage.goto(`file://${htmlPath}`);
		await viewportPage.waitForSelector('[data-dialog-sample]');

		return await viewportPage.evaluate(() => {
			const dialogs = [...document.querySelectorAll<HTMLElement>('[data-dialog-sample]')];
			if (dialogs.length === 0) {
				throw new Error('Expected at least one dialog sample.');
			}
			return dialogs.flatMap((dialog) => {
				const sample = dialog.dataset['dialogSample'];
				if (sample === undefined) {
					throw new Error('Expected every dialog sample to be named.');
				}
				const bounds = dialog.getBoundingClientRect();
				return [...dialog.children].map((child, index) => {
					const childBounds = child.getBoundingClientRect();
					return {
						left: Math.round(childBounds.left - bounds.left),
						right: Math.round(bounds.right - childBounds.right),
						sample: `${sample}[${index.toString()}]`,
					};
				});
			});
		});
	} finally {
		await Promise.all([viewportPage.close(), fs.rm(htmlPath, {force: true})]);
	}
}

export interface DialogFrameEdge {
	bottomInner: string;
	bottomOuter: string;
	leftInner: string;
	leftOuter: string;
	rightInner: string;
	rightOuter: string;
	sample: string;
	topInner: string;
	topOuter: string;
}

function hexAt(image: PNG, x: number, y: number): string {
	const offset = (image.width * y + x) * 4;
	const channel = (index: number): string => image.data[offset + index].toString(16).padStart(2, '0');
	return `#${channel(0)}${channel(1)}${channel(2)}`;
}

/**
 * Screenshots each dialog sample on its own and reads the two outermost pixels of
 * every edge, so a child painted flush against the frame shows up as its own
 * background colour where the frame's bevel belongs.
 */
export async function inspectDialogFrameEdges(testName: string, html: string): Promise<DialogFrameEdge[] | undefined> {
	if (skipBrowserTests || browser === null) {
		return undefined;
	}

	const viewportPage = await browser.newPage({viewport: {height: 900, width: 1280}});
	const htmlPath = await renderToHtmlFile(html, testName);
	try {
		await viewportPage.goto(`file://${htmlPath}`);
		await viewportPage.waitForSelector('[data-dialog-sample]');

		const dialogs = viewportPage.locator('[data-dialog-sample]');
		const count = await dialogs.count();
		if (count === 0) {
			throw new Error('Expected at least one dialog sample.');
		}

		const edges: DialogFrameEdge[] = [];
		for (let index = 0; index < count; index++) {
			await viewportPage.evaluate((visible) => {
				for (const [position, dialog] of [
					...document.querySelectorAll<HTMLElement>('[data-dialog-sample]'),
				].entries()) {
					const backdrop = dialog.parentElement;
					if (backdrop === null) {
						throw new Error('Expected every dialog sample to sit in a backdrop.');
					}
					// The samples are stacked fixed-position backdrops, so hide the rest
					// to keep a neighbour from covering the dialog being photographed.
					backdrop.style.display = position === visible ? '' : 'none';
					if (position !== visible) {
						continue;
					}
					// Centring an odd-height dialog in an even-height backdrop lands its
					// top and bottom edges on `x.5`, which blends the bevel across two
					// device pixels and hides what is actually painted there. Top-align
					// the sample and round its height so every edge reads as one solid row.
					backdrop.style.alignContent = 'start';
					dialog.style.height = `${Math.ceil(dialog.getBoundingClientRect().height).toString()}px`;
				}
			}, index);

			const dialog = dialogs.nth(index);
			const sample = await dialog.getAttribute('data-dialog-sample');
			if (sample === null) {
				throw new Error('Expected every dialog sample to be named.');
			}
			const image = PNG.sync.read(await dialog.screenshot());
			const centerX = Math.floor(image.width / 2);
			const centerY = Math.floor(image.height / 2);
			edges.push({
				bottomInner: hexAt(image, centerX, image.height - 2),
				bottomOuter: hexAt(image, centerX, image.height - 1),
				leftInner: hexAt(image, 1, centerY),
				leftOuter: hexAt(image, 0, centerY),
				rightInner: hexAt(image, image.width - 2, centerY),
				rightOuter: hexAt(image, image.width - 1, centerY),
				sample,
				topInner: hexAt(image, centerX, 1),
				topOuter: hexAt(image, centerX, 0),
			});
		}
		return edges;
	} finally {
		await Promise.all([viewportPage.close(), fs.rm(htmlPath, {force: true})]);
	}
}

export interface NestedFrameBevel {
	bevel: string;
	sample: string;
}

/**
 * Surveys the frames that sit directly inside another frame. The game never
 * stacks two raised frame faces: a frame nested in a dialog is an inside frame,
 * carved into the dialog rather than raised above it, so a nested frame that
 * repeats the raised bevel reads as a doubled border 8px in from the dialog edge.
 */
export async function inspectNestedFrameBevels(
	testName: string,
	html: string,
): Promise<NestedFrameBevel[] | undefined> {
	if (skipBrowserTests || browser === null) {
		return undefined;
	}

	const viewportPage = await browser.newPage({viewport: {height: 900, width: 1280}});
	const htmlPath = await renderToHtmlFile(html, testName);
	try {
		await viewportPage.goto(`file://${htmlPath}`);
		await viewportPage.waitForSelector('[data-dialog-sample]');

		return await viewportPage.evaluate(() => {
			const dialogs = [...document.querySelectorAll<HTMLElement>('[data-dialog-sample]')];
			if (dialogs.length === 0) {
				throw new Error('Expected at least one dialog sample.');
			}
			return dialogs.flatMap((dialog) => {
				const sample = dialog.dataset['dialogSample'];
				if (sample === undefined) {
					throw new Error('Expected every dialog sample to be named.');
				}
				return [...dialog.children].flatMap((child, index) =>
					child.classList.contains('factorio-frame')
						? [
								{
									bevel: getComputedStyle(child).boxShadow,
									sample: `${sample}[${index.toString()}]`,
								},
							]
						: [],
				);
			});
		});
	} finally {
		await Promise.all([viewportPage.close(), fs.rm(htmlPath, {force: true})]);
	}
}

export interface PlaygroundColumnLayout {
	collapsedLabelsStayNarrow: boolean;
	columnsEndTogether: boolean;
	contentsPanelsLeaveTheColumns: boolean;
	contentsPanelsMatchColumnWidth: boolean;
	contentsPanelsShareTheirTop: boolean;
	contentsPanelsUseBothColumns: boolean;
	selectedColumnEndsAtBasicInformation: boolean;
}

export async function inspectPlaygroundColumns(
	testName: string,
	html: string,
	viewport: {height: number; width: number},
): Promise<PlaygroundColumnLayout | undefined> {
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
		await viewportPage.waitForSelector('.panels2');

		return await viewportPage.evaluate(() => {
			// A column that runs out early leaves a strip of bare page background
			// beside the taller one. Books balance to a few dozen pixels, so the
			// allowance only has to be loose enough to absorb one short panel.
			const emptyStripAllowance = 150;
			const columnGap = 14;
			// The vendored sheet splits every definition-list hole 50/50, which reads
			// fine in a 577px column but strands a short label in a 582px cell once a
			// column goes full width.
			const widestLabelShare = 0.3;

			const columns = [...document.querySelectorAll<HTMLElement>('.panels2 > div')];
			const contents = document.querySelector<HTMLElement>('.panel-columns');
			if (columns.length === 0 || columns.length > 2 || contents === null) {
				throw new Error('Expected one or two blueprint columns and a blueprint contents section.');
			}

			const headings = (root: ParentNode): string[] =>
				[...root.querySelectorAll<HTMLElement>('h2')].map((heading) => heading.textContent);
			const columnHeadings = columns.flatMap((column) => headings(column));
			const selectedHeadings = headings(columns[columns.length - 1]);
			const contentsBounds = contents.getBoundingClientRect();
			const contentsPanels = [...contents.children].map((panel) => panel.getBoundingClientRect());
			const midpoint = contentsBounds.left + contentsBounds.width / 2;
			const trackWidth = (contentsBounds.width - columnGap) / 2;
			// The transform toolbelt is fixed to the viewport bottom, so it sits in
			// the column's markup without occupying any of its height.
			const columnBottoms = columns.map((column) => {
				const flowed = [...column.children].filter((panel) => getComputedStyle(panel).position !== 'fixed');
				return flowed.length === 0
					? column.getBoundingClientRect().top
					: Math.max(...flowed.map((panel) => panel.getBoundingClientRect().bottom));
			});

			// Vacuously true for a book, which keeps both columns at half width.
			const collapsedLabels = [...document.querySelectorAll<HTMLElement>('.panels2 > div:only-child dt')];

			return {
				collapsedLabelsStayNarrow: collapsedLabels.every((label) => {
					const list = label.closest('dl');
					return (
						list === null ||
						label.getBoundingClientRect().width <= list.getBoundingClientRect().width * widestLabelShare
					);
				}),
				columnsEndTogether: Math.max(...columnBottoms) - Math.min(...columnBottoms) <= emptyStripAllowance,
				contentsPanelsLeaveTheColumns: !columnHeadings.some(
					(heading) => heading === 'Entities' || heading === 'Mod Detection',
				),
				contentsPanelsMatchColumnWidth: contentsPanels.every(
					(panel) => Math.abs(panel.width - trackWidth) <= 1,
				),
				contentsPanelsShareTheirTop: [
					contentsPanels.filter((panel) => panel.left < midpoint),
					contentsPanels.filter((panel) => panel.left >= midpoint),
				].every(
					(track) =>
						track.length > 0 &&
						Math.abs(Math.min(...track.map((panel) => panel.top)) - contentsBounds.top) <= 1,
				),
				contentsPanelsUseBothColumns: contentsPanels.some((panel) => panel.left >= midpoint),
				selectedColumnEndsAtBasicInformation:
					selectedHeadings[selectedHeadings.length - 1] === 'Basic Information',
			};
		});
	} finally {
		await Promise.all([viewportPage.close(), fs.rm(htmlPath, {force: true})]);
	}
}
