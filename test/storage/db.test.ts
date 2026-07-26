import 'fake-indexeddb/auto';

import Dexie from 'dexie';
import {afterEach, describe, expect, test} from 'vite-plus/test';

import {
	type BlueprintDatabase,
	type BlueprintGameData,
	type DatabaseBlueprint,
	LIBRARY_ROOT_ID,
	type LibraryRecord,
	BlueprintDatabase as PersistentBlueprintDatabase,
} from '../../src/storage/db';

const NEW_YEAR_2000 = 946_684_800_000;
const NEW_YEAR_2001 = 978_307_200_000;

let databaseNumber = 0;
const databases: BlueprintDatabase[] = [];

function createDatabase(identifiers: string[]): BlueprintDatabase {
	databaseNumber += 1;
	const identifierQueue = [...identifiers];
	let timestamp = NEW_YEAR_2000;
	const database = new PersistentBlueprintDatabase({
		name: `test-blueprint-library-${databaseNumber}`,
		now: () => {
			timestamp += 1000;
			return timestamp;
		},
		createId: () => {
			const identifier = identifierQueue.shift();
			if (identifier === undefined) {
				throw new Error('Test identifier queue is empty');
			}
			return identifier;
		},
	});
	databases.push(database);
	return database;
}

function gameData(type: BlueprintGameData['type'], label: string): BlueprintGameData {
	return {
		type,
		label,
		description: `${label} test description`,
		gameVersion: '2000',
		icons: [{type: 'item', name: 'transport-belt'}],
	};
}

function recordProjection(record: LibraryRecord) {
	return {
		id: record.id,
		data: record.data,
		gameData: record.gameData,
		selection: record.selection,
		parentId: record.parentId,
		position: record.position,
	};
}

afterEach(async () => {
	for (const database of databases.splice(0)) {
		const name = database.name;
		database.close();
		await Dexie.delete(name);
	}
});

describe('BlueprintDatabase migration', () => {
	test('migrates existing blueprint rows into import history without creating library records', async () => {
		databaseNumber += 1;
		const name = `test-blueprint-library-${databaseNumber}`;
		const legacy = new Dexie(name);
		legacy.version(1).stores({
			blueprints: 'metadata.sha, metadata.createdOn, metadata.lastUpdatedOn',
			recent: 'id',
		});
		await legacy.open();
		const existing: DatabaseBlueprint = {
			metadata: {
				sha: 'alice-sha',
				createdOn: NEW_YEAR_2000,
				lastUpdatedOn: NEW_YEAR_2001,
				data: '0ALICE-LOSSLESS-DATA',
				selection: '1.2',
				fetchMethod: 'json',
			},
			gameData: gameData('blueprint_book', 'Alice'),
		};
		await legacy.table('blueprints').put(existing);
		await legacy.table('recent').put({id: '__most_recent', sha: 'alice-sha'});
		legacy.close();

		const migrated = new PersistentBlueprintDatabase({
			name,
			now: () => NEW_YEAR_2001,
			createId: () => 'unused-id',
		});
		databases.push(migrated);
		await migrated.open();

		expect({
			tables: migrated.tables.map((table) => table.name).sort((left, right) => left.localeCompare(right)),
			history: await migrated.listHistory(),
			library: await migrated.listLibraryRecords(),
			mostRecent: await migrated.getMostRecent(),
		}).toStrictEqual({
			tables: ['history', 'library', 'recent'],
			history: [
				{
					...existing,
					id: 'legacy:alice-sha',
					importedOn: NEW_YEAR_2000,
				},
			],
			library: [],
			mostRecent: {
				...existing,
				id: 'legacy:alice-sha',
				importedOn: NEW_YEAR_2000,
			},
		});
	});
});

describe('BlueprintDatabase import history', () => {
	test('keeps identical imports as distinct chronological events', async () => {
		const database = createDatabase(['history-alice', 'history-bob']);
		const input = {
			data: '0SAME-OPAQUE-DATA',
			gameData: gameData('blueprint', 'Alice'),
			selection: '1',
			fetchMethod: 'data' as const,
		};

		await database.importToHistory(input);
		await database.importToHistory(input);

		const records = await database.listHistory();
		expect(
			records.map((record) => ({
				id: record.id,
				importedOn: record.importedOn,
				data: record.metadata.data,
				selection: record.metadata.selection,
			})),
		).toStrictEqual([
			{id: 'history-bob', importedOn: NEW_YEAR_2000 + 2000, data: '0SAME-OPAQUE-DATA', selection: '1'},
			{id: 'history-alice', importedOn: NEW_YEAR_2000 + 1000, data: '0SAME-OPAQUE-DATA', selection: '1'},
		]);
	});
});

