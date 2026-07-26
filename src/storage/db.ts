import Dexie, {type Table, type Transaction} from 'dexie';
import {logger} from '../lib/sentry.ts';
import {parseVersion3} from '../parsing/blueprintParser.ts';

export type DatabaseBlueprintType = 'blueprint' | 'blueprint_book' | 'upgrade_planner' | 'deconstruction_planner';
type BlueprintFetchMethod = 'url' | 'json' | 'data';

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
	// SHA-256 hash of the data string
	sha: string;
	createdOn: number;
	lastUpdatedOn: number;
	// The raw blueprint string
	data: string;
	// Current selection path
	selection?: string;
	fetchMethod?: BlueprintFetchMethod;
}

export interface DatabaseBlueprint {
	metadata: BlueprintStorageMetadata;
	gameData: BlueprintGameData;
}

export interface ImportHistoryRecord extends DatabaseBlueprint {
	id: string;
	importedOn: number;
}

export const LIBRARY_ROOT_ID = '__library_root';

export interface LibraryDestination {
	parentId: string;
	position: number;
}

export interface LibraryRecord {
	id: string;
	createdOn: number;
	updatedOn: number;
	data: string;
	gameData: BlueprintGameData;
	selection?: string;
	parentId: string;
	position: number;
}

export interface ImportToHistoryInput {
	data: string;
	gameData: BlueprintGameData;
	selection?: string;
	fetchMethod?: BlueprintFetchMethod;
}

export interface SaveLibraryCopyInput {
	data: string;
	gameData: BlueprintGameData;
	selection?: string;
	destination: LibraryDestination;
}

export interface LibraryRecordContent {
	data: string;
	gameData: BlueprintGameData;
	selection?: string;
}

export interface UpdateLibraryRecordInput {
	id: string;
	content: LibraryRecordContent;
}

export interface MoveLibraryRecordInput {
	id: string;
	destination: LibraryDestination;
}

export interface DuplicateLibraryRecordInput {
	id: string;
	destination: LibraryDestination;
}

export interface DeleteLibraryRecordInput {
	id: string;
}

export interface BlueprintDatabaseOptions {
	name: string;
	now: () => number;
	createId: () => string;
}

interface RecentRecord {
	id: string;
	historyId: string;
}

interface LegacyRecentRecord {
	id: string;
	sha: string;
}

const SUPPORTED_BLUEPRINT_TYPES = new Set<DatabaseBlueprintType>([
	'blueprint',
	'blueprint_book',
	'upgrade_planner',
	'deconstruction_planner',
]);

function assertContent(content: LibraryRecordContent): void {
	if (content.data.length === 0) {
		throw new Error('Blueprint data must not be empty');
	}
	if (!SUPPORTED_BLUEPRINT_TYPES.has(content.gameData.type)) {
		throw new Error(`Unsupported blueprint record type: ${content.gameData.type}`);
	}
	if (content.gameData.icons.length > 4) {
		throw new Error('Blueprint records support at most four icons');
	}
}

function assertDestinationPosition(position: number): void {
	if (!Number.isSafeInteger(position) || position < 0) {
		throw new Error('Library destination position must be a non-negative integer');
	}
}

function copyGameData(gameData: BlueprintGameData): BlueprintGameData {
	return structuredClone(gameData);
}

/**
 * Persistent storage has two deliberately separate concepts:
 *
 * - `history` is an append-only chronology of imports. Importing identical bytes
 *   twice creates two history rows.
 * - `library` contains explicitly saved, mutable records with stable IDs and
 *   ordered shelf/book placement.
 *
 * Serialized data remains opaque in both stores. In particular, planner mappings
 * are never filtered against the blueprint currently open in the editor.
 */
export class BlueprintDatabase extends Dexie {
	history!: Table<ImportHistoryRecord, string>;
	library!: Table<LibraryRecord, string>;
	recent!: Table<RecentRecord, string>;

