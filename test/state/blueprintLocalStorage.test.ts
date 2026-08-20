import {afterEach, describe, expect, test, vi} from 'vite-plus/test';

import {addBlueprint} from '../../src/state/blueprintLocalStorage';
import {type BlueprintGameData, db, type ImportHistoryRecord} from '../../src/storage/db';

const ALICE_DATA = '0eNqrVkrKKU0tKMrMS1eyqlaqUSrOTM/LTFGyUlAyMjA0MjIxNjA0MTQ0NTU2VqoFAKn5DCk=';
const BOB_DATA = '0eNqrVkrKKU0tKMrMS1eyqlaqUSrOTM/LTFGyUlAyMjAwMDIzNTQ2NTAxNzQ0MTVXqgUAqjEMLQ==';

const aliceGameData: BlueprintGameData = {
	type: 'blueprint',
	label: 'Alice',
	description: 'Alice test blueprint',
	gameVersion: '2000',
	icons: [{type: 'item', name: 'transport-belt'}],
};

function historyRecord(id: string, data: string, selection?: string): ImportHistoryRecord {
	return {
		id,
		importedOn: 0,
		metadata: {sha: `${id}-sha`, createdOn: 0, lastUpdatedOn: 0, data, selection},
		gameData: aliceGameData,
	};
}

describe('addBlueprint', () => {
	afterEach(() => {
		vi.restoreAllMocks();
	});

	test('imports a blueprint that is not already the most recent import', async () => {
		vi.spyOn(db, 'getMostRecent').mockResolvedValue(null);
		const importToHistory = vi
			.spyOn(db, 'importToHistory')
			.mockResolvedValue(historyRecord('history-alice', ALICE_DATA));
		const updateHistoryRecord = vi.spyOn(db, 'updateHistoryRecord');

		const added = await addBlueprint(ALICE_DATA, aliceGameData, '1', 'data');

		expect(importToHistory.mock.calls).toStrictEqual([
			[{data: ALICE_DATA, gameData: aliceGameData, selection: '1', fetchMethod: 'data'}],
		]);
		expect(updateHistoryRecord.mock.calls).toStrictEqual([]);
		expect(added).toStrictEqual(historyRecord('history-alice', ALICE_DATA));
	});

	test('updates the selection instead of appending when the most recent import is the same blueprint', async () => {
		const existing = historyRecord('history-alice', ALICE_DATA, '1');
		const updated = historyRecord('history-alice', ALICE_DATA, '2');
		vi.spyOn(db, 'getMostRecent').mockResolvedValue(existing);
		const importToHistory = vi
			.spyOn(db, 'importToHistory')
			.mockResolvedValue(historyRecord('history-alice-duplicate', ALICE_DATA, '2'));
		const updateHistoryRecord = vi.spyOn(db, 'updateHistoryRecord').mockResolvedValue(updated);

		const added = await addBlueprint(ALICE_DATA, aliceGameData, '2', 'data');

		expect(importToHistory.mock.calls).toStrictEqual([]);
		expect(updateHistoryRecord.mock.calls).toStrictEqual([
			['history-alice', {metadata: {selection: '2'}}, {updateTimestamp: false}],
		]);
		expect(added).toStrictEqual(updated);
	});

	test('writes nothing when the most recent import already stores this selection', async () => {
		const existing = historyRecord('history-alice', ALICE_DATA, '1');
		vi.spyOn(db, 'getMostRecent').mockResolvedValue(existing);
		const importToHistory = vi
			.spyOn(db, 'importToHistory')
			.mockResolvedValue(historyRecord('history-alice-duplicate', ALICE_DATA, '1'));
		const updateHistoryRecord = vi.spyOn(db, 'updateHistoryRecord').mockResolvedValue(existing);

		const added = await addBlueprint(ALICE_DATA, aliceGameData, '1', 'data');

		expect(importToHistory.mock.calls).toStrictEqual([]);
		expect(updateHistoryRecord.mock.calls).toStrictEqual([]);
		expect(added).toStrictEqual(existing);
	});

	test('appends a genuine re-import when a different blueprint was imported in between', async () => {
		vi.spyOn(db, 'getMostRecent').mockResolvedValue(historyRecord('history-bob', BOB_DATA));
		const importToHistory = vi
			.spyOn(db, 'importToHistory')
			.mockResolvedValue(historyRecord('history-alice-again', ALICE_DATA));
		const updateHistoryRecord = vi.spyOn(db, 'updateHistoryRecord');

		await addBlueprint(ALICE_DATA, aliceGameData, undefined, 'data');

		expect(importToHistory.mock.calls).toStrictEqual([
			[{data: ALICE_DATA, gameData: aliceGameData, selection: undefined, fetchMethod: 'data'}],
		]);
		expect(updateHistoryRecord.mock.calls).toStrictEqual([]);
	});
});
