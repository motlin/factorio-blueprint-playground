import {afterEach, beforeEach, describe, expect, it} from 'vitest';
import 'fake-indexeddb/auto';

import {deserializeBlueprint, serializeBlueprint} from '../../src/parsing/blueprintParser';
import {createLabelDescriptionUpdater, updateNestedBlueprint} from '../../src/parsing/nestedBlueprintEditor';
import {BlueprintString} from '../../src/parsing/types';
import {addBlueprint} from '../../src/state/blueprintLocalStorage';
import {db} from '../../src/storage/db';

describe('Export Verification for Edited Blueprints', () => {
	beforeEach(async () => {
		await db.clearAll();
	});

	afterEach(async () => {
		await db.clearAll();
	});

	it('exports edited simple blueprint with updated label and description', async () => {
		// Create original blueprint
		const originalBlueprint: BlueprintString = {
			blueprint: {
				label: 'Original Label',
				description: 'Original Description',
				icons: [],
				entities: [],
				item: 'blueprint',
				version: 0,
			},
		};

		// Save original
		const originalSerialized = serializeBlueprint(originalBlueprint);
		await addBlueprint(
			originalSerialized,
			{
				type: 'blueprint',
				label: originalBlueprint.blueprint?.label,
				description: originalBlueprint.blueprint?.description,
				icons: [],
			},
			undefined,
			'url',
		);

		// Edit the blueprint
		const editedBlueprint: BlueprintString = {
			blueprint: {
				...originalBlueprint.blueprint,
				label: 'Edited Label',
				description: 'Edited Description',
			},
		};

		// Save edited version
		const editedSerialized = serializeBlueprint(editedBlueprint);
		await addBlueprint(
			editedSerialized,
			{
				type: 'blueprint',
				label: editedBlueprint.blueprint?.label,
				description: editedBlueprint.blueprint?.description,
				icons: [],
			},
			undefined,
			'edit',
		);

		// Test round-trip: export then import
		const reimportedBlueprint = deserializeBlueprint(editedSerialized);
		expect(reimportedBlueprint).toEqual(editedBlueprint);
	});

	it('exports edited nested blueprint within book correctly', async () => {
		// Create blueprint book with nested blueprint
		const originalBook: BlueprintString = {
			blueprint_book: {
				label: 'Test Book',
				description: 'Test Book Description',
				icons: [],
				blueprints: [
					{
						index: 0,
						blueprint: {
							label: 'Original Nested',
							description: 'Original Nested Description',
							icons: [],
							entities: [],
							item: 'blueprint',
							version: 0,
						},
					},
					{
						index: 1,
						blueprint: {
							label: 'Second Blueprint',
							description: 'Second Description',
							icons: [],
							entities: [],
							item: 'blueprint',
							version: 0,
						},
					},
				],
				item: 'blueprint-book',
				version: 0,
			},
		};

		// Save original book
		const originalSerialized = serializeBlueprint(originalBook);
		await addBlueprint(
			originalSerialized,
			{
				type: 'blueprint_book',
				label: originalBook.blueprint_book?.label,
				description: originalBook.blueprint_book?.description,
				icons: [],
			},
			undefined,
			'url',
		);

		// Edit nested blueprint using our nested editor (path "1" for first blueprint, 1-indexed)
		const updater = createLabelDescriptionUpdater('Edited Nested Label', 'Edited Nested Description');
		const editedBook = updateNestedBlueprint(originalBook, '1', updater);

		expect(editedBook).toBeTruthy();
		if (!editedBook) return;

		// Save edited book
		const editedSerialized = serializeBlueprint(editedBook);
		await addBlueprint(
			editedSerialized,
			{
				type: 'blueprint_book',
				label: editedBook.blueprint_book?.label,
				description: editedBook.blueprint_book?.description,
				icons: [],
			},
			undefined,
			'edit',
		);

		// Test round-trip: export then import
		const reimportedBook = deserializeBlueprint(editedSerialized);
		expect(reimportedBook).toEqual(editedBook);
	});

	it('verifies edited blueprints are immediately available in storage', async () => {
		const originalBlueprint: BlueprintString = {
			blueprint: {
				label: 'Storage Test',
				description: 'Storage Test Description',
				icons: [],
				entities: [],
				item: 'blueprint',
				version: 0,
			},
		};

		// Save and immediately check availability
		const serialized = serializeBlueprint(originalBlueprint);
		const saved = await addBlueprint(
			serialized,
			{
				type: 'blueprint',
				label: originalBlueprint.blueprint?.label,
				description: originalBlueprint.blueprint?.description,
				icons: [],
			},
			undefined,
			'url',
		);

		const retrieved = await db.getBlueprint(saved.metadata.sha);
		expect(retrieved).toEqual(saved);

		// Edit and save
		const editedBlueprint: BlueprintString = {
			blueprint: {
				...originalBlueprint.blueprint,
				label: 'Edited Storage Test',
				description: 'Edited Storage Description',
			},
		};

		const editedSerialized = serializeBlueprint(editedBlueprint);
		const savedEdited = await addBlueprint(
			editedSerialized,
			{
				type: 'blueprint',
				label: editedBlueprint.blueprint?.label,
				description: editedBlueprint.blueprint?.description,
				icons: [],
			},
			undefined,
			'edit',
		);

		// Verify immediately available
		const retrievedEdited = await db.getBlueprint(savedEdited.metadata.sha);
		expect(retrievedEdited).toEqual(savedEdited);

		// Verify export matches storage
		const reimported = deserializeBlueprint(retrievedEdited!.metadata.data);
		expect(reimported).toEqual(editedBlueprint);
	});

	it('handles export of blueprints with special characters in labels', () => {
		const blueprintWithSpecialChars: BlueprintString = {
			blueprint: {
				label: 'Test & Export: "Special" Characters!',
				description: 'Description with\nnewlines and\ttabs',
				icons: [],
				entities: [],
				item: 'blueprint',
				version: 0,
			},
		};

		// Test round-trip preserves special characters
		const serialized = serializeBlueprint(blueprintWithSpecialChars);
		const deserialized = deserializeBlueprint(serialized);
		expect(deserialized).toEqual(blueprintWithSpecialChars);
	});

	it('verifies deduplication works correctly for identical edited content', async () => {
		const originalBlueprint: BlueprintString = {
			blueprint: {
				label: 'Dedup Test',
				description: 'Original',
				icons: [],
				entities: [],
				item: 'blueprint',
				version: 0,
			},
		};

		// Save original
		const originalSerialized = serializeBlueprint(originalBlueprint);
		await addBlueprint(
			originalSerialized,
			{
				type: 'blueprint',
				label: originalBlueprint.blueprint?.label,
				description: originalBlueprint.blueprint?.description,
				icons: [],
			},
			undefined,
			'url',
		);

		// Make an edit
		const editedBlueprint: BlueprintString = {
			blueprint: {
				...originalBlueprint.blueprint,
				description: 'Edited',
			},
		};

		const editedSerialized = serializeBlueprint(editedBlueprint);
		const saved2 = await addBlueprint(
			editedSerialized,
			{
				type: 'blueprint',
				label: editedBlueprint.blueprint?.label,
				description: editedBlueprint.blueprint?.description,
				icons: [],
			},
			undefined,
			'edit',
		);

		// Make the same edit again (should deduplicate)
		const saved3 = await addBlueprint(
			editedSerialized,
			{
				type: 'blueprint',
				label: editedBlueprint.blueprint?.label,
				description: editedBlueprint.blueprint?.description,
				icons: [],
			},
			undefined,
			'edit',
		);

		// For deduplication, we expect the exact same object but with updated timestamp
		const expectedSaved3 = {
			...saved2,
			metadata: {
				...saved2.metadata,
				// Use actual timestamp
				lastUpdatedOn: saved3.metadata.lastUpdatedOn,
			},
		};
		expect(saved3).toEqual(expectedSaved3);
	});
});
