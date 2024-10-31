import {deflate, InflateOptions} from 'pako'

export interface CompressionSettings {
    raw: false               // Must be false - Factorio requires zlib headers
    windowBits: 15           // Must be 15 - Factorio requires max window size (32K)
    strategy: 0              // Must be 0 - Factorio requires default strategy
    level: number            // Must be 8 or 9
    memLevel: number         // Must be 4-9 inclusive
}

// Compression level (8 or 9)
// - 8: Slightly faster, still good compression
// - 9: Maximum compression, slightly slower
const COMPRESSION_LEVEL = 9

// Memory level (4-9)
// - Lower values use less memory but compress slower
// - Higher values use more memory but compress faster
const MEMORY_LEVEL = 5

// Settings that match Factorio's requirements
export const DEFAULT_COMPRESSION_SETTINGS: CompressionSettings = {
    raw: false,        // Required - no variation allowed
    windowBits: 15,    // Required - no variation allowed
    strategy: 0,       // Required - no variation allowed
    level: COMPRESSION_LEVEL,
    memLevel: MEMORY_LEVEL
}

export function compressBlueprint(jsonStr: string, settings: CompressionSettings = DEFAULT_COMPRESSION_SETTINGS): Uint8Array {
    // Validate settings
    if (settings.raw !== false) throw new Error('Compression setting "raw" must be false')
    if (settings.windowBits !== 15) throw new Error('Compression setting "windowBits" must be 15')
    if (settings.strategy !== 0) throw new Error('Compression setting "strategy" must be 0')
    if (![8, 9].includes(settings.level)) throw new Error('Compression setting "level" must be 8 or 9')
    if (settings.memLevel < 4 || settings.memLevel > 9) throw new Error('Compression setting "memLevel" must be between 4 and 9')

    try {
        return deflate(jsonStr, settings)
    } catch (e) {
        console.error('Compression failed:', e)
        throw e
    }
}