	private readonly currentTime: () => number;
	private readonly createRecordId: () => string;

	constructor(options: BlueprintDatabaseOptions) {
		super(options.name);
		this.currentTime = options.now;
		this.createRecordId = options.createId;

		this.version(1).stores({
			blueprints: 'metadata.sha, metadata.createdOn, metadata.lastUpdatedOn',
			recent: 'id',
		});

		this.version(2)
			.stores({
				blueprints: 'metadata.sha, metadata.createdOn, metadata.lastUpdatedOn',
				history: 'id, importedOn, metadata.sha',
				library: 'id, updatedOn, parentId, [parentId+position], gameData.type',
				recent: 'id',
			})
			.upgrade(async (transaction) => {
				await this.migrateVersionOneHistory(transaction);
			});

		this.version(3).stores({
			blueprints: null,
			history: 'id, importedOn, metadata.sha',
			library: 'id, updatedOn, parentId, [parentId+position], gameData.type',
			recent: 'id',
		});
	}

	private async migrateVersionOneHistory(transaction: Transaction): Promise<void> {
		const legacyBlueprints = await transaction.table<DatabaseBlueprint, string>('blueprints').toArray();
		const migratedHistory = legacyBlueprints.map<ImportHistoryRecord>((blueprint) => ({
			...blueprint,
			id: `legacy:${blueprint.metadata.sha}`,
			importedOn: blueprint.metadata.createdOn,
		}));
		await transaction.table<ImportHistoryRecord, string>('history').bulkPut(migratedHistory);

		const legacyRecent = await transaction.table<LegacyRecentRecord, string>('recent').get('__most_recent');
		if (legacyRecent !== undefined && legacyRecent.sha !== '') {
			const migratedRecent = migratedHistory.find((record) => record.metadata.sha === legacyRecent.sha);
			if (migratedRecent !== undefined) {
				await transaction
					.table<RecentRecord, string>('recent')
					.put({id: '__most_recent', historyId: migratedRecent.id});
			}
		}
	}

	async importToHistory(input: ImportToHistoryInput): Promise<ImportHistoryRecord> {
		assertContent(input);
		const id = this.createRecordId();
		const importedOn = this.currentTime();
		const sha = await generateSha(input.data);
		const record: ImportHistoryRecord = {
			id,
			importedOn,
			metadata: {
				sha,
				createdOn: importedOn,
				lastUpdatedOn: importedOn,
				data: input.data,
				selection: input.selection,
				fetchMethod: input.fetchMethod,
			},
			gameData: copyGameData(input.gameData),
		};

		await this.transaction('rw', this.history, this.recent, async () => {
			if ((await this.history.get(id)) !== undefined) {
				throw new Error(`History record already exists: ${id}`);
			}
			await this.history.add(record);
			await this.recent.put({id: '__most_recent', historyId: id});
		});
		return record;
	}

	async updateHistoryRecord(
		id: string,
		changes: {
			metadata?: Partial<Omit<BlueprintStorageMetadata, 'sha'>>;
			gameData?: Partial<BlueprintGameData>;
		},
		options: {
			updateTimestamp: boolean;
		},
	): Promise<ImportHistoryRecord> {
		const record = await this.getHistoryRecord(id);
		if (record === null) {
			throw new Error(`History record does not exist: ${id}`);
		}
		const updated: ImportHistoryRecord = {
			...record,
			metadata: {
				...record.metadata,
				...(changes.metadata ?? {}),
				...(options.updateTimestamp ? {lastUpdatedOn: this.currentTime()} : {}),
			},
			gameData: {
				...record.gameData,
				...(changes.gameData ?? {}),
			},
		};
		assertContent({data: updated.metadata.data, gameData: updated.gameData, selection: updated.metadata.selection});

		await this.transaction('rw', this.history, this.recent, async () => {
			await this.history.put(updated);
			if (options.updateTimestamp) {
				await this.recent.put({id: '__most_recent', historyId: id});
			}
		});
		return updated;
	}

