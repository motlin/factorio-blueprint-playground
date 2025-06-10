import {beforeEach, describe, expect, it} from 'vitest';

import 'fake-indexeddb/auto';
import {createLabelDescriptionUpdater, updateNestedBlueprint} from '../../src/parsing/nestedBlueprintEditor';
import {BlueprintString} from '../../src/parsing/types';
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
				label: 'My Book',
				version: 1,
				blueprints: [
					{
						index: 0,
						blueprint: {
							label: 'First Blueprint',
							description: 'First Description',
							version: 1,
							entities: [],
						},
					},
					{
						index: 1,
						blueprint: {
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

		expect(updatedRoot).toBeTruthy();

		// Save the updated structure
		const blueprintDataString = JSON.stringify(updatedRoot);
		const result = await addBlueprint(blueprintDataString, updatedRoot!, '2', 'edit');

		expect(result).toMatchObject({
			metadata: {
				fetchMethod: 'edit',
				selection: '2',
				data: blueprintDataString,
			},
			gameData: {
				blueprint_book: {
					label: 'My Book',
					version: 1,
					blueprints: [
						{
							index: 0,
							blueprint: {
								label: 'First Blueprint',
								description: 'First Description',
								version: 1,
								entities: [],
							},
						},
						{
							index: 1,
							blueprint: {
								label: 'Updated Second',
								description: 'New Second Description',
								version: 1,
								entities: [],
							},
						},
					],
				},
			},
		});
	});

	it('should maintain path integrity through nested book edits', async () => {
		const deepBook: BlueprintString = {
			blueprint_book: {
				label: 'Root Book',
				version: 1,
				blueprints: [
					{
						index: 0,
						blueprint_book: {
							label: 'Nested Book 1',
							version: 1,
							blueprints: [
								{
									index: 0,
									blueprint: {
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

		expect(updatedRoot).toBeTruthy();

		// Verify the path can still be used to extract the edited blueprint
		const nestedBook = updatedRoot?.blueprint_book?.blueprints[0].blueprint_book;
		expect(nestedBook?.blueprints[0].blueprint?.label).toBe('Updated Deep Blueprint');

		// Save and verify selection path is maintained
		const blueprintDataString = JSON.stringify(updatedRoot);
		const result = await addBlueprint(blueprintDataString, updatedRoot!, '1.1', 'edit');

		expect(result).toMatchObject({
			metadata: {
				fetchMethod: 'edit',
				selection: '1.1',
				data: blueprintDataString,
			},
			gameData: {
				blueprint_book: {
					label: 'Root Book',
					version: 1,
					blueprints: [
						{
							index: 0,
							blueprint_book: {
								label: 'Nested Book 1',
								version: 1,
								blueprints: [
									{
										index: 0,
										blueprint: {
											label: 'Updated Deep Blueprint',
											description: 'New Deep Description',
											version: 1,
											entities: [],
										},
									},
								],
							},
						},
					],
				},
			},
		});
	});
});
