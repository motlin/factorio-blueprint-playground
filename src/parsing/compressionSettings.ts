import {deflate, DeflateFunctionOptions} from 'pako';

export interface CompressionSettings extends DeflateFunctionOptions {
    level: 8 | 9;            // Must be 8 or 9
    windowBits: 15           // Must be 15 - Factorio requires max window size (32K)
    memLevel: number         // Must be 4-9 inclusive
    strategy: pako.constants.Z_DEFAULT_STRATEGY // Must be 0 - Factorio requires default strategy
    raw: false               // Must be false - Factorio requires zlib headers
}

// Compression level (8 or 9)
// - 8: Slightly faster, still good compression
// - 9: Maximum compression, slightly slower
const COMPRESSION_LEVEL = 9;

// Memory level (4-9)
// - Lower values use less memory but compress slower
// - Higher values use more memory but compress faster
const MEMORY_LEVEL = 5;

// Settings that match Factorio's requirements
export const DEFAULT_COMPRESSION_SETTINGS: CompressionSettings = {
    raw: false,        // Required - no variation allowed
    windowBits: 15,    // Required - no variation allowed
    strategy: 0,       // Required - no variation allowed
    level: COMPRESSION_LEVEL,
    memLevel: MEMORY_LEVEL,
};

export function compressBlueprint(jsonStr: string, settings: CompressionSettings = DEFAULT_COMPRESSION_SETTINGS): Uint8Array {
    // Validate settings
    if (settings.raw) throw new Error('Compression setting "raw" must be false');
    if (settings.windowBits !== 15) throw new Error('Compression setting "windowBits" must be 15');
    if (settings.strategy !== 0) throw new Error('Compression setting "strategy" must be 0');
    if (![8, 9].includes(settings.level)) throw new Error('Compression setting "level" must be 8 or 9');
    if (settings.memLevel < 4 || settings.memLevel > 9) throw new Error('Compression setting "memLevel" must be between 4 and 9');

    try {
        return deflate(jsonStr, settings);
    } catch (e) {
        console.error('Compression failed:', e);
        throw e;
    }
}
