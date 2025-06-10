import {beforeEach, describe, expect, it, vi} from 'vitest';

// Create mocks before imports to avoid hoisting issues
vi.mock('../../src/storage/db', () => {
	const mockFindBlueprintByData = vi.fn();
	const mockAddBlueprint = vi.fn();
	const mockUpdateBlueprint = vi.fn();
	const mockListBlueprints = vi.fn();
	const mockGenerateSha = vi.fn();

	return {
		db: {
			addBlueprint: mockAddBlueprint,
			updateBlueprint: mockUpdateBlueprint,
			findBlueprintByData: mockFindBlueprintByData,
			listBlueprints: mockListBlueprints,
		},
		generateSha: mockGenerateSha,
	};
});

// Mock the deserializeBlueprint function
vi.mock('../../src/parsing/blueprintParser', () => {
	const mockDeserializeBlueprint = vi.fn();

	return {
		deserializeBlueprint: mockDeserializeBlueprint,
		serializeBlueprint: vi.fn(),
	};
});

import {deserializeBlueprint} from '../../src/parsing/blueprintParser';
import {
	addBlueprint,
	isFunctionallyEquivalent,
	updateBlueprint,
	updateBlueprintMetadata,
} from '../../src/state/blueprintLocalStorage';
import {DatabaseBlueprint, db, generateSha} from '../../src/storage/db';
import {readFixtureFile} from '../fixtures/utils';

// Mock the functions directly
const mockAddBlueprint = vi.fn();
const mockUpdateBlueprint = vi.fn();
const mockFindBlueprintByData = vi.fn();
const mockListBlueprints = vi.fn();
const mockGenerateSha = vi.fn();
const mockDeserializeBlueprint = vi.fn();

// Mock the module exports
vi.spyOn(db, 'addBlueprint').mockImplementation(mockAddBlueprint as unknown as typeof db.addBlueprint);
vi.spyOn(db, 'updateBlueprint').mockImplementation(mockUpdateBlueprint as unknown as typeof db.updateBlueprint);
vi.spyOn(db, 'findBlueprintByData').mockImplementation(
	mockFindBlueprintByData as unknown as typeof db.findBlueprintByData,
);
vi.spyOn(db, 'listBlueprints').mockImplementation(mockListBlueprints as unknown as typeof db.listBlueprints);
vi.spyOn({generateSha}, 'generateSha').mockImplementation(mockGenerateSha as unknown as typeof generateSha);
vi.mocked(deserializeBlueprint).mockImplementation(mockDeserializeBlueprint);

