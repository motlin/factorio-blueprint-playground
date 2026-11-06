import {type BlueprintGameData, type BlueprintStorageMetadata, db} from '../storage/db';

/**
 * Records an import in the chronological history, unless the blueprint is already the most
 * recent import. Clicking through a book re-runs the route loader with the same blueprint and
 * a new selection path, which is a selection change rather than a new import, so it updates the
 * existing record's selection. Re-importing a blueprint after a different one still appends.
 */
export async function addBlueprint(
	data: string,
	parsedGameData: Omit<BlueprintGameData, 'createdOn' | 'lastUpdatedOn'>,
	selection?: string,
	fetchMethod?: 'url' | 'json' | 'data',
) {
	const mostRecent = await db.getMostRecent();
	if (mostRecent?.metadata.data === data) {
		if (mostRecent.metadata.selection === selection) {
			return mostRecent;
		}
		return await updateBlueprintMetadata(mostRecent.id, {selection});
	}

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
