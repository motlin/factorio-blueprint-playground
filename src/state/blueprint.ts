import { signal } from '@preact/signals';
import {blueprintStorage, DatabaseBlueprint} from '../storage/blueprints';

// Current blueprint being viewed/edited
export const currentBlueprintSignal = signal<DatabaseBlueprint | null>(null);

// Complete list of blueprints, sorted by lastUpdatedOn
export const blueprintHistorySignal = signal<DatabaseBlueprint[]>([]);

// Helper functions
export async function addBlueprint(
 data: string,
 parsedMetadata: Omit<DatabaseBlueprint, 'createdOn' | 'lastUpdatedOn'>
) {
 const blueprint = await blueprintStorage.add(data, parsedMetadata);
 blueprintHistorySignal.value = [blueprint, ...blueprintHistorySignal.value];
 return blueprint;
}

export async function updateBlueprint(
 createdOn: number,
 changes: Partial<Omit<DatabaseBlueprint, 'createdOn'>>
) {
 const updated = await blueprintStorage.update(createdOn, changes);
 if (!updated) return null;

 blueprintHistorySignal.value = blueprintHistorySignal.value.map((bp: DatabaseBlueprint) =>
   bp.createdOn === createdOn ? updated : bp
 ).sort((a: DatabaseBlueprint, b: DatabaseBlueprint) => b.lastUpdatedOn - a.lastUpdatedOn);

 if (currentBlueprintSignal.value?.createdOn === createdOn) {
   currentBlueprintSignal.value = updated;
 }

 return updated;
}

export async function deleteBlueprint(createdOn: number) {
 await blueprintStorage.remove(createdOn);

 blueprintHistorySignal.value = blueprintHistorySignal.value
   .filter((bp: DatabaseBlueprint) => bp.createdOn !== createdOn);

 if (currentBlueprintSignal.value?.createdOn === createdOn) {
   currentBlueprintSignal.value = null;
 }
}

// Load initial history from storage
blueprintStorage.list().then(blueprints => {
    blueprintHistorySignal.value = blueprints;
});