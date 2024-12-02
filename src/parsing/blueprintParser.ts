import {zlibSync, unzlibSync, DeflateOptions} from 'fflate';

import {DEFAULT_COMPRESSION_SETTINGS} from './compressionSettings';
import type {BlueprintString} from './types';

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
	// Validate prefix
	if (!blueprintString.startsWith('0')) {
		throw new BlueprintError(
			`Unknown blueprint format: string does not start with '0' (starts with '${blueprintString[0] || ''}')`,
		);
	}

	// Decode base64 to bytes
	const base64String = blueprintString.slice(1);
	const bytes = Uint8Array.from(atob(base64String), (c) => c.charCodeAt(0));

	// Decompress using fflate's zlib decompression
	const decompressedBytes = unzlibSync(bytes);
	const decompressedStr = new TextDecoder().decode(decompressedBytes);

	return JSON.parse(decompressedStr.trim()) as BlueprintString;
}

/**
 * Takes blueprint JSON data and returns an encoded blueprint string
 */
export function serializeBlueprint(
	data: BlueprintString,
	settings: DeflateOptions = DEFAULT_COMPRESSION_SETTINGS,
): string {
	const jsonStr = JSON.stringify(data).trim();
	const bytes = new TextEncoder().encode(jsonStr);

	// Compress using fflate's zlib compression
	const compressed = zlibSync(bytes, settings);

	// Convert to base64 and add version prefix
	return '0' + btoa(compressed.reduce((data, byte) => data + String.fromCharCode(byte), ''));
}

/**
 * Takes a blueprint from inside a blueprint book and converts it to a standalone blueprint
 */
export function extractBlueprint(blueprint: BlueprintString, path?: string): BlueprintString {
	if (!path) {
		return blueprint;
	}

	try {
		const parts = path.split('.');
		let current = blueprint;
		let traversedPath = '';

		// Navigate through the path
		for (const part of parts) {
			const index = parseInt(part) - 1;
			traversedPath += (traversedPath ? '.' : '') + part;

			if (!current.blueprint_book?.blueprints) {
				throw new BlueprintError(`Invalid path ${path}: no blueprint book at ${traversedPath}`);
			}

			// Check if index is valid
			if (isNaN(index)) {
				throw new BlueprintError(`Invalid path ${path}: "${part}" is not a valid number at ${traversedPath}`);
			}

			// Check if index is non-negative
			if (index < 0) {
				throw new BlueprintError(`Invalid path ${path}: index must be positive at ${traversedPath}`);
			}

			// Check if index is within bounds
			if (index >= current.blueprint_book.blueprints.length) {
				throw new BlueprintError(
					`Invalid path ${path}: index ${part} is out of bounds at ${traversedPath} ` +
						`(valid range: 1-${current.blueprint_book.blueprints.length})`,
				);
			}

			current = current.blueprint_book.blueprints[index];
		}

		return current;
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

/**
 * Parse a version number into a string like "1.2.3.4"
 */
export function parseVersion(versionNumber: number): string {
	const version = BigInt(versionNumber);
	const parts = [];
	for (let i = 0; i < 4; i++) {
		// Extract each 16-bit chunk
		const part = Number((version >> BigInt(48 - i * 16)) & BigInt(0xffff));
		parts.push(part);
	}

	// Remove trailing zeros
	while (parts.length > 1 && parts[parts.length - 1] === 0) {
		parts.pop();
	}

	return parts.join('.');
}
