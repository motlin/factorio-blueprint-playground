/* eslint-disable no-console */
import fs from 'fs/promises';
import path from 'path';
import {exit} from 'process';

import sharp from 'sharp';

const INPUT_DIR = 'public/icons';
const SUPPORTED_FORMATS = ['.png', '.jpg', '.jpeg'];

async function convertToWebP(filePath: string): Promise<void> {
    const webpPath = filePath.replace(/\.(png|jpg|jpeg)$/i, '.webp');

    try {
        const sourceStats = await fs.stat(filePath);

        try {
            const webpStats = await fs.stat(webpPath);
            if (webpStats.mtime >= sourceStats.mtime) {
                return;
            }
            console.log(`WebP at ${webpPath} is older than source (${webpStats.mtime.toISOString()} < ${sourceStats.mtime.toISOString()})`);
        } catch (error) {
            console.log(`Creating new WebP file at ${webpPath} because of error:`, error);
        }

        await sharp(filePath)
            .webp({
                quality: 90,
                lossless: false,
                nearLossless: true,
            })
            .toFile(webpPath);

        console.log(`✓ Created ${webpPath}`);
    } catch (error) {
        console.error(`✗ Failed to convert ${filePath}:`, error);
    }
}

async function processDirectory(dirPath: string): Promise<void> {
    console.log(`\nScanning directory: ${dirPath}`);
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
    console.log(`Base directory: ${path.resolve(INPUT_DIR)}`);
    console.log(`Supported formats: ${SUPPORTED_FORMATS.join(', ')}`);

    const startTime = Date.now();

    try {
        await processDirectory(INPUT_DIR);
        const duration = ((Date.now() - startTime) / 1000).toFixed(2);
        console.log(`\nCompleted in ${duration}s`);
    } catch (error) {
        console.error('Failed to process images:', error);
        exit(1);
    }
}

void main();
