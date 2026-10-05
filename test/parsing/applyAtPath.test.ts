import {describe, expect, test, vi} from 'vite-plus/test';

import type {BlueprintString} from '../../src/parsing/types';
import {updateNestedBlueprint} from '../../src/transform/applyAtPath';

const rename =
	(label: string) =>
	(blueprint: BlueprintString): BlueprintString => {
		if (blueprint.blueprint === undefined) {
			return blueprint;
		}

		return {...blueprint, blueprint: {...blueprint.blueprint, label}};
	};

const book: BlueprintString = {
	blueprint_book: {
		item: 'blueprint-book',
		label: "Alice's book",
		version: 100,
		active_index: 20,
		blueprints: [
			{index: 10, blueprint: {item: 'blueprint', label: 'Bob', version: 10}},
			{
				index: 20,
				blueprint_book: {
					item: 'blueprint-book',
					label: "Charlie's book",
					version: 100,
					blueprints: [{index: 30, blueprint: {item: 'blueprint', label: 'Charlie', version: 10}}],
				},
			},
		],
	},
};

describe('updateNestedBlueprint', () => {
	test('updates the root for an empty path', () => {
		const blueprint: BlueprintString = {blueprint: {item: 'blueprint', label: 'Alice', version: 10}};

		expect(updateNestedBlueprint(blueprint, '', rename('Bob'))).toStrictEqual({
			blueprint: {item: 'blueprint', label: 'Bob', version: 10},
		});
		expect(blueprint).toStrictEqual({blueprint: {item: 'blueprint', label: 'Alice', version: 10}});
	});

	test('immutably updates a direct child and preserves its index', () => {
		expect(updateNestedBlueprint(book, '1', rename('Alice'))).toStrictEqual({
			blueprint_book: {
				item: 'blueprint-book',
				label: "Alice's book",
				version: 100,
				active_index: 20,
				blueprints: [
					{index: 10, blueprint: {item: 'blueprint', label: 'Alice', version: 10}},
					book.blueprint_book?.blueprints[1],
				],
			},
		});
		expect(book.blueprint_book?.blueprints[0]).toStrictEqual({
			index: 10,
			blueprint: {item: 'blueprint', label: 'Bob', version: 10},
		});
	});

	test('updates a deeply nested child while retaining the surrounding book', () => {
		expect(updateNestedBlueprint(book, '2.1', rename('Alice'))).toStrictEqual({
			blueprint_book: {
				item: 'blueprint-book',
				label: "Alice's book",
				version: 100,
				active_index: 20,
				blueprints: [
					book.blueprint_book?.blueprints[0],
					{
						index: 20,
						blueprint_book: {
							item: 'blueprint-book',
							label: "Charlie's book",
							version: 100,
							blueprints: [{index: 30, blueprint: {item: 'blueprint', label: 'Alice', version: 10}}],
						},
					},
				],
			},
		});
	});

	test('returns null for invalid paths', () => {
		vi.spyOn(console, 'error').mockImplementation(() => undefined);

		expect([
			updateNestedBlueprint(book, '3', rename('Alice')),
			updateNestedBlueprint(book, '1.1', rename('Alice')),
			updateNestedBlueprint(book, 'abc', rename('Alice')),
		]).toStrictEqual([null, null, null]);
	});
});