	async getHistoryRecord(id: string): Promise<ImportHistoryRecord | null> {
		return (await this.history.get(id)) ?? null;
	}

	async getMostRecent(): Promise<ImportHistoryRecord | null> {
		try {
			const recentRecord = await this.recent.get('__most_recent');
			if (recentRecord === undefined || recentRecord.historyId === '') {
				return null;
			}
			return await this.getHistoryRecord(recentRecord.historyId);
		} catch (error) {
			logger.error('Error getting most recent blueprint', error);
			return null;
		}
	}

	async findHistoryByData(data: string): Promise<ImportHistoryRecord | null> {
		const sha = await generateSha(data);
		const matchingRecords = await this.history.where('metadata.sha').equals(sha).toArray();
		if (matchingRecords.length === 0) {
			return null;
		}
		const latest = [...matchingRecords].sort(
			(left, right) => right.importedOn - left.importedOn || right.id.localeCompare(left.id),
		)[0];
		return latest;
	}

	async listHistory(): Promise<ImportHistoryRecord[]> {
		try {
			const records = await this.history.orderBy('importedOn').reverse().toArray();
			return [...records].sort(
				(left, right) => right.importedOn - left.importedOn || right.id.localeCompare(left.id),
			);
		} catch (error) {
			logger.error('Error accessing blueprint import history', error);
			throw error;
		}
	}

	async removeHistoryRecords(ids: string[]): Promise<void> {
		await this.transaction('rw', this.history, this.recent, async () => {
			await this.history.bulkDelete(ids);
			const recentRecord = await this.recent.get('__most_recent');
			if (recentRecord !== undefined && ids.includes(recentRecord.historyId)) {
				await this.recent.delete('__most_recent');
			}
		});
	}

	async saveLibraryCopy(input: SaveLibraryCopyInput): Promise<LibraryRecord> {
		assertContent(input);
		assertDestinationPosition(input.destination.position);
		const id = this.createRecordId();
		const now = this.currentTime();
		const record: LibraryRecord = {
			id,
			createdOn: now,
			updatedOn: now,
			data: input.data,
			gameData: copyGameData(input.gameData),
			selection: input.selection,
			parentId: input.destination.parentId,
			position: input.destination.position,
		};

		await this.transaction('rw', this.library, async () => {
			if ((await this.library.get(id)) !== undefined) {
				throw new Error(`Library record already exists: ${id}`);
			}
			await this.assertDestination(input.destination);
			await this.openPosition(input.destination.parentId, input.destination.position, now);
			await this.library.add(record);
		});
		return record;
	}

	async updateLibraryRecord(input: UpdateLibraryRecordInput): Promise<LibraryRecord> {
		assertContent(input.content);
		const now = this.currentTime();
		return await this.transaction('rw', this.library, async () => {
			const current = await this.requireLibraryRecord(input.id);
			if (current.gameData.type !== input.content.gameData.type) {
				throw new Error('Updating a library record cannot change its record type');
			}
			const updated: LibraryRecord = {
				...current,
				updatedOn: now,
				data: input.content.data,
				gameData: copyGameData(input.content.gameData),
				selection: input.content.selection,
			};
			await this.library.put(updated);
			return updated;
		});
	}

	async moveLibraryRecord(input: MoveLibraryRecordInput): Promise<LibraryRecord> {
		assertDestinationPosition(input.destination.position);
		const now = this.currentTime();
		return await this.transaction('rw', this.library, async () => {
			const record = await this.requireLibraryRecord(input.id);
			await this.assertDestination(input.destination, input.id);
			await this.assertNotDescendant(input.id, input.destination.parentId);

			if (record.parentId === input.destination.parentId && record.position === input.destination.position) {
				return record;
			}

			await this.closePosition(record.parentId, record.position, now, record.id);
			await this.openPosition(input.destination.parentId, input.destination.position, now, record.id);
			const moved: LibraryRecord = {
				...record,
				parentId: input.destination.parentId,
				position: input.destination.position,
				updatedOn: now,
			};
			await this.library.put(moved);
			return moved;
		});
	}

