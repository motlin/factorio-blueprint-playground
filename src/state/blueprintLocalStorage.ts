import deepEqual from 'fast-deep-equal';

import {deserializeBlueprint} from '../parsing/blueprintParser';
import {type BlueprintGameData, type BlueprintStorageMetadata, type DatabaseBlueprint, db} from '../storage/db';

export function isFunctionallyEquivalent(newBlueprint: string, existingBlueprint: string): boolean {
	if (newBlueprint === existingBlueprint) return true;

	try {
		const newData = deserializeBlueprint(newBlueprint);
		const existingData = deserializeBlueprint(existingBlueprint);
		return deepEqual(newData, existingData);
	} catch {
		return false;
	}
}

export async function addBlueprint(
	data: string,
	parsedGameData: Omit<BlueprintGameData, 'createdOn' | 'lastUpdatedOn'>,
	selection?: string,
	fetchMethod?: BlueprintStorageMetadata['fetchMethod'],
): Promise<DatabaseBlueprint> {
	if (fetchMethod === 'edit') {
		const exactMatch = await db.findBlueprintByData(data);
		if (exactMatch) {
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
			return updatedBlueprint ?? exactMatch;
		}

		const existingBlueprints = await db.listBlueprints();

		for (const existingBlueprint of existingBlueprints) {
			if (isFunctionallyEquivalent(data, existingBlueprint.metadata.data)) {
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
				return updatedBlueprint ?? existingBlueprint;
			}
		}

		return await db.addBlueprint(data, parsedGameData, selection, fetchMethod);
	}

	const existingBlueprint = await db.findBlueprintByData(data);

	if (existingBlueprint) {
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
			return updatedBlueprint ?? existingBlueprint;
		}
		return existingBlueprint;
	}

	return await db.addBlueprint(data, parsedGameData, selection, fetchMethod);
}

async function updateBlueprint(
	sha: string,
	changes: {
		metadata?: Partial<Omit<BlueprintStorageMetadata, 'sha'>>;
		gameData?: Partial<BlueprintGameData>;
	},
	updateTimestamp = true,
) {
	return await db.updateBlueprint(sha, changes, {updateTimestamp});
}

export async function updateBlueprintMetadata(
	sha: string,
	metadataChanges: Partial<Omit<BlueprintStorageMetadata, 'sha'>>,
) {
	return await updateBlueprint(sha, {metadata: metadataChanges}, false);
}