describe('BlueprintDatabase library records', () => {
	test('round-trips every supported record type without filtering planner mappings', async () => {
		const database = createDatabase(['blueprint-id', 'book-id', 'upgrade-id', 'deconstruction-id']);
		const entries = [
			{
				data: '0BLUEPRINT-OPAQUE-DATA',
				gameData: gameData('blueprint', 'Alice'),
				selection: '',
			},
			{
				data: '0BOOK-OPAQUE-DATA',
				gameData: gameData('blueprint_book', 'Bob'),
				selection: '2.1',
			},
			{
				data: '{"upgrade_planner":{"settings":{"mappers":[{"from":{"name":"zero-match"}}]}}}',
				gameData: gameData('upgrade_planner', 'Charlie'),
				selection: '',
			},
			{
				data: '{"deconstruction_planner":{"settings":{"entity_filters":["zero-match"]}}}',
				gameData: gameData('deconstruction_planner', 'Diana'),
				selection: '',
			},
		];

		for (const [position, entry] of entries.entries()) {
			await database.saveLibraryCopy({
				...entry,
				destination: {parentId: LIBRARY_ROOT_ID, position},
			});
		}

		expect((await database.listLibraryChildren(LIBRARY_ROOT_ID)).map(recordProjection)).toStrictEqual([
			{
				id: 'blueprint-id',
				...entries[0],
				parentId: LIBRARY_ROOT_ID,
				position: 0,
			},
			{
				id: 'book-id',
				...entries[1],
				parentId: LIBRARY_ROOT_ID,
				position: 1,
			},
			{
				id: 'upgrade-id',
				...entries[2],
				parentId: LIBRARY_ROOT_ID,
				position: 2,
			},
			{
				id: 'deconstruction-id',
				...entries[3],
				parentId: LIBRARY_ROOT_ID,
				position: 3,
			},
		]);
	});

	test('inserts and moves records while maintaining contiguous sibling order', async () => {
		const database = createDatabase(['alice-id', 'bob-id', 'charlie-id']);
		await database.saveLibraryCopy({
			data: '0ALICE',
			gameData: gameData('blueprint', 'Alice'),
			destination: {parentId: LIBRARY_ROOT_ID, position: 0},
		});
		await database.saveLibraryCopy({
			data: '0BOB',
			gameData: gameData('blueprint', 'Bob'),
			destination: {parentId: LIBRARY_ROOT_ID, position: 1},
		});
		await database.saveLibraryCopy({
			data: '0CHARLIE',
			gameData: gameData('blueprint', 'Charlie'),
			destination: {parentId: LIBRARY_ROOT_ID, position: 1},
		});
		await database.moveLibraryRecord({
			id: 'bob-id',
			destination: {parentId: LIBRARY_ROOT_ID, position: 0},
		});

		expect(
			(await database.listLibraryChildren(LIBRARY_ROOT_ID)).map((record) => ({
				id: record.id,
				position: record.position,
			})),
		).toStrictEqual([
			{id: 'bob-id', position: 0},
			{id: 'alice-id', position: 1},
			{id: 'charlie-id', position: 2},
		]);
	});

	test('updates content in place while preserving record identity and placement', async () => {
		const database = createDatabase(['planner-id']);
		await database.saveLibraryCopy({
			data: '0ALICE-PLANNER',
			gameData: gameData('upgrade_planner', 'Alice Planner'),
			selection: '1',
			destination: {parentId: LIBRARY_ROOT_ID, position: 0},
		});

		const updated = await database.updateLibraryRecord({
			id: 'planner-id',
			content: {
				data: '0BOB-PLANNER-WITH-ZERO-MATCH-MAPPING',
				gameData: gameData('upgrade_planner', 'Bob Planner'),
				selection: '2',
			},
		});

		expect({
			returned: updated,
			persisted: await database.getLibraryRecord('planner-id'),
		}).toStrictEqual({
			returned: {
				id: 'planner-id',
				createdOn: NEW_YEAR_2000 + 1000,
				updatedOn: NEW_YEAR_2000 + 2000,
				data: '0BOB-PLANNER-WITH-ZERO-MATCH-MAPPING',
				gameData: gameData('upgrade_planner', 'Bob Planner'),
				selection: '2',
				parentId: LIBRARY_ROOT_ID,
				position: 0,
			},
			persisted: {
				id: 'planner-id',
				createdOn: NEW_YEAR_2000 + 1000,
				updatedOn: NEW_YEAR_2000 + 2000,
				data: '0BOB-PLANNER-WITH-ZERO-MATCH-MAPPING',
				gameData: gameData('upgrade_planner', 'Bob Planner'),
				selection: '2',
				parentId: LIBRARY_ROOT_ID,
				position: 0,
			},
		});
	});

	test('stores nested records under books and deletes a book subtree', async () => {
		const database = createDatabase(['book-id', 'planner-id', 'blueprint-id']);
		await database.saveLibraryCopy({
			data: '0BOOK',
			gameData: gameData('blueprint_book', 'Alice Book'),
			destination: {parentId: LIBRARY_ROOT_ID, position: 0},
		});
		await database.saveLibraryCopy({
			data: '0PLANNER',
			gameData: gameData('upgrade_planner', 'Bob Planner'),
			destination: {parentId: 'book-id', position: 0},
		});
		await database.saveLibraryCopy({
			data: '0BLUEPRINT',
			gameData: gameData('blueprint', 'Charlie Blueprint'),
			destination: {parentId: 'book-id', position: 1},
		});

		expect(
			(await database.listLibraryTree()).map((record) => ({
				id: record.id,
				parentId: record.parentId,
				position: record.position,
			})),
		).toStrictEqual([
			{id: 'book-id', parentId: LIBRARY_ROOT_ID, position: 0},
			{id: 'planner-id', parentId: 'book-id', position: 0},
			{id: 'blueprint-id', parentId: 'book-id', position: 1},
		]);

		await database.deleteLibraryRecord({id: 'book-id'});
		expect(await database.listLibraryRecords()).toStrictEqual([]);
	});

	test('duplicates a book subtree with new stable IDs and unchanged serialized contents', async () => {
		const database = createDatabase(['book-id', 'planner-id', 'book-copy-id', 'planner-copy-id']);
		await database.saveLibraryCopy({
			data: '0BOOK-LOSSLESS',
			gameData: gameData('blueprint_book', 'Alice Book'),
			selection: '1',
			destination: {parentId: LIBRARY_ROOT_ID, position: 0},
		});
		await database.saveLibraryCopy({
			data: '{"upgrade_planner":{"settings":{"mappers":[{"from":{"name":"zero-match"}}]}}}',
			gameData: gameData('upgrade_planner', 'Bob Planner'),
			selection: '',
			destination: {parentId: 'book-id', position: 0},
		});

		await database.duplicateLibraryRecord({
			id: 'book-id',
			destination: {parentId: LIBRARY_ROOT_ID, position: 1},
		});

		expect((await database.listLibraryTree()).map(recordProjection)).toStrictEqual([
			{
				id: 'book-id',
				data: '0BOOK-LOSSLESS',
				gameData: gameData('blueprint_book', 'Alice Book'),
				selection: '1',
				parentId: LIBRARY_ROOT_ID,
				position: 0,
			},
			{
				id: 'planner-id',
				data: '{"upgrade_planner":{"settings":{"mappers":[{"from":{"name":"zero-match"}}]}}}',
				gameData: gameData('upgrade_planner', 'Bob Planner'),
				selection: '',
				parentId: 'book-id',
				position: 0,
			},
			{
				id: 'book-copy-id',
				data: '0BOOK-LOSSLESS',
				gameData: gameData('blueprint_book', 'Alice Book'),
				selection: '1',
				parentId: LIBRARY_ROOT_ID,
				position: 1,
			},
			{
				id: 'planner-copy-id',
				data: '{"upgrade_planner":{"settings":{"mappers":[{"from":{"name":"zero-match"}}]}}}',
				gameData: gameData('upgrade_planner', 'Bob Planner'),
				selection: '',
				parentId: 'book-copy-id',
				position: 0,
			},
		]);
	});

	test('rolls back ordering changes when saving the destination record fails', async () => {
		const database = createDatabase(['alice-id', 'bob-id', 'failed-id']);
		await database.saveLibraryCopy({
			data: '0ALICE',
			gameData: gameData('blueprint', 'Alice'),
			destination: {parentId: LIBRARY_ROOT_ID, position: 0},
		});
		await database.saveLibraryCopy({
			data: '0BOB',
			gameData: gameData('blueprint', 'Bob'),
			destination: {parentId: LIBRARY_ROOT_ID, position: 1},
		});
		const failCreation = (primaryKey: string) => {
			if (primaryKey === 'failed-id') {
				throw new Error('Injected library write failure');
			}
		};
		database.library.hook('creating').subscribe(failCreation);

		await expect(
			database.saveLibraryCopy({
				data: '0FAILED',
				gameData: gameData('blueprint', 'Failed'),
				destination: {parentId: LIBRARY_ROOT_ID, position: 1},
			}),
		).rejects.toThrow('Injected library write failure');
		database.library.hook('creating').unsubscribe(failCreation);

		expect(
			(await database.listLibraryChildren(LIBRARY_ROOT_ID)).map((record) => ({
				id: record.id,
				position: record.position,
			})),
		).toStrictEqual([
			{id: 'alice-id', position: 0},
			{id: 'bob-id', position: 1},
		]);
	});
});