	async duplicateLibraryRecord(input: DuplicateLibraryRecordInput): Promise<LibraryRecord> {
		assertDestinationPosition(input.destination.position);
		const now = this.currentTime();
		return await this.transaction('rw', this.library, async () => {
			const source = await this.requireLibraryRecord(input.id);
			await this.assertDestination(input.destination);
			const subtree = await this.collectSubtree(source.id);
			const identifiers = new Map<string, string>();
			const generatedIdentifiers = new Set<string>();
			for (const record of subtree) {
				const duplicateId = this.createRecordId();
				if (generatedIdentifiers.has(duplicateId) || (await this.library.get(duplicateId)) !== undefined) {
					throw new Error(`Library record already exists: ${duplicateId}`);
				}
				identifiers.set(record.id, duplicateId);
				generatedIdentifiers.add(duplicateId);
			}

			await this.openPosition(input.destination.parentId, input.destination.position, now);
			const duplicateIdentifier = (recordId: string): string => {
				const identifier = identifiers.get(recordId);
				if (identifier === undefined) {
					throw new Error(`Missing duplicate identifier for library record: ${recordId}`);
				}
				return identifier;
			};
			const duplicates = subtree.map<LibraryRecord>((record) => ({
				...record,
				id: duplicateIdentifier(record.id),
				createdOn: now,
				updatedOn: now,
				gameData: copyGameData(record.gameData),
				parentId: record.id === source.id ? input.destination.parentId : duplicateIdentifier(record.parentId),
				position: record.id === source.id ? input.destination.position : record.position,
			}));
			await this.library.bulkAdd(duplicates);
			return duplicates[0];
		});
	}

	async deleteLibraryRecord(input: DeleteLibraryRecordInput): Promise<void> {
		const now = this.currentTime();
		await this.transaction('rw', this.library, async () => {
			const record = await this.requireLibraryRecord(input.id);
			const subtree = await this.collectSubtree(record.id);
			await this.library.bulkDelete(subtree.map((entry) => entry.id));
			await this.closePosition(record.parentId, record.position, now);
		});
	}

	async getLibraryRecord(id: string): Promise<LibraryRecord | null> {
		return (await this.library.get(id)) ?? null;
	}

	async listLibraryChildren(parentId: string): Promise<LibraryRecord[]> {
		return await this.library.where('parentId').equals(parentId).sortBy('position');
	}

	async listLibraryRecords(): Promise<LibraryRecord[]> {
		return await this.library.toArray();
	}

	async listLibraryTree(): Promise<LibraryRecord[]> {
		const records: LibraryRecord[] = [];
		const visitChildren = async (parentId: string): Promise<void> => {
			const children = await this.listLibraryChildren(parentId);
			for (const child of children) {
				records.push(child);
				await visitChildren(child.id);
			}
		};
		await visitChildren(LIBRARY_ROOT_ID);
		return records;
	}

	private async requireLibraryRecord(id: string): Promise<LibraryRecord> {
		const record = await this.library.get(id);
		if (record === undefined) {
			throw new Error(`Library record does not exist: ${id}`);
		}
		return record;
	}

	private async assertDestination(destination: LibraryDestination, movingId?: string): Promise<void> {
		if (destination.parentId !== LIBRARY_ROOT_ID) {
			const parent = await this.requireLibraryRecord(destination.parentId);
			if (parent.gameData.type !== 'blueprint_book') {
				throw new Error(`Library destination is not a book: ${destination.parentId}`);
			}
		}
		const siblings = await this.library.where('parentId').equals(destination.parentId).toArray();
		const availablePositions =
			movingId === undefined ? siblings.length : siblings.filter((entry) => entry.id !== movingId).length;
		if (destination.position > availablePositions) {
			throw new Error(
				`Library destination position ${destination.position} exceeds ${availablePositions} available slots`,
			);
		}
	}

