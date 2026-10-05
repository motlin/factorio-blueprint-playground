import {chromium} from '@playwright/test';

const argumentsList = process.argv.slice(2);
if (argumentsList.length !== 1) {
	throw new Error('Usage: deployment-smoke.ts <deployment-url>');
}
const deploymentUrl = argumentsList[0];
const baseUrl = new URL(deploymentUrl);
const browser = await chromium.launch({headless: true});
const context = await browser.newContext({
	colorScheme: 'dark',
	deviceScaleFactor: 1,
	locale: 'en-US',
	reducedMotion: 'reduce',
	timezoneId: 'UTC',
	viewport: {height: 800, width: 1200},
});
const page = await context.newPage();

try {
	const applicationResponse = await page.goto(baseUrl.href, {waitUntil: 'domcontentloaded'});
	if (applicationResponse?.ok() !== true) {
		throw new Error(`Application preview returned HTTP ${String(applicationResponse?.status())}.`);
	}
	if ((await page.title()) !== 'Factorio Blueprint Playground') {
		throw new Error(`Unexpected application title: ${await page.title()}`);
	}
	await page.locator('#app').waitFor();

	const storybookUrl = new URL('storybook/index.html', baseUrl);
	const storybookResponse = await page.goto(storybookUrl.href, {waitUntil: 'networkidle'});
	if (storybookResponse?.ok() !== true) {
		throw new Error(`Storybook preview returned HTTP ${String(storybookResponse?.status())}.`);
	}
	await page.locator('#storybook-explorer-menu').waitFor();

	const storyUrl = new URL(
		'storybook/iframe.html?id=visual-conformance-state-contract--stable-states&viewMode=story',
		baseUrl,
	);
	const storyResponse = await page.goto(storyUrl.href, {waitUntil: 'networkidle'});
	if (storyResponse?.ok() !== true) {
		throw new Error(`Isolated Storybook story returned HTTP ${String(storyResponse?.status())}.`);
	}
	await page.getByRole('heading', {name: 'Stable visual states'}).waitFor();
	console.log(`Validated application and isolated Storybook review at ${baseUrl.href}`);
} finally {
	await context.close();
	await browser.close();
}
