import deepEqual from 'fast-deep-equal';

import {deserializeBlueprint} from '../parsing/blueprintParser';
import {type BlueprintGameData, type BlueprintStorageMetadata, type DatabaseBlueprint, db} from '../storage/db';

/**
 * Check if a blueprint is functionally equivalent to another (same content despite different formatting)
 * This is a deeper comparison than string equality and is used for deduplication of edits
 */
export function isFunctionallyEquivalent(newBlueprint: string, existingBlueprint: string): boolean {
	// If the strings are identical, they're definitely equivalent
	if (newBlueprint === existingBlueprint) return true;

	try {
		// Try deserializing both to compare their actual content
		const newData = deserializeBlueprint(newBlueprint);
		const existingData = deserializeBlueprint(existingBlueprint);

		// Use fast-deep-equal for deep comparison
		return deepEqual(newData, existingData);
	} catch (error) {
		console.error('Error comparing blueprints:', error);
		// If we can't deserialize, fall back to string comparison
		return false;
	}
}

export async function addBlueprint(
	data: string,
	parsedGameData: Omit<BlueprintGameData, 'createdOn' | 'lastUpdatedOn'>,
	selection?: string,
	fetchMethod?: 'url' | 'json' | 'data' | 'edit',
): Promise<DatabaseBlueprint> {
	// Special handling for edit operations
	if (fetchMethod === 'edit') {
		// First check for exact match to avoid unnecessary work
		const exactMatch = await db.findBlueprintByData(data);
		if (exactMatch) {
			// Update timestamp to move to front of history without creating duplicate
			const updatedBlueprint = await db.updateBlueprint(
				exactMatch.metadata.sha,
				{
					metadata: {
						fetchMethod,
						selection,
					},
				},
				{updateTimestamp: true},
			);
			return updatedBlueprint || exactMatch;
		}

		// Check for a no-op edit (blueprint that's functionally identical)
		// We need to check all previous blueprints in case this matches another version
		const existingBlueprints = await db.listBlueprints();

		// Look for functionally equivalent blueprints (same content, different formatting)
		for (const existingBlueprint of existingBlueprints) {
			const isEquivalent = isFunctionallyEquivalent(data, existingBlueprint.metadata.data);
			if (isEquivalent) {
				// If the edit is just formatting or a no-op, update the existing entry
				// rather than creating a new duplicate entry
				const updatedBlueprint = await db.updateBlueprint(
					existingBlueprint.metadata.sha,
					{
						metadata: {
							fetchMethod,
							selection,
						},
					},
					{updateTimestamp: true},
				);
				return updatedBlueprint || existingBlueprint;
			}
		}

		// If we get here, it's a meaningful edit, so create a new entry
		return await db.addBlueprint(data, parsedGameData, selection, fetchMethod);
	}

	// Standard handling for non-edit operations
	const existingBlueprint = await db.findBlueprintByData(data);

	// If it exists, just update the fetchMethod and selection if different
	if (existingBlueprint) {
		// Update if fetchMethod or selection changed
		if (
			existingBlueprint.metadata.fetchMethod !== fetchMethod ||
			existingBlueprint.metadata.selection !== selection
		) {
			const updatedBlueprint = await db.updateBlueprint(
				existingBlueprint.metadata.sha,
				{
					metadata: {
						fetchMethod,
						selection,
					},
				},
				{updateTimestamp: true},
			);
			return updatedBlueprint || existingBlueprint;
		}
		return existingBlueprint;
	}

	// Otherwise, add the new blueprint
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
