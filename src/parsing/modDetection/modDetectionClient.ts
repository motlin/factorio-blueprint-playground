import {blueprintJobRunner} from '../../workers/blueprintJobRunner';
import {detectMods} from './modDetectionProtocol';
import type {ModDatabase} from './types';

let database: Promise<ModDatabase> | undefined;

// Loaded once, so later fallback jobs wait only a microtask rather than another dynamic import.
async function loadDatabase(): Promise<ModDatabase> {
	database ??= import('../../generated/mod-db.json').then((module) => module.default);
	return database;
}

export const runModDetection = blueprintJobRunner(
	async (blueprint) => detectMods(blueprint, await loadDatabase()),
	() => new Worker(new URL('./modDetectionWorker.ts', import.meta.url), {type: 'module'}),
);
