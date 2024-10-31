import {readdirSync, readFileSync} from 'fs'
import {join} from 'path'

/**
 * Get list of blueprint fixture filenames (without extension)
 */
export function getFixtureFiles(): string[] {
    const fixturesDir = join(__dirname, 'blueprints', 'txt')
    return readdirSync(fixturesDir)
        .filter(f => f.endsWith('.txt'))
        .map(f => f.replace(/\.txt$/, ''))
}

/**
 * Read a fixture file from the blueprints directory
 */
export function readFixtureFile(relativePath: string): string {
    const fullPath = join(__dirname, 'blueprints', relativePath)
    return readFileSync(fullPath, 'utf-8').trim()
}