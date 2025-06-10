import {afterEach, beforeEach, describe, expect, it} from 'vitest';
import 'fake-indexeddb/auto';

import {BlueprintDatabase, generateSha} from '../../src/storage/db';
import {readFixtureFile} from '../fixtures/utils';

describe('BlueprintDatabase', () => {
	let db: BlueprintDatabase;
	let simpleBlueprint: string;
	let upgradePlanner: string;
	let _bookBlueprint: string;

	beforeEach(async () => {
		db = new BlueprintDatabase();

		await db.clearAll();

		simpleBlueprint = readFixtureFile('txt/simple.txt');
		upgradePlanner = readFixtureFile('txt/upgrade.txt');
		_bookBlueprint = readFixtureFile('txt/book.txt');
	});

	afterEach(async () => {
		await db.clearAll();
	});

	describe('generateSha', () => {
		it('should generate consistent hash for the same content', async () => {
			const hash1 = await generateSha(simpleBlueprint);
			const hash2 = await generateSha(simpleBlueprint);

			expect(hash1).toBe(hash2);
		});

		it('should generate different hashes for different content', async () => {
			const hash1 = await generateSha('test content 1');
			const hash2 = await generateSha('test content 2');

			console.log('Hash 1:', hash1);
			console.log('Hash 2:', hash2);

			expect(hash1).not.toBe(hash2);
		});
	});

	describe('addBlueprint', () => {
		it('should store blueprint with correct metadata', async () => {
			const blueprint = await db.addBlueprint(
				simpleBlueprint,
				{
					type: 'blueprint',
					label: 'Test Blueprint',
					description: 'Test Description',
					icons: [],
				},
				'1.2',
				'data',
			);

			expect(blueprint.metadata.data).toBe(simpleBlueprint);
			expect(blueprint.metadata.selection).toBe('1.2');
			expect(blueprint.metadata.fetchMethod).toBe('data');
			expect(blueprint.gameData.label).toBe('Test Blueprint');
			expect(blueprint.gameData.description).toBe('Test Description');

			const retrievedBlueprint = await db.getBlueprint(blueprint.metadata.sha);
			expect(retrievedBlueprint).toBeDefined();
			expect(retrievedBlueprint?.metadata.data).toBe(simpleBlueprint);
		});

		it('should update most recent after adding a blueprint', async () => {
			const blueprint = await db.addBlueprint(simpleBlueprint, {
				type: 'blueprint',
				label: 'Test Blueprint',
				icons: [],
			});

			const mostRecent = await db.getMostRecent();
			expect(mostRecent).toBeDefined();
			expect(mostRecent?.metadata.sha).toBe(blueprint.metadata.sha);
		});
	});

	describe('findBlueprintByData', () => {
		it('should find blueprint by its data content', async () => {
			const addedBlueprint = await db.addBlueprint(
				simpleBlueprint,
				{
					type: 'blueprint',
					label: 'Test Blueprint',
					icons: [],
				},
				undefined,
				'data',
			);

			const foundBlueprint = await db.findBlueprintByData(simpleBlueprint);

			expect(foundBlueprint).toBeDefined();
			expect(foundBlueprint?.metadata.sha).toBe(addedBlueprint.metadata.sha);
		});

		it('should return null when blueprint not found', async () => {
			const result = await db.findBlueprintByData('non-existent-data');

			expect(result).toBeNull();
		});
	});

	describe('updateBlueprint', () => {
		it('should update blueprint with provided changes', async () => {
			const originalBlueprint = await db.addBlueprint(
				simpleBlueprint,
				{
					type: 'blueprint',
					label: 'Original Label',
					icons: [],
				},
				undefined,
				'data',
			);

			const originalTimestamp = originalBlueprint.metadata.lastUpdatedOn;

			await new Promise((resolve) => setTimeout(resolve, 10));

			const updatedBlueprint = await db.updateBlueprint(originalBlueprint.metadata.sha, {
				gameData: {
					label: 'Updated Label',
				},
			});

			expect(updatedBlueprint).toBeDefined();
			expect(updatedBlueprint?.gameData.label).toBe('Updated Label');
			expect(updatedBlueprint?.metadata.lastUpdatedOn).toBeGreaterThan(originalTimestamp);

			const retrievedBlueprint = await db.getBlueprint(originalBlueprint.metadata.sha);
			expect(retrievedBlueprint?.gameData.label).toBe('Updated Label');
		});

		it('should update metadata without affecting timestamp if requested', async () => {
			const originalBlueprint = await db.addBlueprint(
				simpleBlueprint,
				{
					type: 'blueprint',
					label: 'Original Label',
					icons: [],
				},
				undefined,
				'data',
			);

			const originalTimestamp = originalBlueprint.metadata.lastUpdatedOn;

			await new Promise((resolve) => setTimeout(resolve, 10));

			const updatedBlueprint = await db.updateBlueprint(
				originalBlueprint.metadata.sha,
				{
					metadata: {
						selection: '3.4.5',
					},
				},
				{updateTimestamp: false},
			);

			expect(updatedBlueprint).toBeDefined();
			expect(updatedBlueprint?.metadata.selection).toBe('3.4.5');
			expect(updatedBlueprint?.metadata.lastUpdatedOn).toBe(originalTimestamp);
		});

		it('should return null if blueprint does not exist', async () => {
			const result = await db.updateBlueprint('non-existent-sha', {
				gameData: {
					label: 'New Label',
				},
			});

			expect(result).toBeNull();
		});
	});

	describe('listBlueprints', () => {
		it('should return blueprints ordered by lastUpdatedOn in descending order', async () => {
			await db.clearAll();

			const oldestBlueprint = await db.addBlueprint(simpleBlueprint, {
				type: 'blueprint',
				label: 'Oldest',
				icons: [],
			});

			await new Promise((resolve) => setTimeout(resolve, 50));

			const middleBlueprint = await db.addBlueprint(upgradePlanner, {
				type: 'blueprint',
				label: 'Middle',
				icons: [],
			});

			await new Promise((resolve) => setTimeout(resolve, 50));

			const newestBlueprint = await db.addBlueprint(_bookBlueprint, {
				type: 'blueprint',
				label: 'Newest',
				icons: [],
			});

			const results = await db.listBlueprints();

			expect(results.length).toBe(3);

			expect(results[0].metadata.sha).toBe(newestBlueprint.metadata.sha);
			expect(results[1].metadata.sha).toBe(middleBlueprint.metadata.sha);
			expect(results[2].metadata.sha).toBe(oldestBlueprint.metadata.sha);

			expect(results[0].gameData.label).toBe('Newest');
			expect(results[1].gameData.label).toBe('Middle');
			expect(results[2].gameData.label).toBe('Oldest');
		});
	});

	describe('content roundtrip', () => {
		it('should correctly store and retrieve blueprint content', async () => {
			const addedBlueprint = await db.addBlueprint(simpleBlueprint, {
				type: 'blueprint',
				label: 'Test Label',
				description: 'Test Description',
				icons: [],
			});

			const retrievedBlueprint = await db.getBlueprint(addedBlueprint.metadata.sha);

			expect(retrievedBlueprint).toBeDefined();
			expect(retrievedBlueprint?.metadata.data).toBe(simpleBlueprint);
			expect(retrievedBlueprint?.gameData.label).toBe('Test Label');
			expect(retrievedBlueprint?.gameData.description).toBe('Test Description');
		});
	});
});