	private async assertNotDescendant(recordId: string, parentId: string): Promise<void> {
		let currentParentId = parentId;
		while (currentParentId !== LIBRARY_ROOT_ID) {
			if (currentParentId === recordId) {
				throw new Error('A library record cannot be moved into itself or one of its descendants');
			}
			const parent = await this.requireLibraryRecord(currentParentId);
			currentParentId = parent.parentId;
		}
	}

	private async openPosition(parentId: string, position: number, now: number, excludedId?: string): Promise<void> {
		const siblings = await this.library.where('parentId').equals(parentId).toArray();
		const shifted = siblings
			.filter((record) => record.id !== excludedId && record.position >= position)
			.map((record) => ({...record, position: record.position + 1, updatedOn: now}));
		await this.library.bulkPut(shifted);
	}

	private async closePosition(parentId: string, position: number, now: number, excludedId?: string): Promise<void> {
		const siblings = await this.library.where('parentId').equals(parentId).toArray();
		const shifted = siblings
			.filter((record) => record.id !== excludedId && record.position > position)
			.map((record) => ({...record, position: record.position - 1, updatedOn: now}));
		await this.library.bulkPut(shifted);
	}

	private async collectSubtree(rootId: string): Promise<LibraryRecord[]> {
		const records: LibraryRecord[] = [];
		const visit = async (id: string): Promise<void> => {
			const record = await this.requireLibraryRecord(id);
			records.push(record);
			const children = await this.listLibraryChildren(id);
			for (const child of children) {
				await visit(child.id);
			}
		};
		await visit(rootId);
		return records;
	}

	async clearAll(): Promise<void> {
		await this.transaction('rw', this.history, this.library, this.recent, async () => {
			await this.history.clear();
			await this.library.clear();
			await this.recent.clear();
		});
	}
}

async function generateSha(data: string): Promise<string> {
	const encoder = new TextEncoder();
	const dataBuffer = encoder.encode(data);
	const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
	return Array.from(new Uint8Array(hashBuffer))
		.map((byte) => byte.toString(16).padStart(2, '0'))
		.join('');
}

export const db = new BlueprintDatabase({
	name: 'blueprint-db',
	now: () => Date.now(),
	createId: () => crypto.randomUUID(),
});

interface BlueprintDbUtils {
	listHistory(): Promise<ImportHistoryRecord[]>;
	listLibrary(): Promise<LibraryRecord[]>;
	getMostRecent(): Promise<ImportHistoryRecord | null>;
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
		async listHistory() {
			const records = await db.listHistory();
			console.table(
				records.map((record) => ({
					id: record.id,
					sha: record.metadata.sha,
					label: record.gameData.label ?? '(no label)',
					type: record.gameData.type,
					version:
						record.gameData.gameVersion === undefined
							? '(none)'
							: parseVersion3(Number(record.gameData.gameVersion)),
					imported: new Date(record.importedOn).toLocaleString(),
				})),
			);
			return records;
		},
		async listLibrary() {
			const records = await db.listLibraryRecords();
			console.table(records);
			return records;
		},
		async getMostRecent() {
			const record = await db.getMostRecent();
			console.log(record);
			return record;
		},
		async clearAll() {
			if (confirm('Are you sure you want to clear all blueprint history and library records?')) {
				await db.clearAll();
				console.log('Database cleared');
			}
		},
		formatDate(timestamp: number) {
			return new Date(timestamp).toLocaleString();
		},
		help() {
			console.log(`
Blueprint Database Utilities

- window.blueprintDb.listHistory()
- window.blueprintDb.listLibrary()
- window.blueprintDb.getMostRecent()
- window.blueprintDb.clearAll()
`);
		},
	};
}
