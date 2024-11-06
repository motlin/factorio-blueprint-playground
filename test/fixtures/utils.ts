import { readdirSync, readFileSync } from 'fs';
import { join } from 'path';

/**
 * Get list of blueprint fixture filenames (without extension)
 * @throws {Error} If directory cannot be read
 * @returns Array of fixture filenames without extensions
 */
export function getFixtureFiles(): string[] {
    try {
        const fixturesDir = join(__dirname, 'blueprints', 'txt');
        const files = readdirSync(fixturesDir);

        return files
            .filter((f): f is string =>
                typeof f === 'string' && f.endsWith('.txt')
            )
            .map((f: string) => f.replace(/\.txt$/, ''));
    } catch (error) {
        throw new Error(`Failed to read fixture files: ${error instanceof Error ? error.message : String(error)}`);
    }
}

/**
 * Read a fixture file from the blueprints directory
 * @param relativePath - Relative path to the fixture file
 * @throws {Error} If file cannot be read
 * @returns Contents of the fixture file
 */
export function readFixtureFile(relativePath: string): string {
    try {
        const fullPath = join(__dirname, 'blueprints', relativePath);
        const content = readFileSync(fullPath, 'utf-8');

        if (typeof content !== 'string') {
            throw new Error('File content is not a string');
        }

        return content.trim();
    } catch (error) {
        throw new Error(`Failed to read fixture file ${relativePath}: ${error instanceof Error ? error.message : String(error)}`);
    }
}