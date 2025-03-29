import {blueprintStorage, DatabaseBlueprint} from '../storage/blueprints';

// Helper functions
export async function addBlueprint(
	data: string,
	parsedMetadata: Omit<DatabaseBlueprint, 'createdOn' | 'lastUpdatedOn'>,
	selection?: string,
	fetchMethod?: 'url' | 'json' | 'data',
) {
	const blueprint = await blueprintStorage.add(data, parsedMetadata, selection, fetchMethod);
	return blueprint;
}

export async function updateBlueprint(sha: string, changes: Partial<DatabaseBlueprint>, updateTimestamp = true) {
	const updated = await blueprintStorage.update(sha, changes, {updateTimestamp});
	if (!updated) return null;
	return updated;
}

/**
 * Updates only metadata of a blueprint without affecting its position in history
 * Use this for selection changes and other metadata updates that shouldn't create
 * a new history entry or bring the blueprint to the front of history.
 */
export async function updateBlueprintMetadata(sha: string, changes: Partial<Omit<DatabaseBlueprint, 'gameData'>>) {
	return updateBlueprint(sha, changes, false);
}

export async function deleteBlueprint(sha: string) {
	await blueprintStorage.remove(sha);
}

// Function to get all blueprints
export async function getBlueprints() {
	return blueprintStorage.list();
}

// Function to get the most recent blueprint
export async function getMostRecentBlueprint() {
	return blueprintStorage.getMostRecent();
}
