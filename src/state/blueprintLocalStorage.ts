import {type BlueprintGameData, type BlueprintStorageMetadata, db} from '../storage/db';

export async function addBlueprint(
	data: string,
	parsedGameData: Omit<BlueprintGameData, 'createdOn' | 'lastUpdatedOn'>,
	selection?: string,
	fetchMethod?: 'url' | 'json' | 'data',
) {
	const blueprint = await db.importToHistory({
		data,
		gameData: parsedGameData,
		selection,
		fetchMethod,
	});
	return blueprint;
}

async function updateBlueprint(
	id: string,
	changes: {
		metadata?: Partial<Omit<BlueprintStorageMetadata, 'sha'>>;
		gameData?: Partial<BlueprintGameData>;
	},
	updateTimestamp = true,
) {
	return await db.updateHistoryRecord(id, changes, {updateTimestamp});
}

/**
 * Updates only metadata of a blueprint without affecting its position in history
 * Use this for selection changes and other metadata updates that shouldn't create
 * a new history entry or bring the blueprint to the front of history.
 */
export async function updateBlueprintMetadata(
	id: string,
	metadataChanges: Partial<Omit<BlueprintStorageMetadata, 'sha'>>,
) {
	return await updateBlueprint(id, {metadata: metadataChanges}, false);
}
