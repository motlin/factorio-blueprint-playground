import {entries, get, set, del} from 'idb-keyval';

import {parseVersion} from '../parsing/blueprintParser';

export type DatabaseBlueprintType = 'blueprint' | 'blueprint_book' | 'upgrade_planner' | 'deconstruction_planner';

export interface DatabaseBlueprintIcon {
	// Defaults to 'item' if not specified
	type?: string;
	name: string;
}

// Blueprint game data from deserialization
export interface BlueprintGameData {
	type: DatabaseBlueprintType;
	label?: string;
	description?: string;
	// Original version number from the blueprint
	version?: number;

	// Parsed game version (derived from version number, not stored in original game data)
	gameVersion: string;
	// 0-4 icons
	icons: DatabaseBlueprintIcon[];
}

// Storage metadata
export interface BlueprintStorageMetadata {
	createdOn: number;
	lastUpdatedOn: number;
	// The raw blueprint string
	data: string;
	// Current selection path (if any)
	selection?: string;
}

// Combined type for database storage
export interface DatabaseBlueprint {
	// Storage metadata
	metadata: BlueprintStorageMetadata;
	// Game data
	gameData: BlueprintGameData;
}

export const blueprintStorage = {
	async add(
		data: string,
		parsedGameData: Omit<BlueprintGameData, 'createdOn' | 'lastUpdatedOn'>,
		selection?: string,
	) {
		// Check if this blueprint exists already
		const existingBlueprint = await this.findByData(data);

		if (existingBlueprint) {
			// Update existing blueprint's lastUpdatedOn and selection
			const updated = await this.update(existingBlueprint.metadata.createdOn, {
				metadata: {
					selection,
				},
			});
			return updated;
		}

		// Create new blueprint if it doesn't exist
		const now = Date.now();
		const blueprint: DatabaseBlueprint = {
			metadata: {
				createdOn: now,
				lastUpdatedOn: now,
				data,
				selection,
			},
			gameData: parsedGameData,
		};
		await set(now.toString(), blueprint);
		return blueprint;
	},

	async getMostRecent(): Promise<DatabaseBlueprint | null> {
		try {
			const allBlueprints = await this.list();
			if (allBlueprints.length === 0) {
				return null;
			}
			// List is already sorted by lastUpdatedOn in descending order
			return allBlueprints[0];
		} catch (error) {
			console.error('Error getting most recent blueprint:', error);
			return null;
		}
	},

	async findByData(data: string): Promise<DatabaseBlueprint | null> {
		const allEntries = await entries<string, DatabaseBlueprint>();

		for (const [_, bp] of allEntries) {
			if (bp.metadata?.data === data) {
				return bp;
			}
		}

		return null;
	},

	async removeDuplicates(data: string) {
		const allEntries = await entries<string, DatabaseBlueprint>();

		const duplicates: string[] = [];

		for (const [key, bp] of allEntries) {
			if (bp.metadata?.data === data) {
				duplicates.push(key);
			}
		}

		for (const key of duplicates) {
			await del(key);
		}
	},

	async update(
		createdOn: number,
		changes: {
			metadata?: Partial<Omit<BlueprintStorageMetadata, 'createdOn'>>;
			gameData?: Partial<BlueprintGameData>;
		},
	) {
		const blueprint = await this.get(createdOn);
		if (!blueprint) return null;

		const updated = {
			metadata: {
				...blueprint.metadata,
				...(changes.metadata || {}),
				lastUpdatedOn: Date.now(),
			},
			gameData: {
				...blueprint.gameData,
				...(changes.gameData || {}),
			},
		};
		await set(createdOn.toString(), updated);
		return updated;
	},

	async get(createdOn: number) {
		return get<DatabaseBlueprint>(createdOn.toString());
	},

	async remove(createdOn: number) {
		await del(createdOn.toString());
	},

	async list() {
		try {
			const allEntries = await entries<string, DatabaseBlueprint>();

			// We need to ensure the data has the new structure
			// If any entry has the old structure, we'll clear the database
			for (const [_, bp] of allEntries) {
				if (!bp.metadata || !bp.gameData) {
					// Found an entry with old structure, clear everything
					await this.clearAll();
					// Return empty array after clearing
					return [];
				}
			}

			return allEntries
				.map(([_, blueprint]) => blueprint)
				.sort((a, b) => b.metadata.lastUpdatedOn - a.metadata.lastUpdatedOn);
		} catch (error) {
			console.error('Error accessing blueprint database:', error);
			// Clear database on any error and return empty list
			await this.clearAll();
			return [];
		}
	},

	async clearAll() {
		console.warn('Clearing blueprint database due to structure mismatch');
		// Get all keys
		const allEntries = await entries<string, unknown>();
		// Delete each entry
		for (const [key] of allEntries) {
			await del(key);
		}
	},
};

