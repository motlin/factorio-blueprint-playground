import {beforeEach, describe, expect, it} from 'vite-plus/test';

import 'fake-indexeddb/auto';
import {createLabelDescriptionUpdater, updateNestedBlueprint} from '../../src/parsing/nestedBlueprintEditor';
import type {BlueprintString} from '../../src/parsing/types';
import {addBlueprint} from '../../src/state/blueprintLocalStorage';
import {db} from '../../src/storage/db';

// Clear the database before each test
beforeEach(async () => {
	await db.blueprints.clear();
	await db.recent.clear();
});

describe('Nested Blueprint Edit Integration', () => {
	it('should save entire book structure when editing nested blueprint', async () => {
		const rootBook: BlueprintString = {
			blueprint_book: {
				item: 'blueprint-book',
				label: 'My Book',
				version: 1,
				blueprints: [
					{
						index: 0,
						blueprint: {
							item: 'blueprint',
							label: 'First Blueprint',
							description: 'First Description',
							version: 1,
							entities: [],
						},
					},
					{
						index: 1,
						blueprint: {
							item: 'blueprint',
							label: 'Second Blueprint',
							description: 'Second Description',
							version: 1,
							entities: [],
						},
					},
				],
			},
		};

		// Update the second blueprint
		const updater = createLabelDescriptionUpdater('Updated Second', 'New Second Description');
		const updatedRoot = updateNestedBlueprint(rootBook, '2', updater);

		if (updatedRoot == null) {
			throw new Error('Expected nested blueprint update to succeed');
		}

		// Save the updated structure
		const blueprintDataString = JSON.stringify(updatedRoot);
		const gameData = {
			type: 'blueprint_book' as const,
			label: 'My Book',
			gameVersion: '1',
			icons: [],
		};
		const result = await addBlueprint(blueprintDataString, gameData, '2', 'edit');
		const {sha, createdOn, lastUpdatedOn, ...metadata} = result.metadata;

		expect(sha).toBeTypeOf('string');
		expect(createdOn).toBeTypeOf('number');
		expect(lastUpdatedOn).toBeTypeOf('number');
		expect(metadata).toStrictEqual({
			fetchMethod: 'edit',
			selection: '2',
			data: blueprintDataString,
		});
		expect(result.gameData).toStrictEqual(gameData);
	});

	it('should maintain path integrity through nested book edits', async () => {
		const deepBook: BlueprintString = {
			blueprint_book: {
				item: 'blueprint-book',
				label: 'Root Book',
				version: 1,
				blueprints: [
					{
						index: 0,
						blueprint_book: {
							item: 'blueprint-book',
							label: 'Nested Book 1',
							version: 1,
							blueprints: [
								{
									index: 0,
									blueprint: {
										item: 'blueprint',
										label: 'Deep Blueprint',
										version: 1,
										entities: [],
									},
								},
							],
						},
					},
				],
			},
		};

		// Edit the deeply nested blueprint
		const updater = createLabelDescriptionUpdater('Updated Deep Blueprint', 'New Deep Description');
		const updatedRoot = updateNestedBlueprint(deepBook, '1.1', updater);

		if (updatedRoot == null) {
			throw new Error('Expected deep blueprint update to succeed');
		}

		// Verify the path can still be used to extract the edited blueprint
		const nestedBook = updatedRoot.blueprint_book?.blueprints[0].blueprint_book;
		expect(nestedBook?.blueprints[0].blueprint?.label).toBe('Updated Deep Blueprint');

		// Save and verify selection path is maintained
		const blueprintDataString = JSON.stringify(updatedRoot);
		const gameData = {
			type: 'blueprint_book' as const,
			label: 'Root Book',
			gameVersion: '1',
			icons: [],
		};
		const result = await addBlueprint(blueprintDataString, gameData, '1.1', 'edit');
		const {sha, createdOn, lastUpdatedOn, ...metadata} = result.metadata;

		expect(sha).toBeTypeOf('string');
		expect(createdOn).toBeTypeOf('number');
		expect(lastUpdatedOn).toBeTypeOf('number');
		expect(metadata).toStrictEqual({
			fetchMethod: 'edit',
			selection: '1.1',
			data: blueprintDataString,
		});
		expect(result.gameData).toStrictEqual(gameData);
	});
});
