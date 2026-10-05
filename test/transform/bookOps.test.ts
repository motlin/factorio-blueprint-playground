import {describe, expect, test} from 'vite-plus/test';

import type {BlueprintString} from '../../src/parsing/types';
import {flattenBook, makeBook, sortBookByLabel, splitBook} from '../../src/transform/bookOps';

function deepFreeze(value: unknown): void {
	if (value !== null && typeof value === 'object') {
		Object.freeze(value);
		for (const nestedValue of Object.values(value)) {
			deepFreeze(nestedValue);
		}
	}
}

describe('book transforms', () => {
	test('flattenBook collects depth-first leaves, reindexes them, and resets the active index', () => {
		const input: BlueprintString = {
			blueprint_book: {
				item: 'blueprint-book',
				label: "Alice's nested book",
				version: 100,
				active_index: 20,
				blueprints: [
					{index: 10, blueprint: {item: 'blueprint', label: 'Charlie', version: 10}},
					{
						index: 20,
						blueprint_book: {
							item: 'blueprint-book',
							label: "Bob's inner book",
							version: 90,
							active_index: 30,
							blueprints: [
								{
									index: 20,
									blueprint_book: {
										item: 'blueprint-book',
										label: "Charlie's deepest book",
										version: 80,
										blueprints: [
											{
												index: 40,
												upgrade_planner: {
													item: 'upgrade-planner',
													label: 'Alice planner',
													version: 20,
													settings: {mappers: []},
												},
											},
										],
									},
								},
								{index: 30, blueprint: {item: 'blueprint', label: 'Bob', version: 30}},
							],
						},
					},
				],
			},
		};
		deepFreeze(input);

		expect(flattenBook(input)).toStrictEqual({
			blueprint_book: {
				item: 'blueprint-book',
				label: "Alice's nested book",
				version: 100,
				active_index: 0,
				blueprints: [
					{index: 0, blueprint: {item: 'blueprint', label: 'Charlie', version: 10}},
					{
						index: 1,
						upgrade_planner: {
							item: 'upgrade-planner',
							label: 'Alice planner',
							version: 20,
							settings: {mappers: []},
						},
					},
					{index: 2, blueprint: {item: 'blueprint', label: 'Bob', version: 30}},
				],
			},
		});
	});

	test('sortBookByLabel is stable, puts missing labels last, and can recurse', () => {
		const input: BlueprintString = {
			blueprint_book: {
				item: 'blueprint-book',
				version: 100,
				active_index: 20,
				blueprints: [
					{index: 10, blueprint: {item: 'blueprint', label: 'Bob', description: 'first Bob', version: 10}},
					{index: 20, blueprint: {item: 'blueprint', version: 20}},
					{index: 30, blueprint: {item: 'blueprint', label: 'Alice', version: 30}},
					{index: 40, blueprint: {item: 'blueprint', label: 'Bob', description: 'second Bob', version: 40}},
					{
						index: 50,
						blueprint_book: {
							item: 'blueprint-book',
							label: 'Charlie',
							version: 50,
							active_index: 10,
							blueprints: [
								{index: 10, blueprint: {item: 'blueprint', label: 'Bob', version: 10}},
								{index: 20, blueprint: {item: 'blueprint', label: 'Alice', version: 20}},
							],
						},
					},
				],
			},
		};
		deepFreeze(input);

		expect(sortBookByLabel(input, true)).toStrictEqual({
			blueprint_book: {
				item: 'blueprint-book',
				version: 100,
				active_index: 0,
				blueprints: [
					{index: 0, blueprint: {item: 'blueprint', label: 'Alice', version: 30}},
					{index: 1, blueprint: {item: 'blueprint', label: 'Bob', description: 'first Bob', version: 10}},
					{index: 2, blueprint: {item: 'blueprint', label: 'Bob', description: 'second Bob', version: 40}},
					{
						index: 3,
						blueprint_book: {
							item: 'blueprint-book',
							label: 'Charlie',
							version: 50,
							active_index: 0,
							blueprints: [
								{index: 0, blueprint: {item: 'blueprint', label: 'Alice', version: 20}},
								{index: 1, blueprint: {item: 'blueprint', label: 'Bob', version: 10}},
							],
						},
					},
					{index: 4, blueprint: {item: 'blueprint', version: 20}},
				],
			},
		});
	});

	test('splitBook returns standalone direct children and leaves non-books unchanged', () => {
		const first: BlueprintString = {blueprint: {item: 'blueprint', label: 'Alice', version: 10}};
		const input: BlueprintString = {
			blueprint_book: {
				item: 'blueprint-book',
				version: 20,
				blueprints: [
					{...first, index: 10},
					{
						index: 20,
						deconstruction_planner: {
							item: 'deconstruction-planner',
							label: 'Bob',
							version: 20,
							settings: {},
						},
					},
				],
			},
		};

		expect({book: splitBook(input), blueprint: splitBook(first)}).toStrictEqual({
			book: [
				{blueprint: {item: 'blueprint', label: 'Alice', version: 10}},
				{
					deconstruction_planner: {
						item: 'deconstruction-planner',
						label: 'Bob',
						version: 20,
						settings: {},
					},
				},
			],
			blueprint: [first],
		});
	});

	test('makeBook matches the history export structure', () => {
		const blueprints: BlueprintString[] = [
			{
				blueprint: {
					item: 'blueprint',
					label: 'Alice',
					version: 10,
					icons: [
						{index: 1, signal: {type: 'entity', name: 'transport-belt'}},
						{index: 2, signal: {type: 'item', name: 'iron-plate'}},
					],
				},
			},
			{blueprint: {item: 'blueprint', label: 'Bob', version: 30}},
			{
				upgrade_planner: {
					item: 'upgrade-planner',
					label: 'Charlie',
					version: 20,
					settings: {
						icons: [{index: 4, signal: {name: 'fast-transport-belt'}}],
						mappers: [],
					},
				},
			},
		];

		expect(makeBook(blueprints, 'Alice history export')).toStrictEqual({
			blueprint_book: {
				item: 'blueprint-book',
				label: 'Alice history export',
				icons: [
					{index: 1, signal: {type: 'entity', name: 'transport-belt'}},
					{index: 2, signal: {type: 'item', name: 'fast-transport-belt'}},
				],
				blueprints: [
					{index: 0, ...blueprints[0]},
					{index: 1, ...blueprints[1]},
					{index: 2, ...blueprints[2]},
				],
				active_index: 0,
				version: 30,
			},
		});
	});

	test('makeBook creates the same default icon and version as an empty history export', () => {
		expect(makeBook([], 'Empty history export')).toStrictEqual({
			blueprint_book: {
				item: 'blueprint-book',
				label: 'Empty history export',
				icons: [{index: 1, signal: {type: 'item', name: 'blueprint-book'}}],
				blueprints: [],
				active_index: 0,
				version: 0,
			},
		});
	});
});
