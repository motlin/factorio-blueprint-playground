import {type BlueprintGameData, type BlueprintStorageMetadata, db} from '../storage/db';

export async function addBlueprint(
	data: string,
	parsedGameData: Omit<BlueprintGameData, 'createdOn' | 'lastUpdatedOn'>,
	selection?: string,
	fetchMethod?: 'url' | 'json' | 'data',
) {
	const blueprint = await db.addBlueprint(data, parsedGameData, selection, fetchMethod);
	return blueprint;
}

export async function updateBlueprint(
	sha: string,
	changes: {
		metadata?: Partial<Omit<BlueprintStorageMetadata, 'sha'>>;
		gameData?: Partial<BlueprintGameData>;
	},
	updateTimestamp = true,
) {
	const updated = await db.updateBlueprint(sha, changes, {updateTimestamp});
	if (!updated) return null;
	return updated;
}

/**
 * Updates only metadata of a blueprint without affecting its position in history
 * Use this for selection changes and other metadata updates that shouldn't create
 * a new history entry or bring the blueprint to the front of history.
 */
export async function updateBlueprintMetadata(
	sha: string,
	metadataChanges: Partial<Omit<BlueprintStorageMetadata, 'sha'>>,
) {
	return updateBlueprint(sha, {metadata: metadataChanges}, false);
}
