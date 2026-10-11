import {blueprintJobRunner} from '../workers/blueprintJobRunner';
import {lintBlueprintTree} from './lintProtocol';

export const runLint = blueprintJobRunner(
	lintBlueprintTree,
	() => new Worker(new URL('./lintWorker.ts', import.meta.url), {type: 'module'}),
);
