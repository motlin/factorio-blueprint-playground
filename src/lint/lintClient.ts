import type {BlueprintString} from '../parsing/types';
import {lintBlueprintTree, type LintRequest, type LintResponse, type LocatedLintFinding} from './lintProtocol';

export interface LintWorker {
	onmessage: ((event: MessageEvent<LintResponse>) => void) | null;
	postMessage(request: LintRequest): void;
	terminate(): void;
}

export type LintRunner = (blueprint: BlueprintString, signal?: AbortSignal) => Promise<LocatedLintFinding[]>;

interface PendingRequest {
	resolve(findings: LocatedLintFinding[]): void;
	reject(error: Error): void;
}

function abortError(): Error {
	return new DOMException('Linting was cancelled.', 'AbortError');
}

/**
 * Lints on one lazily created worker. Aborting a request terminates the worker,
 * because a worker busy with a huge blueprint cannot be interrupted any other way.
 */
export function createWorkerLintRunner(createWorker: () => LintWorker): LintRunner {
	let worker: LintWorker | undefined;
	let nextId = 0;
	const pending = new Map<number, PendingRequest>();

	function stopWorker(): void {
		worker?.terminate();
		worker = undefined;
		for (const request of pending.values()) {
			request.reject(abortError());
		}
		pending.clear();
	}

	function startedWorker(): LintWorker {
		if (worker) return worker;
		const created = createWorker();
		created.onmessage = ({data}) => {
			const request = pending.get(data.id);
			if (!request) return;
			pending.delete(data.id);
			if ('error' in data) {
				request.reject(new Error(data.error));
			} else {
				request.resolve(data.findings);
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
		const result = new Promise<LocatedLintFinding[]>((resolve, reject) => {
			pending.set(id, {resolve, reject});
		});
		signal?.addEventListener('abort', onAbort, {once: true});
		startedWorker().postMessage({id, blueprint});
		try {
			return await result;
		} finally {
			signal?.removeEventListener('abort', onAbort);
		}
	};
}

export const runLint: LintRunner =
	typeof Worker === 'undefined'
		? // Without workers, as under jsdom, lint on a later microtask so callers still see a pending state.
			async (blueprint) => Promise.resolve().then(() => lintBlueprintTree(blueprint))
		: createWorkerLintRunner(() => new Worker(new URL('./lintWorker.ts', import.meta.url), {type: 'module'}));