// Utility functions to inspect IndexedDB from browser console
// Usage: window.blueprintDb.listAll() in browser console
interface BlueprintDbUtils {
	listAll(): Promise<DatabaseBlueprint[]>;
	getById(id: number): Promise<DatabaseBlueprint | undefined>;
	getMostRecent(): Promise<DatabaseBlueprint | null>;
	clearAll(): Promise<void>;
	formatDate(timestamp: number): string;
	help(): void;
}

declare global {
	interface Window {
		blueprintDb?: BlueprintDbUtils;
	}
}

if (typeof window !== 'undefined') {
	window.blueprintDb = {
		async listAll() {
			const blueprints = await blueprintStorage.list();

			// eslint-disable-next-line no-console
			console.table(
				blueprints.map((bp) => ({
					// ID is the timestamp used as the key in IndexedDB (createdOn)
					id: bp.metadata.createdOn,
					label: bp.gameData.label || '(no label)',
					description: bp.gameData.description
						? bp.gameData.description.length > 30
							? bp.gameData.description.substring(0, 30) + '...'
							: bp.gameData.description
						: '(none)',
					type: bp.gameData.type,
					// Original version number from the blueprint (raw format)
					rawVersion: bp.gameData.gameVersion || '(none)',
					// Human-readable version parsed from the raw version number
					gameVersion: bp.gameData.gameVersion
						? (() => {
								try {
									const versionNum = Number(bp.gameData.gameVersion);
									if (isNaN(versionNum)) return bp.gameData.gameVersion;
									return parseVersion(versionNum);
								} catch (_e) {
									return bp.gameData.gameVersion;
								}
							})()
						: '(unknown)',
					icons:
						bp.gameData.icons.length > 0
							? bp.gameData.icons.map((icon) => `${icon.type || 'item'}/${icon.name}`).join(', ')
							: '(none)',
					created: new Date(bp.metadata.createdOn).toLocaleString(),
					updated: new Date(bp.metadata.lastUpdatedOn).toLocaleString(),
					selection: bp.metadata.selection || '(none)',
				})),
			);

			// Also show a detailed log of the first blueprint to help with debugging
			if (blueprints.length > 0) {
				// eslint-disable-next-line no-console
				console.log('First blueprint data structure:', blueprints[0]);
				// eslint-disable-next-line no-console
				console.log(
					'ID column explanation: The ID is the timestamp (in milliseconds since epoch) when the blueprint was first created. This timestamp is used as the unique key in IndexedDB.',
				);
			}

			return blueprints;
		},

		async getById(id: number) {
			const blueprint = await blueprintStorage.get(id);
			// eslint-disable-next-line no-console
			console.log(blueprint);
			return blueprint;
		},

		async getMostRecent() {
			const blueprint = await blueprintStorage.getMostRecent();
			// eslint-disable-next-line no-console
			console.log(blueprint);
			return blueprint;
		},

		async clearAll() {
			if (confirm('Are you sure you want to clear all blueprints?')) {
				await blueprintStorage.clearAll();
				// eslint-disable-next-line no-console
				console.log('Database cleared');
			}
		},

		// Helper to convert timestamp to readable date
		formatDate(timestamp: number) {
			return new Date(timestamp).toLocaleString();
		},

		// Display help
		help() {
			// eslint-disable-next-line no-console
			console.log(`
Blueprint Database Utilities

Available commands:
- window.blueprintDb.listAll()       - List all blueprints in a table
- window.blueprintDb.getById(id)     - Get blueprint details by ID 
- window.blueprintDb.getMostRecent() - Get most recent blueprint
- window.blueprintDb.clearAll()      - Clear all blueprints (with confirmation)
- window.blueprintDb.help()          - Show this help message

Notes:
- The 'id' column is the timestamp (in milliseconds since epoch) when the blueprint was first created
- This timestamp is used as the unique key in IndexedDB
- When opening a previously viewed blueprint, only the 'lastUpdatedOn' date is updated

Example usage:
const allBlueprints = await window.blueprintDb.listAll();
const blueprint = await window.blueprintDb.getById(1647859432145);
`);
		},
	};

	// Log help message when loading in development
	if (import.meta.env.DEV) {
		// eslint-disable-next-line no-console
		console.log('Blueprint database utilities available at window.blueprintDb (try window.blueprintDb.help())');
	}
}
