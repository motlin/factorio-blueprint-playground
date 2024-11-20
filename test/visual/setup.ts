import { beforeAll, afterAll, expect } from 'vitest';
import { chromium, type Browser, type Page } from 'playwright';
import path from 'path';
import fs from 'fs/promises';

let browser: Browser;
let page: Page;

beforeAll(async () => {
    browser = await chromium.launch();
    page = await browser.newPage();
});

afterAll(async () => {
    await browser.close();
});

// Helper to compare screenshots
async function compareScreenshots(testName: string, element: string) {
    const snapshotDir = path.join(__dirname, '__snapshots__');
    await fs.mkdir(snapshotDir, { recursive: true });

    const snapshotPath = path.join(snapshotDir, `${testName}.png`);
    const tempPath = path.join(snapshotDir, `${testName}-temp.png`);

    // Take new screenshot
    const elementHandle = await page.$(element);
    if (!elementHandle) throw new Error(`Element ${element} not found`);
    await elementHandle.screenshot({ path: tempPath });

    // Compare with baseline if it exists
    try {
        const baseline = await fs.readFile(snapshotPath);
        const current = await fs.readFile(tempPath);
        expect(current).toEqual(baseline);
        await fs.unlink(tempPath);
    } catch (error) {
        if (error.code === 'ENOENT') {
            // No baseline exists, create it
            await fs.rename(tempPath, snapshotPath);
        } else {
            throw error;
        }
    }
}

