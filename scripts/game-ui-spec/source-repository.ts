import type {GameUiSourceLock} from './schema';

export interface GameUiSourceRepository {
	resolveCommit(tag: string): string;
	resolveBlob(commit: string, path: string): string;
	readBlob(blob: string): string;
}

export function readPinnedGameUiSources(
	sourceLock: GameUiSourceLock,
	repository: GameUiSourceRepository,
): Map<string, string> {
	const resolvedCommit = repository.resolveCommit(sourceLock.tag);
	if (resolvedCommit !== sourceLock.commit) {
		throw new Error(
			`Factorio tag ${sourceLock.tag} resolved to ${resolvedCommit}, expected immutable commit ${sourceLock.commit}.`,
		);
	}
	const sources = new Map<string, string>();
	for (const source of sourceLock.sources) {
		const blob = repository.resolveBlob(sourceLock.commit, source.path);
		if (blob !== source.blob) {
			throw new Error(`Factorio source ${source.path} resolved to ${blob}, expected pinned blob ${source.blob}.`);
		}
		sources.set(source.path, repository.readBlob(source.blob));
	}
	return sources;
}
