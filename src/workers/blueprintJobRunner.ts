import {deserializeBlueprint, extractBlueprint} from '../parsing/blueprintParser';
import {type BlueprintSource, blueprintSource} from '../parsing/blueprintSource';
import type {BlueprintString} from '../parsing/types';

// A blueprint decoded from a string travels as that string, which is far cheaper to copy to a worker.
export type BlueprintJobRequest = {id: number; blueprint: BlueprintString} | {id: number; source: BlueprintSource};

export type BlueprintJobResponse<Result> = {id: number; result: Result} | {id: number; error: string};

export interface BlueprintJobWorker<Result> {
	onmessage: ((event: MessageEvent<BlueprintJobResponse<Result>>) => void) | null;
	postMessage(request: BlueprintJobRequest): void;
	terminate(): void;
}

export type BlueprintJobRunner<Result> = (blueprint: BlueprintString, signal?: AbortSignal) => Promise<Result>;

interface PendingRequest<Result> {
	resolve(result: Result): void;
	reject(error: Error): void;
}

// Selecting another blueprint in the same book should not decode the whole book again.
let lastDecoded: {encoded: string; root: BlueprintString} | undefined;

function requestedBlueprint(request: BlueprintJobRequest): BlueprintString {
	if ('blueprint' in request) return request.blueprint;
	const {encoded, path} = request.source;
	if (lastDecoded?.encoded !== encoded) {
		lastDecoded = {encoded, root: deserializeBlueprint(encoded)};
	}
	return extractBlueprint(lastDecoded.root, path);
}

export function answerBlueprintJob<Result>(
	request: BlueprintJobRequest,
	compute: (blueprint: BlueprintString) => Result,
): BlueprintJobResponse<Result> {
	try {
		return {id: request.id, result: compute(requestedBlueprint(request))};
	} catch (error) {
		return {id: request.id, error: error instanceof Error ? error.message : String(error)};
	}
}

function requestFor(id: number, blueprint: BlueprintString): BlueprintJobRequest {
	const source = blueprintSource(blueprint);
	return source === undefined ? {id, blueprint} : {id, source};
}

function abortError(): Error {
	return new DOMException('The blueprint job was cancelled.', 'AbortError');
}

/**
 * Runs jobs on one lazily created worker. Aborting a request terminates the worker,
 * because a worker busy with a huge blueprint cannot be interrupted any other way.
 */
export function createWorkerRunner<Result>(createWorker: () => BlueprintJobWorker<Result>): BlueprintJobRunner<Result> {
	let worker: BlueprintJobWorker<Result> | undefined;
	let nextId = 0;
	const pending = new Map<number, PendingRequest<Result>>();

	function stopWorker(): void {
		worker?.terminate();
		worker = undefined;
		for (const request of pending.values()) {
			request.reject(abortError());
		}
		pending.clear();
	}

	function startedWorker(): BlueprintJobWorker<Result> {
		if (worker) return worker;
		const created = createWorker();
		created.onmessage = ({data}) => {
			const request = pending.get(data.id);
			if (!request) return;
			pending.delete(data.id);
			if ('error' in data) {
				request.reject(new Error(data.error));
			} else {
				request.resolve(data.result);
			}
		};
		worker = created;
		return created;
	}

	return async (blueprint, signal) => {
		if (signal?.aborted === true) throw abortError();
		const id = nextId;
		nextId += 1;
		const onAbort = () => {
			if (pending.has(id)) stopWorker();
		};
		const result = new Promise<Result>((resolve, reject) => {
			pending.set(id, {resolve, reject});
		});
		signal?.addEventListener('abort', onAbort, {once: true});
		startedWorker().postMessage(requestFor(id, blueprint));
		try {
			return await result;
		} finally {
			signal?.removeEventListener('abort', onAbort);
		}
	};
}

// Computes on a later microtask so callers still see a pending state, as they would with a worker.
export function inlineRunner<Result>(
	compute: (blueprint: BlueprintString) => Result | Promise<Result>,
): BlueprintJobRunner<Result> {
	return async (blueprint) => Promise.resolve().then(async () => compute(blueprint));
}

// Without workers, as under jsdom, the job runs on the page's thread instead.
export function blueprintJobRunner<Result>(
	compute: (blueprint: BlueprintString) => Result | Promise<Result>,
	createWorker: () => BlueprintJobWorker<Result>,
): BlueprintJobRunner<Result> {
	return typeof Worker === 'undefined' ? inlineRunner(compute) : createWorkerRunner(createWorker);
}
