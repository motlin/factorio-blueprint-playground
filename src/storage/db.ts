import Dexie, {Table} from 'dexie';

export type DatabaseBlueprintType = 'blueprint' | 'blueprint_book' | 'upgrade_planner' | 'deconstruction_planner';

export interface DatabaseBlueprintIcon {
	// Defaults to 'item' if not specified
	type?: string;
	name: string;
}

export interface BlueprintGameData {
	type: DatabaseBlueprintType;
	label?: string;
	description?: string;
	gameVersion?: string;
	// 0-4 icons
	icons: DatabaseBlueprintIcon[];
}

export interface BlueprintStorageMetadata {
	// SHA-256 hash of the data string (used as primary key)
	sha: string;
	createdOn: number;
	lastUpdatedOn: number;
	// The raw blueprint string
	data: string;
	// Current selection path
	selection?: string;
	fetchMethod?: 'url' | 'json' | 'data';
}

export interface DatabaseBlueprint {
	metadata: BlueprintStorageMetadata;
	gameData: BlueprintGameData;
}

export async function generateSha(data: string): Promise<string> {
	const encoder = new TextEncoder();
	const dataBuffer = encoder.encode(data);

	const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);

	return Array.from(new Uint8Array(hashBuffer))
		.map((b) => b.toString(16).padStart(2, '0'))
		.join('');
}

export class BlueprintDatabase extends Dexie {
	blueprints!: Table<DatabaseBlueprint, string>;
	recent!: Table<{id: string; sha: string}, string>;

	constructor() {
		super('blueprint-db');

		this.version(1).stores({
			blueprints: 'metadata.sha, metadata.createdOn, metadata.lastUpdatedOn',
			recent: 'id',
		});
	}

	async addBlueprint(
		data: string,
		parsedGameData: Omit<BlueprintGameData, 'createdOn' | 'lastUpdatedOn'>,
		selection?: string,
		fetchMethod?: 'url' | 'json' | 'data',
	): Promise<DatabaseBlueprint> {
		const sha = await generateSha(data);

		const now = Date.now();
		const blueprint: DatabaseBlueprint = {
			metadata: {
				sha,
				createdOn: now,
				lastUpdatedOn: now,
				data,
				selection,
				fetchMethod,
			},
			gameData: parsedGameData,
		};

		await this.blueprints.put(blueprint);
		await this.updateMostRecent(sha);
		return blueprint;
	}

	async updateMostRecent(sha: string): Promise<void> {
		await this.recent.put({id: '__most_recent', sha});
	}

	async getMostRecent(): Promise<DatabaseBlueprint | null> {
		try {
			const recentRecord = await this.recent.get('__most_recent');
			if (!recentRecord || !recentRecord.sha) {
				return null;
			}

			return this.getBlueprint(recentRecord.sha);
		} catch (error) {
			console.error('Error getting most recent blueprint:', error);
			return null;
		}
	}

	async findBlueprintByData(data: string): Promise<DatabaseBlueprint | null> {
		const sha = await generateSha(data);
		return this.getBlueprint(sha);
	}

	async updateBlueprint(
		sha: string,
		changes: {
			metadata?: Partial<Omit<BlueprintStorageMetadata, 'sha'>>;
			gameData?: Partial<BlueprintGameData>;
		},
		options?: {
			updateTimestamp?: boolean;
		},
	): Promise<DatabaseBlueprint | null> {
		const blueprint = await this.getBlueprint(sha);
		if (!blueprint) return null;

		const shouldUpdateTimestamp = options?.updateTimestamp ?? true;

		const updated = {
			metadata: {
				...blueprint.metadata,
				...(changes.metadata || {}),
				...(shouldUpdateTimestamp ? {lastUpdatedOn: Date.now()} : {}),
			},
			gameData: {
				...blueprint.gameData,
				...(changes.gameData || {}),
			},
		};

		await this.blueprints.put(updated);

		if (shouldUpdateTimestamp) {
			await this.updateMostRecent(sha);
		}

		return updated;
	}

	async getBlueprint(sha: string): Promise<DatabaseBlueprint | null> {
		const blueprint = await this.blueprints.get(sha);
		return blueprint || null;
	}

	async removeBlueprint(sha: string): Promise<void> {
		await this.blueprints.delete(sha);
	}

	async removeBulkBlueprints(shas: string[]): Promise<void> {
		await this.blueprints.bulkDelete(shas);
	}

	async listBlueprints(): Promise<DatabaseBlueprint[]> {
		try {
			return await this.blueprints.orderBy('metadata.lastUpdatedOn').reverse().toArray();
		} catch (error) {
			console.error('Error accessing blueprint database:', error);
			await this.clearAll();
			return [];
		}
	}

	async clearAll(): Promise<void> {
		console.warn('Clearing blueprint database due to structure mismatch');
		await this.blueprints.clear();
		await this.recent.clear();
	}
}

export const db = new BlueprintDatabase();
