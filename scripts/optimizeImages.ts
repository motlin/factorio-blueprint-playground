/* eslint-disable no-console */
import fs from 'fs/promises';
import path from 'path';
import {exit} from 'process';

import sharp from 'sharp';

const ICONS_DIR = 'public/icons';
const SUPPORTED_FORMATS = ['.png', '.jpg', '.jpeg'];

async function convertToWebP(filePath: string): Promise<void> {
    const webpPath = filePath.replace(/\.(png|jpg|jpeg)$/i, '.webp');

    try {
        // Only convert if WebP doesn't exist or is older than source
        const sourceStats = await fs.stat(filePath);
        try {
            const webpStats = await fs.stat(webpPath);
            if (webpStats.mtime > sourceStats.mtime) {
                // WebP is newer than source, skip
                return;
            }
        } catch {
            // WebP doesn't exist, continue with conversion
        }

        // Convert to WebP with high quality
        await sharp(filePath)
            .webp({
                quality: 90,
                lossless: false,
                nearLossless: true,
            })
            .toFile(webpPath);

        console.log(`✓ Converted ${path.basename(filePath)} to WebP`);
    } catch (error) {
        console.error(`✗ Failed to convert ${filePath}:`, error);
    }
}

async function processDirectory(dirPath: string): Promise<void> {
    const entries = await fs.readdir(dirPath, {withFileTypes: true});

    for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);

        if (entry.isDirectory()) {
            await processDirectory(fullPath);
        } else if (entry.isFile()) {
            const ext = path.extname(entry.name).toLowerCase();
            if (SUPPORTED_FORMATS.includes(ext)) {
                await convertToWebP(fullPath);
            }
        }
    }
}

async function main() {
    console.log('Starting image optimization...');
    const startTime = Date.now();

    try {
        await processDirectory(ICONS_DIR);
        const duration = ((Date.now() - startTime) / 1000).toFixed(2);
        console.log(`\nImage optimization completed in ${duration}s`);
    } catch (error) {
        console.error('Failed to process images:', error);
        exit(1);
    }
}

void main();
