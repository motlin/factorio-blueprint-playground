import {blueprintStorage, DatabaseBlueprint} from '../storage/blueprints';

// Helper functions
export async function addBlueprint(
	data: string,
	parsedMetadata: Omit<DatabaseBlueprint, 'createdOn' | 'lastUpdatedOn'>,
	selection?: string,
) {
	const blueprint = await blueprintStorage.add(data, parsedMetadata, selection);
	return blueprint;
}

export async function updateBlueprint(createdOn: number, changes: Partial<Omit<DatabaseBlueprint, 'createdOn'>>) {
	const updated = await blueprintStorage.update(createdOn, changes);
	if (!updated) return null;
	return updated;
}

export async function deleteBlueprint(createdOn: number) {
	await blueprintStorage.remove(createdOn);
}

// Function to get all blueprints
export async function getBlueprints() {
	return blueprintStorage.list();
}

// Function to get the most recent blueprint
export async function getMostRecentBlueprint() {
	return blueprintStorage.getMostRecent();
}
