import JSON5 from 'json5';
import {describe, expect, it} from 'vitest';
import type {BlueprintString} from '../../src/parsing/types';

describe('JSON5 blueprint parsing', () => {
	const validBlueprint: BlueprintString = {
		blueprint: {
			item: 'blueprint',
			version: 281479275675648,
		},
	};

	it('parses standard JSON', () => {
		const input = JSON.stringify(validBlueprint);
		const result = JSON5.parse(input) as BlueprintString;
		expect(result).toEqual(validBlueprint);
	});

	it('parses JSON5 with trailing commas', () => {
		const input = `{
			"blueprint": {
				"item": "blueprint",
				"version": 281479275675648,
			},
		}`;
		const result = JSON5.parse(input) as BlueprintString;
		expect(result).toEqual(validBlueprint);
	});

	it('parses JSON5 with comments', () => {
		const input = `{
			// This is a blueprint
			"blueprint": {
				"item": "blueprint",
				/* version number */
				"version": 281479275675648
			}
		}`;
		const result = JSON5.parse(input) as BlueprintString;
		expect(result).toEqual(validBlueprint);
	});

	it('parses JSON5 with unquoted keys', () => {
		const input = `{
			blueprint: {
				item: "blueprint",
				version: 281479275675648
			}
		}`;
		const result = JSON5.parse(input) as BlueprintString;
		expect(result).toEqual(validBlueprint);
	});

	it('parses JSON5 with single-quoted strings', () => {
		const input = `{
			'blueprint': {
				'item': 'blueprint',
				'version': 281479275675648
			}
		}`;
		const result = JSON5.parse(input) as BlueprintString;
		expect(result).toEqual(validBlueprint);
	});
});
