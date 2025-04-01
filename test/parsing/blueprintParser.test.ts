import {describe, expect, it} from 'vitest';

import {
    BlueprintError,
    deserializeBlueprint,
    extractBlueprint,
    parseVersion,
    serializeBlueprint,
} from '../../src/parsing/blueprintParser';
import type {BlueprintString} from '../../src/parsing/types';

describe('blueprintParser', () => {
    describe('deserializeBlueprint', () => {
        it('throws error on empty string', () => {
            expect(() => deserializeBlueprint('')).toThrow(BlueprintError);
        });

        it('throws error on string without 0 prefix', () => {
            expect(() => deserializeBlueprint('abc123')).toThrow(/Unknown blueprint format/);
        });

        it('throws error on invalid base64', () => {
            expect(() => deserializeBlueprint('0!@#$')).toThrow(/Invalid character/);
        });

        it('throws error on invalid compression', () => {
            expect(() => deserializeBlueprint('0YWJj')).toThrow(/invalid zlib data/);
        });

        it('parses a simple blueprint', () => {
            // This is a minimal valid blueprint string (encoded version of {"blueprint":{"item":"blueprint","version":281479275675648}})
            const blueprintString = '0eJxdj9sKwjAQRP9lnlextV6SR39DRHpZJNBuS5KKpeTfTRsR8W12Z+awO6NqRx6sEQ89w9S9OOjrDGceUrbLzk8DQ8N47kCQslsncWw9WwSKuuEXdBZuBBZvvOHE+M8Sht5Fu5eFGyub3fZAmJKIpMZYrpN//LCmu4xdFcuJv16hf44mPNm6tZKfs+Kk8lORK7VXGaEtK44v4PJNh/AGBLdOxA==';
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
            expect(result).toMatch(/^0/);
            // Should be valid base64
            expect(result).toMatch(/^[0-9A-Za-z+/=]+$/);

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

        it('extracts blueprint at path', () => {
            const result = extractBlueprint(book, '1');
            expect(result.blueprint?.label).toBe('First');
        });

        it('extracts nested blueprint', () => {
            const result = extractBlueprint(book, '2.1');
            expect(result.blueprint?.label).toBe('Nested');
        });

        it('throws error on invalid path - no book', () => {
            expect(() => extractBlueprint(book, '1.1'))
                .toThrow(/no blueprint book at 1/);
        });

        it('throws error on invalid path - no child', () => {
            expect(() => extractBlueprint(book, '3'))
                .toThrow(/Invalid path 3: index 3 is out of bounds at 3/);
        });
    });

    describe('parseVersion', () => {
        it('parses version numbers', () => {
            expect(parseVersion(281479275675648)).toBe('1.1.61');
            expect(parseVersion(562949954076673)).toBe('2.0.10.1');
        });
    });
});
