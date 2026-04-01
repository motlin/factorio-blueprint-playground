import {describe, expect, it} from 'vitest';

import {createLabelDescriptionUpdater, updateNestedBlueprint} from '../../src/parsing/nestedBlueprintEditor';
import type {BlueprintString} from '../../src/parsing/types';

describe('nestedBlueprintEditor', () => {
	describe('updateNestedBlueprint', () => {
		const simpleBlueprint: BlueprintString = {
			blueprint: {
				item: 'blueprint',
				label: 'Original Label',
				description: 'Original Description',
				version: 1,
				entities: [],
				tiles: [],
				icons: [],
			},
		};

		const bookWithNestedBlueprints: BlueprintString = {
			blueprint_book: {
				item: 'blueprint-book',
				label: 'Book Label',
				description: 'Book Description',
				version: 1,
				blueprints: [
					{
						index: 0,
						blueprint: {
							item: 'blueprint',
							label: 'Child 1',
							description: 'Child 1 Description',
							version: 1,
							entities: [],
							tiles: [],
							icons: [],
						},
					},
					{
						index: 1,
						blueprint_book: {
							item: 'blueprint-book',
							label: 'Nested Book',
							description: 'Nested Book Description',
							version: 1,
							blueprints: [
								{
									index: 0,
									blueprint: {
										item: 'blueprint',
										label: 'Grandchild 1',
										description: 'Grandchild 1 Description',
										version: 1,
										entities: [],
										tiles: [],
										icons: [],
									},
								},
							],
						},
					},
				],
			},
		};

		it('should update root blueprint when no path is provided', () => {
			const updater = createLabelDescriptionUpdater('New Label', 'New Description');
			const result = updateNestedBlueprint(simpleBlueprint, '', updater);

			expect(result).toBeTruthy();
			expect(result?.blueprint?.label).toBe('New Label');
			expect(result?.blueprint?.description).toBe('New Description');
			// Ensure immutability
			expect(simpleBlueprint.blueprint?.label).toBe('Original Label');
		});

		it('should update nested blueprint at path "1"', () => {
			const updater = createLabelDescriptionUpdater('Updated Child 1', 'Updated Child 1 Desc');
			const result = updateNestedBlueprint(bookWithNestedBlueprints, '1', updater);

			expect(result).toBeTruthy();
			expect(result?.blueprint_book?.blueprints[0].blueprint?.label).toBe('Updated Child 1');
			expect(result?.blueprint_book?.blueprints[0].blueprint?.description).toBe('Updated Child 1 Desc');
			// Check other children are unchanged
			expect(result?.blueprint_book?.blueprints[1].blueprint_book?.label).toBe('Nested Book');
			// Ensure immutability
			expect(bookWithNestedBlueprints.blueprint_book?.blueprints[0].blueprint?.label).toBe('Child 1');
		});

		it('should update deeply nested blueprint at path "2.1"', () => {
			const updater = createLabelDescriptionUpdater('Updated Grandchild', 'Updated Grandchild Desc');
			const result = updateNestedBlueprint(bookWithNestedBlueprints, '2.1', updater);

			expect(result).toBeTruthy();
			const nestedBook = result?.blueprint_book?.blueprints[1].blueprint_book;
			expect(nestedBook?.blueprints[0].blueprint?.label).toBe('Updated Grandchild');
			expect(nestedBook?.blueprints[0].blueprint?.description).toBe('Updated Grandchild Desc');
			// Ensure parent book is still intact
			expect(result?.blueprint_book?.label).toBe('Book Label');
			// Ensure immutability
			const originalNestedBook = bookWithNestedBlueprints.blueprint_book?.blueprints[1].blueprint_book;
			expect(originalNestedBook?.blueprints[0].blueprint?.label).toBe('Grandchild 1');
		});

		it('should return null for invalid path', () => {
			const updater = createLabelDescriptionUpdater('New', 'New');

			// Invalid index
			expect(updateNestedBlueprint(bookWithNestedBlueprints, '3', updater)).toBeNull();
			// Invalid nested path
			expect(updateNestedBlueprint(bookWithNestedBlueprints, '1.1', updater)).toBeNull();
			// Non-numeric path
			expect(updateNestedBlueprint(bookWithNestedBlueprints, 'abc', updater)).toBeNull();
		});

		it('should handle upgrade planner updates', () => {
			const upgradePlanner: BlueprintString = {
				upgrade_planner: {
					item: 'upgrade-planner',
					label: 'Upgrade Label',
					version: 1,
					settings: {
						description: 'Upgrade Description',
						mappers: [],
					},
				},
			};

			const updater = createLabelDescriptionUpdater('New Upgrade', 'New Upgrade Desc');
			const result = updateNestedBlueprint(upgradePlanner, '', updater);

			expect(result).toStrictEqual({
				upgrade_planner: {
					item: 'upgrade-planner',
					label: 'New Upgrade',
					version: 1,
					settings: {description: 'New Upgrade Desc', mappers: []},
				},
			});
		});

		it('should handle deconstruction planner updates', () => {
			const deconstructionPlanner: BlueprintString = {
				deconstruction_planner: {
					item: 'deconstruction-planner',
					label: 'Decon Label',
					version: 1,
					settings: {
						description: 'Decon Description',
					},
				},
			};

			const updater = createLabelDescriptionUpdater('New Decon', 'New Decon Desc');
			const result = updateNestedBlueprint(deconstructionPlanner, '', updater);

			expect(result).toStrictEqual({
				deconstruction_planner: {
					item: 'deconstruction-planner',
					label: 'New Decon',
					version: 1,
					settings: {description: 'New Decon Desc'},
				},
			});
		});

		it('should update empty planner settings', () => {
			const upgradePlanner: BlueprintString = {
				upgrade_planner: {
					item: 'upgrade-planner',
					label: 'Upgrade Label',
					version: 1,
					settings: {
						mappers: [],
					},
				},
			};

			const updater = createLabelDescriptionUpdater('New', 'New Description');
			const result = updateNestedBlueprint(upgradePlanner, '', updater);

			expect(result).toStrictEqual({
				upgrade_planner: {
					item: 'upgrade-planner',
					label: 'New',
					version: 1,
					settings: {
						description: 'New Description',
						mappers: [],
					},
				},
			});
		});
	});

	describe('path persistence through edit operations', () => {
		it('should maintain selection path when editing nested blueprint', () => {
			const book: BlueprintString = {
				blueprint_book: {
					item: 'blueprint-book',
					label: 'Book',
					version: 1,
					active_index: 0,
					blueprints: [
						{
							index: 0,
							blueprint: {
								item: 'blueprint',
								label: 'Blueprint 1',
								version: 1,
								entities: [],
							},
						},
						{
							index: 1,
							blueprint: {
								item: 'blueprint',
								label: 'Blueprint 2',
								version: 1,
								entities: [],
							},
						},
					],
				},
			};

			const path = '2';
			const updater = createLabelDescriptionUpdater('Updated Blueprint 2', 'New Desc');
			const result = updateNestedBlueprint(book, path, updater);

			expect(result).toBeTruthy();
			// The structure should be preserved
			expect(result?.blueprint_book?.blueprints).toHaveLength(2);
			expect(result?.blueprint_book?.blueprints[0].index).toBe(0);
			expect(result?.blueprint_book?.blueprints[1].index).toBe(1);
			// The active_index should be unchanged
			expect(result?.blueprint_book?.active_index).toBe(0);
			// Only the targeted blueprint should be updated
			expect(result?.blueprint_book?.blueprints[1].blueprint?.label).toBe('Updated Blueprint 2');
		});
	});
});