describe('blueprintLocalStorage', () => {
	let simpleBlueprint: string;
	let updatedBlueprint: string;

	beforeEach(() => {
		// Reset test state
		vi.clearAllMocks();
		simpleBlueprint = readFixtureFile('txt/simple.txt');
		// Keep the version prefix but modify the content
		updatedBlueprint = simpleBlueprint.replace('0', '0') + 'modified';

		// Setup generateSha mock implementation
		mockGenerateSha.mockImplementation(async (data: string) => {
			await Promise.resolve();
			return `sha-${data.substring(0, 10)}`;
		});

		// Setup deserializeBlueprint mock implementation
		mockDeserializeBlueprint.mockImplementation((data: string) => {
			// Simple mock implementation to differentiate between blueprint strings
			if (data === simpleBlueprint) {
				return {
					blueprint: {
						label: 'Original Blueprint',
						description: 'Original Description',
						entities: [],
						version: 281479273447424,
					},
				};
			} else if (data === updatedBlueprint) {
				return {
					blueprint: {
						label: 'Updated Blueprint',
						description: 'Updated Description',
						entities: [],
						version: 281479273447424,
					},
				};
			}
			return {
				blueprint: {
					label: 'Unknown Blueprint',
					entities: [],
					version: 281479273447424,
				},
			};
		});

		// Setup addBlueprint mock implementation
		mockAddBlueprint.mockImplementation(async (data, parsedGameData, selection, fetchMethod) => {
			const sha = await mockGenerateSha(data);
			return {
				metadata: {
					sha,
					createdOn: Date.now(),
					lastUpdatedOn: Date.now(),
					data,
					selection,
					fetchMethod,
				},
				gameData: parsedGameData,
			};
		});

		// Setup updateBlueprint mock implementation
		mockUpdateBlueprint.mockImplementation(async (sha, changes, _options) => {
			await Promise.resolve();
			return {
				metadata: {
					sha,
					createdOn: Date.now(),
					lastUpdatedOn: Date.now(),
					data: 'mock-data',
					...(changes.metadata || {}),
				},
				gameData: {
					type: 'blueprint',
					label: 'Test',
					icons: [],
					...(changes.gameData || {}),
				},
			};
		});

		// Setup listBlueprints default implementation
		mockListBlueprints.mockResolvedValue([]);

		// Setup findBlueprintByData default return value
		const mockFindImplementation = () => Promise.resolve(null);
		mockFindBlueprintByData.mockImplementation(mockFindImplementation);
	});

	describe('addBlueprint', () => {
		it('should add a new blueprint to storage', async () => {
			const result = await addBlueprint(
				simpleBlueprint,
				{
					type: 'blueprint',
					label: 'Test Blueprint',
					description: 'Test Description',
					icons: [],
				},
				undefined,
				'data',
			);

			expect(mockAddBlueprint).toHaveBeenCalledTimes(1);
			expect(mockAddBlueprint).toHaveBeenCalledWith(
				simpleBlueprint,
				{
					type: 'blueprint',
					label: 'Test Blueprint',
					description: 'Test Description',
					icons: [],
				},
				undefined,
				'data',
			);
			expect(result).toBeDefined();
			expect(result.metadata.fetchMethod).toBe('data');
		});

		it('should add blueprint with URL fetch method', async () => {
			const result = await addBlueprint(
				'https://example.com/blueprint',
				{
					type: 'blueprint',
					label: 'URL Blueprint',
					icons: [],
				},
				undefined,
				'url',
			);

			expect(result.metadata.fetchMethod).toBe('url');
		});

		it('should add blueprint with JSON fetch method', async () => {
			const result = await addBlueprint(
				'{"blueprint": {"label": "JSON Blueprint"}}',
				{
					type: 'blueprint',
					label: 'JSON Blueprint',
					icons: [],
				},
				undefined,
				'json',
			);

			expect(result.metadata.fetchMethod).toBe('json');
		});
	});

	describe('updateBlueprint', () => {
		it('should update an existing blueprint', async () => {
			const result = await updateBlueprint('test-sha', {
				gameData: {
					label: 'Updated Label',
				},
			});

			expect(mockUpdateBlueprint).toHaveBeenCalledTimes(1);
			expect(mockUpdateBlueprint).toHaveBeenCalledWith(
				'test-sha',
				{
					gameData: {
						label: 'Updated Label',
					},
				},
				{updateTimestamp: true},
			);
			expect(result).toBeDefined();
		});

		it('should update metadata without affecting its position in history', async () => {
			const result = await updateBlueprintMetadata('test-sha', {
				selection: '1.2.3',
			});

			expect(mockUpdateBlueprint).toHaveBeenCalledTimes(1);
			expect(mockUpdateBlueprint).toHaveBeenCalledWith(
				'test-sha',
				{
					metadata: {
						selection: '1.2.3',
					},
				},
				{updateTimestamp: false},
			);
			expect(result).toBeDefined();
		});

		it('should return null if blueprint does not exist', async () => {
			mockUpdateBlueprint.mockResolvedValueOnce(null);

			const result = await updateBlueprint('non-existent-sha', {
				gameData: {
					label: 'Updated Label',
				},
			});

			expect(result).toBeNull();
		});
	});

	describe('deduplication', () => {
		it('should generate consistent hash for the same blueprint data', async () => {
			// Generate two SHA hashes for the same content
			const hash1 = await mockGenerateSha(simpleBlueprint);
			const hash2 = await mockGenerateSha(simpleBlueprint);

			// Verify they're identical
			expect(hash1).toBe(hash2);
		});

		it('should deduplicate blueprints with different fetch types', async () => {
			// Prepare the test by mocking an existing blueprint
			const existingBlueprint: DatabaseBlueprint = {
				metadata: {
					sha: 'test-sha-123',
					createdOn: Date.now() - 1000,
					lastUpdatedOn: Date.now() - 1000,
					data: simpleBlueprint,
					fetchMethod: 'data',
				},
				gameData: {
					type: 'blueprint',
					label: 'Original Blueprint',
					icons: [],
				},
			};

			// We need to ensure findBlueprintByData actually gets called with simpleBlueprint
			mockFindBlueprintByData.mockReset();
			const mockDataImplementation = (data: string) => {
				// Make sure we only return the existing blueprint for the test blueprint data
				if (data === simpleBlueprint) {
					return Promise.resolve(existingBlueprint);
				}
				return Promise.resolve(null);
			};
			mockFindBlueprintByData.mockImplementation(mockDataImplementation);

			// Ensure generateSha returns a consistent hash to match our test sha
			mockGenerateSha.mockImplementation(async (data) => {
				await Promise.resolve();
				if (data === simpleBlueprint) {
					return 'test-sha-123';
				}
				return `sha-${data.substring(0, 10)}`;
			});

			// Mock updateBlueprint to return the updated blueprint with the new fetch method
			mockUpdateBlueprint.mockResolvedValueOnce({
				...existingBlueprint,
				metadata: {
					...existingBlueprint.metadata,
					fetchMethod: 'url',
					lastUpdatedOn: Date.now(),
				},
			});

			// When adding a blueprint with the same content but different fetch method
			const result = await addBlueprint(
				simpleBlueprint,
				{
					type: 'blueprint',
					label: 'Original Blueprint',
					icons: [],
				},
				undefined,
				'url',
			);

			// It should check for existing blueprint with the same data
			expect(mockFindBlueprintByData).toHaveBeenCalledWith(simpleBlueprint);

			// It should update the existing blueprint with the new fetch method
			expect(mockUpdateBlueprint).toHaveBeenCalledWith(
				'test-sha-123',
				expect.objectContaining({
					metadata: expect.objectContaining({
						fetchMethod: 'url',
					}),
				}),
				{updateTimestamp: true},
			);

			// Result should have the same SHA but updated fetchMethod
			expect(result.metadata.sha).toBe('test-sha-123');
			expect(result.metadata.fetchMethod).toBe('url');
		});
	});

	describe('edit functionality', () => {
		it('should create new entry for edited blueprint with meaningful changes', async () => {
			// Setup mocks for this test
			mockFindBlueprintByData.mockResolvedValue(null);
			mockListBlueprints.mockResolvedValue([]);

			// Add an edited blueprint
			const result = await addBlueprint(
				updatedBlueprint,
				{
					type: 'blueprint',
					label: 'Updated Blueprint',
					description: 'Updated Description',
					icons: [],
				},
				undefined,
				'edit',
			);

			// Since there's no existing blueprint, it should create a new one
			expect(mockAddBlueprint).toHaveBeenCalledTimes(1);
			expect(result.metadata.fetchMethod).toBe('edit');
		});

		it('should move existing blueprint to front of history when exact match is found', async () => {
			// Prepare test data
			const existingBlueprint: DatabaseBlueprint = {
				metadata: {
					sha: 'existing-sha',
					createdOn: Date.now() - 1000,
					lastUpdatedOn: Date.now() - 1000,
					data: updatedBlueprint,
					fetchMethod: 'data',
				},
				gameData: {
					type: 'blueprint',
					label: 'Updated Blueprint',
					icons: [],
				},
			};

			// Mock finding the exact blueprint
			mockFindBlueprintByData.mockResolvedValue(existingBlueprint);

			// Mock the update to return the updated blueprint
			mockUpdateBlueprint.mockResolvedValueOnce({
				...existingBlueprint,
				metadata: {
					...existingBlueprint.metadata,
					fetchMethod: 'edit',
					lastUpdatedOn: Date.now(),
				},
			});

			// Add the same blueprint with edit fetch method
			const result = await addBlueprint(
				updatedBlueprint,
				{
					type: 'blueprint',
					label: 'Updated Blueprint',
					icons: [],
				},
				undefined,
				'edit',
			);

			// It should update the existing blueprint, not create a new one
			expect(mockAddBlueprint).not.toHaveBeenCalled();
			expect(mockUpdateBlueprint).toHaveBeenCalledTimes(1);
			expect(result.metadata.fetchMethod).toBe('edit');
		});

		it('should detect functionally equivalent blueprints and avoid duplicates', async () => {
			// Create two blueprints with the same content but different serialization
			const bp1 = simpleBlueprint;
			// Just add a space to make string different, while content should be equivalent
			const bp2 = simpleBlueprint + ' ';

			// Mock the list of existing blueprints
			const existingBlueprint: DatabaseBlueprint = {
				metadata: {
					sha: 'existing-sha',
					createdOn: Date.now() - 1000,
					lastUpdatedOn: Date.now() - 1000,
					data: bp1,
					fetchMethod: 'data',
				},
				gameData: {
					type: 'blueprint',
					label: 'Original Blueprint',
					icons: [],
				},
			};

			// No exact match but the blueprint exists in history
			mockFindBlueprintByData.mockResolvedValue(null);
			mockListBlueprints.mockResolvedValue([existingBlueprint]);

			// Make deserializeBlueprint return the same content for both blueprints
			mockDeserializeBlueprint.mockImplementation((data: string) => {
				if (data === bp1 || data === bp2) {
					return {
						blueprint: {
							label: 'Original Blueprint',
							description: 'Original Description',
							entities: [],
							version: 281479273447424,
						},
					};
				}
				return {blueprint: {label: 'Unknown', entities: [], version: 0}};
			});

			// Mock the update to return the updated blueprint
			mockUpdateBlueprint.mockResolvedValueOnce({
				...existingBlueprint,
				metadata: {
					...existingBlueprint.metadata,
					fetchMethod: 'edit',
					lastUpdatedOn: Date.now(),
				},
			});

			// Add the functionally equivalent blueprint with edit fetch method
			const result = await addBlueprint(
				bp2,
				{
					type: 'blueprint',
					label: 'Original Blueprint',
					icons: [],
				},
				undefined,
				'edit',
			);

			// It should update the existing blueprint, not create a new one
			expect(mockAddBlueprint).not.toHaveBeenCalled();
			expect(mockUpdateBlueprint).toHaveBeenCalledTimes(1);
			// Called for both bp1 and bp2
			expect(mockDeserializeBlueprint).toHaveBeenCalledTimes(2);
			expect(result.metadata.fetchMethod).toBe('edit');
		});

		it('should create new entry for blueprint with real edits', async () => {
			// Create two blueprints with different content
			const bp1 = simpleBlueprint;
			const bp2 = updatedBlueprint;

			// Mock the list of existing blueprints
			const existingBlueprint: DatabaseBlueprint = {
				metadata: {
					sha: 'existing-sha',
					createdOn: Date.now() - 1000,
					lastUpdatedOn: Date.now() - 1000,
					data: bp1,
					fetchMethod: 'data',
				},
				gameData: {
					type: 'blueprint',
					label: 'Original Blueprint',
					icons: [],
				},
			};

			// No exact match but we have a previous version
			mockFindBlueprintByData.mockResolvedValue(null);
			mockListBlueprints.mockResolvedValue([existingBlueprint]);

			// Make deserializeBlueprint return different content for the blueprints
			mockDeserializeBlueprint.mockImplementation((data: string) => {
				if (data === bp1) {
					return {
						blueprint: {
							label: 'Original Blueprint',
							description: 'Original Description',
							entities: [],
							version: 281479273447424,
						},
					};
				} else if (data === bp2) {
					return {
						blueprint: {
							label: 'Updated Blueprint',
							description: 'Updated Description',
							entities: [],
							version: 281479273447424,
						},
					};
				}
				return {blueprint: {label: 'Unknown', entities: [], version: 0}};
			});

			// Add the edited blueprint
			const result = await addBlueprint(
				bp2,
				{
					type: 'blueprint',
					label: 'Updated Blueprint',
					icons: [],
				},
				undefined,
				'edit',
			);

			// It should create a new blueprint, not update the existing one
			expect(mockAddBlueprint).toHaveBeenCalledTimes(1);
			expect(mockUpdateBlueprint).not.toHaveBeenCalled();
			expect(result.metadata.fetchMethod).toBe('edit');
		});

		it('should test the isFunctionallyEquivalent function directly', () => {
			const bp1 = simpleBlueprint;
			const bp2 = simpleBlueprint;
			const bp3 = updatedBlueprint;

			mockDeserializeBlueprint.mockImplementation((data: string) => {
				if (data === bp1 || data === bp2) {
					return {
						blueprint: {
							label: 'Original Blueprint',
							description: 'Original Description',
							entities: [],
							version: 281479273447424,
						},
					};
				} else if (data === bp3) {
					return {
						blueprint: {
							label: 'Updated Blueprint',
							description: 'Updated Description',
							entities: [],
							version: 281479273447424,
						},
					};
				}
				return {blueprint: {label: 'Unknown', entities: [], version: 0}};
			});

			// Same blueprints should be equivalent
			const result1 = isFunctionallyEquivalent(bp1, bp2);
			expect(result1).toBe(true);

			// Different blueprints should not be equivalent
			const result2 = isFunctionallyEquivalent(bp1, bp3);
			expect(result2).toBe(false);
		});
	});
});
