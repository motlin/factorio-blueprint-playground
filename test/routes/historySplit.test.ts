import {afterEach, describe, expect, test, vi} from 'vite-plus/test';

import {serializeBlueprint} from '../../src/parsing/blueprintParser';
import type {BlueprintString} from '../../src/parsing/types';
import {addSplitBookToHistory} from '../../src/routes/history.lazy';
import {db} from '../../src/storage/db';

describe('addSplitBookToHistory', () => {
	afterEach(() => {
		vi.restoreAllMocks();
	});

	test('adds every direct book child as a standalone history blueprint', async () => {
		const alice: BlueprintString = {
			blueprint: {
				item: 'blueprint',
				label: 'Alice',
				description: 'Alice test blueprint',
				version: 10,
				icons: [{index: 1, signal: {type: 'item', name: 'transport-belt'}}],
			},
		};
		const bob: BlueprintString = {
			upgrade_planner: {
				item: 'upgrade-planner',
				label: 'Bob',
				version: 20,
				settings: {description: 'Bob test planner', mappers: []},
			},
		};
		const book: BlueprintString = {
			blueprint_book: {
				item: 'blueprint-book',
				version: 20,
				blueprints: [
					{...alice, index: 10},
					{...bob, index: 20},
				],
			},
		};
		const addBlueprint = vi
			.spyOn(db, 'addBlueprint')
			.mockResolvedValueOnce({
				metadata: {sha: 'alice-sha', createdOn: 0, lastUpdatedOn: 0, data: serializeBlueprint(alice)},
				gameData: {type: 'blueprint', label: 'Alice', icons: []},
			})
			.mockResolvedValueOnce({
				metadata: {sha: 'bob-sha', createdOn: 0, lastUpdatedOn: 0, data: serializeBlueprint(bob)},
				gameData: {type: 'upgrade_planner', label: 'Bob', icons: []},
			});

		const added = await addSplitBookToHistory(book);

		expect(addBlueprint.mock.calls).toStrictEqual([
			[
				serializeBlueprint(alice),
				{
					type: 'blueprint',
					label: 'Alice',
					description: 'Alice test blueprint',
					gameVersion: '10',
					icons: [{type: 'item', name: 'transport-belt'}],
				},
				undefined,
				'data',
			],
			[
				serializeBlueprint(bob),
				{
					type: 'upgrade_planner',
					label: 'Bob',
					description: 'Bob test planner',
					gameVersion: '20',
					icons: [],
				},
				undefined,
				'data',
			],
		]);
		expect(added).toStrictEqual([
			{
				metadata: {sha: 'alice-sha', createdOn: 0, lastUpdatedOn: 0, data: serializeBlueprint(alice)},
				gameData: {type: 'blueprint', label: 'Alice', icons: []},
			},
			{
				metadata: {sha: 'bob-sha', createdOn: 0, lastUpdatedOn: 0, data: serializeBlueprint(bob)},
				gameData: {type: 'upgrade_planner', label: 'Bob', icons: []},
			},
		]);
	});

	test('rejects a non-book input before writing history', async () => {
		const addBlueprint = vi.spyOn(db, 'addBlueprint');

		await expect(
			addSplitBookToHistory({blueprint: {item: 'blueprint', label: 'Alice', version: 10}}),
		).rejects.toThrow('Cannot split a blueprint that is not a book');
		expect(addBlueprint.mock.calls).toStrictEqual([]);
	});
});
