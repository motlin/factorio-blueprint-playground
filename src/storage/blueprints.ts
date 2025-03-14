import {parseVersion3} from '../parsing/blueprintParser.ts';

import {
	db,
	DatabaseBlueprint,
	DatabaseBlueprintType,
	DatabaseBlueprintIcon,
	BlueprintGameData,
	BlueprintStorageMetadata,
	generateSha,
} from './db';

export type {
	DatabaseBlueprintType,
	DatabaseBlueprintIcon,
	BlueprintGameData,
	BlueprintStorageMetadata,
	DatabaseBlueprint,
};
// TODO 2025-04-18: Inline and delete
export {generateSha};

// TODO 2025-04-18: Inline and delete
export const blueprintStorage = {
	addNew: db.addBlueprint.bind(db),
	updateMostRecent: db.updateMostRecent.bind(db),
	getMostRecent: db.getMostRecent.bind(db),
	findByData: db.findBlueprintByData.bind(db),
	update: db.updateBlueprint.bind(db),
	get: db.getBlueprint.bind(db),
	remove: db.removeBlueprint.bind(db),
	removeAll: db.removeBulkBlueprints.bind(db),
	list: db.listBlueprints.bind(db),
	clearAll: db.clearAll.bind(db),
};

// Utility functions to inspect IndexedDB from browser console
interface BlueprintDbUtils {
	listAll(): Promise<DatabaseBlueprint[]>;
	getBySha(sha: string): Promise<DatabaseBlueprint | undefined>;
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
			const blueprints = await db.listBlueprints();

			// eslint-disable-next-line no-console
			console.table(
				blueprints.map((bp) => ({
					sha: bp.metadata.sha,
					label: bp.gameData.label || '(no label)',
					description: bp.gameData.description
						? bp.gameData.description.length > 30
							? bp.gameData.description.substring(0, 30) + '...'
							: bp.gameData.description
						: '(none)',
					type: bp.gameData.type,
					gameVersion: bp.gameData.gameVersion || '(none)',
					version: parseVersion3(bp.gameData.gameVersion) || '(none)',
					icons:
						bp.gameData.icons.length > 0
							? bp.gameData.icons.map((icon) => `${icon.type || 'item'}/${icon.name}`).join(', ')
							: '(none)',
					created: new Date(bp.metadata.createdOn).toLocaleString(),
					updated: new Date(bp.metadata.lastUpdatedOn).toLocaleString(),
					selection: bp.metadata.selection || '(none)',
				})),
			);

			return blueprints;
		},

		async getBySha(sha: string) {
			const blueprint = await db.getBlueprint(sha);
			// eslint-disable-next-line no-console
			console.log(blueprint);
			return blueprint;
		},

		async getMostRecent() {
			const blueprint = await db.getMostRecent();
			// eslint-disable-next-line no-console
			console.log(blueprint);
			return blueprint;
		},

		async clearAll() {
			if (confirm('Are you sure you want to clear all blueprints?')) {
				await db.clearAll();
				// eslint-disable-next-line no-console
				console.log('Database cleared');
			}
		},

		formatDate(timestamp: number) {
			return new Date(timestamp).toLocaleString();
		},

		help() {
			// eslint-disable-next-line no-console
			console.log(`
Blueprint Database Utilities

Available commands:
- window.blueprintDb.listAll()       - List all blueprints in a table
- window.blueprintDb.getBySha(sha)   - Get blueprint details by SHA
- window.blueprintDb.getMostRecent() - Get most recent blueprint
- window.blueprintDb.clearAll()      - Clear all blueprints (with confirmation)
- window.blueprintDb.help()          - Show this help message

Notes:
- The 'sha' column is the SHA-256 hash of the blueprint string
- This hash is used as the unique key in IndexedDB
- When opening a previously viewed blueprint, only the 'lastUpdatedOn' date is updated

Example usage:
const allBlueprints = await window.blueprintDb.listAll();
const blueprint = await window.blueprintDb.getBySha("a1b2c3...");
`);
		},
	};

	// Log help message when loading in development
	if (import.meta.env.DEV) {
		// eslint-disable-next-line no-console
		console.log('Blueprint database utilities available at window.blueprintDb (try window.blueprintDb.help())');
	}
}
