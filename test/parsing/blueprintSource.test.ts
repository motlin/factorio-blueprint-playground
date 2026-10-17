import {describe, expect, test} from 'vite-plus/test';

import {deserializeBlueprint, serializeBlueprint} from '../../src/parsing/blueprintParser';
import {blueprintSource} from '../../src/parsing/blueprintSource';
import type {BlueprintString} from '../../src/parsing/types';

const VERSION_2_0 = 562949958139904;

const book: BlueprintString = {
	blueprint_book: {
		item: 'blueprint-book',
		version: VERSION_2_0,
		blueprints: [
			{index: 0, blueprint: {item: 'blueprint', label: 'First', version: VERSION_2_0}},
			{
				index: 1,
				blueprint_book: {
					item: 'blueprint-book',
					version: VERSION_2_0,
					blueprints: [{index: 0, blueprint: {item: 'blueprint', label: 'Nested', version: VERSION_2_0}}],
				},
			},
		],
	},
};

describe('blueprintSource', () => {
	test('remembers the encoded string and selection path of every blueprint a string decodes to', () => {
		const encoded = serializeBlueprint(book);
		const root = deserializeBlueprint(encoded);
		const children = root.blueprint_book?.blueprints ?? [];
		const nested = children.at(1)?.blueprint_book?.blueprints?.at(0);

		expect(
			[root, children.at(0), children.at(1), nested].map((blueprint) => blueprint && blueprintSource(blueprint)),
		).toStrictEqual([
			{encoded, path: ''},
			{encoded, path: '1'},
			{encoded, path: '2'},
			{encoded, path: '2.1'},
		]);
	});

	test('still decodes a string whose JSON is not an object', () => {
		const encoded = serializeBlueprint(42 as unknown as BlueprintString);

		expect(deserializeBlueprint(encoded)).toBe(42);
	});

	test('knows nothing about a blueprint that was not decoded from a string', () => {
		expect(blueprintSource(book)).toBeUndefined();
	});
});
