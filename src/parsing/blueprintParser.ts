import {inflate} from 'pako'
import type {BlueprintString} from './types'
import {compressBlueprint, CompressionSettings, DEFAULT_COMPRESSION_SETTINGS} from './compressionSettings'

export class BlueprintError extends Error {
    constructor(message: string, options?: ErrorOptions) {
        super(message);
        this.name = 'BlueprintError';
        if (options?.cause) {
            this.cause = options.cause;
        }
    }
}

/**
 * Takes a blueprint string and returns the parsed JSON data
 */
export function deserializeBlueprint(blueprintString: string): BlueprintString {
    try {
        // Validate prefix
        if (!blueprintString.startsWith('0')) {
            throw new BlueprintError(
                `Unknown blueprint format: string does not start with '0' (starts with '${blueprintString[0] || ''}')`
            )
        }

        // Decode base64 to bytes
        const base64String = blueprintString.slice(1)
        const bytes = Uint8Array.from(atob(base64String), c => c.charCodeAt(0))

        // Decompress the bytes using zlib (pako)
        const decompressedStr = inflate(bytes, {to: 'string'})

        // Parse the JSON
        const parsed: BlueprintString = JSON.parse(decompressedStr.trim())
        validateBlueprintData(parsed)

        return parsed
    } catch (err) {
        if (err instanceof BlueprintError) {
            throw err
        }
        throw new BlueprintError(`Failed to parse blueprint: ${err.message}`, {cause: err})
    }
}

/**
 * Takes blueprint JSON data and returns an encoded blueprint string
 */
export function serializeBlueprint(
    data: BlueprintString,
    settings: CompressionSettings = DEFAULT_COMPRESSION_SETTINGS
): string {
    validateBlueprintData(data)

    const jsonStr = JSON.stringify(data).trim()
    const compressed = compressBlueprint(jsonStr, settings)

    // Convert to base64 and add version prefix
    return '0' + btoa(compressed.reduce(function (data, byte) {
        return data + String.fromCharCode(byte);
    }, ''));
}

/**
 * Takes a blueprint from inside a blueprint book and converts it to a standalone blueprint
 */
export function extractBlueprint(
    blueprint: BlueprintString,
    path: string
): BlueprintString {
    try {
        const parts = path.split('.')
        let current = blueprint
        let traversedPath = ''

        // Navigate through the path
        for (const part of parts) {
            const index = parseInt(part) - 1
            traversedPath += (traversedPath ? '.' : '') + part

            if (!current.blueprint_book?.blueprints) {
                throw new BlueprintError(
                    `Invalid path ${path}: no blueprint book at ${traversedPath}`
                )
            }

            const child = current.blueprint_book.blueprints[index]
            if (!child) {
                throw new BlueprintError(
                    `Invalid path ${path}: no child at index ${part} (${traversedPath})`
                )
            }

            current = child
        }

        return current
    } catch (err: unknown) {
        if (err instanceof BlueprintError) {
            throw err;
        }
        // Check if err is Error-like
        if (err instanceof Error) {
            throw new BlueprintError(`Failed to extract blueprint: ${err.message}`, {cause: err});
        }
        // Fallback for unknown error types
        throw new BlueprintError('Failed to extract blueprint: Unknown error');
    }
}

function validateBlueprintData(data: BlueprintString): void {
    if (!data) {
        throw new BlueprintError('Blueprint data is empty')
    }

    // Check for exactly one valid root property
    const validRootTypes = [
        'blueprint',
        'blueprint_book',
        'upgrade_planner',
        'deconstruction_planner'
    ] as const

    const foundTypes = validRootTypes.filter(type => type in data)

    if (foundTypes.length === 0) {
        throw new BlueprintError(
            'Invalid blueprint: missing required root property. ' +
            `Expected one of: ${validRootTypes.join(', ')}`
        )
    }

    if (foundTypes.length > 1) {
        throw new BlueprintError(
            'Invalid blueprint: multiple root properties found. ' +
            `Found: ${foundTypes.join(', ')}, but expected exactly one`
        )
    }

    // Validate specific blueprint type
    const type = foundTypes[0]
    const content = data[type]

    // Common validation for item field
    if (typeof content?.item !== 'string') {
        throw new BlueprintError(
            `Invalid ${type}: missing or invalid 'item' field. ` +
            'Expected string value'
        )
    }

    // Validate version field exists and is a number
    if (typeof content?.version !== 'number') {
        throw new BlueprintError(
            `Invalid ${type}: missing or invalid 'version' field. ` +
            'Expected number value'
        )
    }

    // Type-specific validation
    switch (type) {
        case 'blueprint':
            if (content.item !== 'blueprint') {
                throw new BlueprintError(
                    `Invalid blueprint: incorrect item type. ` +
                    `Expected 'blueprint', got '${content.item}'`
                )
            }
            break

        case 'blueprint_book':
            if (content.item !== 'blueprint-book') {
                throw new BlueprintError(
                    `Invalid blueprint book: incorrect item type. ` +
                    `Expected 'blueprint-book', got '${content.item}'`
                )
            }
            if (!Array.isArray(content.blueprints)) {
                throw new BlueprintError(
                    'Invalid blueprint book: missing or invalid blueprints array'
                )
            }
            break

        case 'upgrade_planner':
            if (content.item !== 'upgrade-planner') {
                throw new BlueprintError(
                    `Invalid upgrade planner: incorrect item type. ` +
                    `Expected 'upgrade-planner', got '${content.item}'`
                )
            }
            if (!content.settings?.mappers) {
                throw new BlueprintError(
                    'Invalid upgrade planner: missing or invalid settings.mappers'
                )
            }
            break

        case 'deconstruction_planner':
            if (content.item !== 'deconstruction-planner') {
                throw new BlueprintError(
                    `Invalid deconstruction planner: incorrect item type. ` +
                    `Expected 'deconstruction-planner', got '${content.item}'`
                )
            }
            if (!content.settings) {
                throw new BlueprintError(
                    'Invalid deconstruction planner: missing settings'
                )
            }
            break
    }
}

/**
 * Parse a version number into a string like "1.2.3.4"
 */
export function parseVersion(versionNumber: number): string {
    const version: bigint = BigInt(versionNumber)
    const parts = []
    for (let i = 0; i < 4; i++) {
        // Extract each 16-bit chunk
        const part = Number((version >> BigInt(48 - i * 16)) & BigInt(0xFFFF))
        parts.push(part)
    }

    // Remove trailing zeros
    while (parts.length > 1 && parts[parts.length - 1] === 0) {
        parts.pop()
    }

    return parts.join('.')
}