import {describe, expect, it} from 'vitest';

import {
	BlueprintError,
	deserializeBlueprint,
	extractBlueprint,
	parseVersion4,
	serializeBlueprint,
} from '../../src/parsing/blueprintParser';
import type {BlueprintString} from '../../src/parsing/types';

const UNKNOWN_FORMAT_REGEX = /Unknown blueprint format/;
const INVALID_CHARACTER_REGEX = /Invalid character/;
const INVALID_ZLIB_REGEX = /invalid zlib data/;
const STARTS_WITH_ZERO_REGEX = /^0/;
const VALID_BASE64_REGEX = /^[0-9A-Za-z+/=]+$/;
const NO_BOOK_AT_1_REGEX = /no blueprint book at 1/;
const INDEX_OUT_OF_BOUNDS_REGEX = /Invalid path 3: index 3 is out of bounds at 3/;
const NESTED_PATH_NO_BOOK_REGEX = /Invalid path 1.2.3: no blueprint book at 1/;

describe('blueprintParser', () => {
	describe('deserializeBlueprint', () => {
		it('throws error on empty string', () => {
			expect(() => deserializeBlueprint('')).toThrow(BlueprintError);
		});

		it('throws error on string without 0 prefix', () => {
			expect(() => deserializeBlueprint('abc123')).toThrow(UNKNOWN_FORMAT_REGEX);
		});

		it('throws error on invalid base64', () => {
			expect(() => deserializeBlueprint('0!@#$')).toThrow(INVALID_CHARACTER_REGEX);
		});

		it('throws error on invalid compression', () => {
			expect(() => deserializeBlueprint('0YWJj')).toThrow(INVALID_ZLIB_REGEX);
		});

		it('parses a simple blueprint', () => {
			// This is a minimal valid blueprint string (encoded version of {"blueprint":{"item":"blueprint","version":281479275675648}})
			const blueprintString =
				'0eJxdj9sKwjAQRP9lnlextV6SR39DRHpZJNBuS5KKpeTfTRsR8W12Z+awO6NqRx6sEQ89w9S9OOjrDGceUrbLzk8DQ8N47kCQslsncWw9WwSKuuEXdBZuBBZvvOHE+M8Sht5Fu5eFGyub3fZAmJKIpMZYrpN//LCmu4xdFcuJv16hf44mPNm6tZKfs+Kk8lORK7VXGaEtK44v4PJNh/AGBLdOxA==';
			const result = deserializeBlueprint(blueprintString);
			expect(result.blueprint).toBeDefined();
			expect(result.blueprint?.item).toBe('blueprint');
			expect(result.blueprint?.version).toBe(281479274299391);
		});
	});

	describe('serializeBlueprint', () => {
		it('serializes invalid blueprint data', () => {
			const invalid = {} as BlueprintString;
			const serializedInvalidBlueprint = serializeBlueprint(invalid);
			expect(serializedInvalidBlueprint).toEqual('0eF6rrgUAAXUA+Q==');
		});

		it('serializes a simple blueprint', () => {
			const blueprint: BlueprintString = {
				blueprint: {
					item: 'blueprint',
					version: 281479275675648,
				},
			};
			const result = serializeBlueprint(blueprint);
			// Should start with 0
			expect(result).toMatch(STARTS_WITH_ZERO_REGEX);
			// Should be valid base64
			expect(result).toMatch(VALID_BASE64_REGEX);

			// Round trip
			const parsed = deserializeBlueprint(result);
			expect(parsed).toEqual(blueprint);
		});
	});

	describe('extractBlueprint', () => {
		const book: BlueprintString = {
			blueprint_book: {
				item: 'blueprint-book',
				version: 281479275675648,
				blueprints: [
					{
						blueprint: {
							item: 'blueprint',
							version: 281479275675648,
							label: 'First',
						},
					},
					{
						blueprint_book: {
							item: 'blueprint-book',
							version: 281479275675648,
							blueprints: [
								{
									blueprint: {
										item: 'blueprint',
										version: 281479275675648,
										label: 'Nested',
									},
								},
							],
						},
					},
				],
			},
		};

		const simpleBlueprint: BlueprintString = {
			blueprint: {
				item: 'blueprint',
				version: 281479275675648,
				label: 'Simple',
			},
		};

		it('extracts blueprint at path', () => {
			const result = extractBlueprint(book, '1');
			expect(result.blueprint?.label).toBe('First');
		});

		it('extracts nested blueprint', () => {
			const result = extractBlueprint(book, '2.1');
			expect(result.blueprint?.label).toBe('Nested');
		});

		it('throws error on invalid path - no book', () => {
			expect(() => extractBlueprint(book, '1.1')).toThrow(NO_BOOK_AT_1_REGEX);
		});

		it('throws error on invalid path - no child', () => {
			expect(() => extractBlueprint(book, '3')).toThrow(INDEX_OUT_OF_BOUNDS_REGEX);
		});

		it('throws error when trying to use nested path on simple blueprint', () => {
			expect(() => extractBlueprint(simpleBlueprint, '1.2.3')).toThrow(NESTED_PATH_NO_BOOK_REGEX);
		});
	});

	describe('parseVersion', () => {
		it('parses version numbers', () => {
			expect(parseVersion4(281479275675648)).toBe('1.1.61.0');
			expect(parseVersion4(562949954076673)).toBe('2.0.10.1');
		});
	});
});
