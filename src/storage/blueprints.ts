import {entries, get, set, del} from 'idb-keyval';

export type DatabaseBlueprintType = 'blueprint' | 'blueprint_book' | 'upgrade_planner' | 'deconstruction_planner';

export interface DatabaseBlueprintIcon {
	type?: string; // Defaults to 'item' if not specified
	name: string;
}

export interface DatabaseBlueprint {
	// Storage metadata
	createdOn: number;
	lastUpdatedOn: number;

	// Raw data
	data: string; // The raw blueprint string

	// Parsed metadata
	type: DatabaseBlueprintType;
	label?: string;
	description?: string;
	gameVersion: string; // Parsed from version number
	icons: DatabaseBlueprintIcon[]; // 0-4 icons

	// Mod feature usage
	usesSpaceAge: boolean;
	usesQuality: boolean;
	usesElevatedRails: boolean;
}

export const blueprintStorage = {
	async add(
		data: string,
		parsedMetadata: Omit<DatabaseBlueprint, 'createdOn' | 'lastUpdatedOn'>,
	): Promise<DatabaseBlueprint> {
		const now = Date.now();
		const blueprint: DatabaseBlueprint = {
			createdOn: now,
			lastUpdatedOn: now,
			...parsedMetadata,
			data,
		};
		await set(now.toString(), blueprint);
		return blueprint;
	},

	async update(
		createdOn: number,
		changes: Partial<Omit<DatabaseBlueprint, 'createdOn'>>,
	): Promise<DatabaseBlueprint | null> {
		const blueprint = await this.get(createdOn);
		if (!blueprint) return null;

		const updated: DatabaseBlueprint = {
			...blueprint,
			...changes,
			lastUpdatedOn: Date.now(),
		};
		await set(createdOn.toString(), updated);
		return updated;
	},

	async get(createdOn: number): Promise<DatabaseBlueprint | undefined> {
		return await get<DatabaseBlueprint>(createdOn.toString());
	},

	async remove(createdOn: number): Promise<void> {
		await del(createdOn.toString());
	},

	async list(): Promise<DatabaseBlueprint[]> {
		const allEntries = await entries<string, DatabaseBlueprint>();
		return allEntries.map(([_, blueprint]) => blueprint).sort((a, b) => b.lastUpdatedOn - a.lastUpdatedOn);
	},
};
