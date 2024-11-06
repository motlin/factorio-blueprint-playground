import {DeflateFunctionOptions} from 'pako';

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
