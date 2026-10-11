import {describe, expect, test} from 'vite-plus/test';

import {deserializeBlueprint, serializeBlueprint} from '../../src/parsing/blueprintParser';
import type {BlueprintString} from '../../src/parsing/types';
import {
	answerBlueprintJob,
	type BlueprintJobRequest,
	type BlueprintJobResponse,
	type BlueprintJobWorker,
	createWorkerRunner,
	inlineRunner,
} from '../../src/workers/blueprintJobRunner';

const VERSION_2_0 = 562949958139904;

const labelled: BlueprintString = {blueprint: {item: 'blueprint', label: 'Smelting', version: VERSION_2_0}};
const encodedBook = serializeBlueprint({
	blueprint_book: {item: 'blueprint-book', version: VERSION_2_0, blueprints: [{index: 0, ...labelled}]},
});

function labelOf(blueprint: BlueprintString): string {
	const label = blueprint.blueprint?.label;
	if (label === undefined) throw new Error('No label.');
	return label;
}

// Records traffic and answers only when the test says so, like a busy worker thread.
class FakeWorker implements BlueprintJobWorker<string> {
	onmessage: ((event: MessageEvent<BlueprintJobResponse<string>>) => void) | null = null;
	readonly requests: BlueprintJobRequest[] = [];
	terminated = false;

	postMessage(request: BlueprintJobRequest): void {
		this.requests.push(request);
	}

	terminate(): void {
		this.terminated = true;
	}

	respond(response: BlueprintJobResponse<string>): void {
		this.onmessage?.({data: response} as MessageEvent<BlueprintJobResponse<string>>);
	}

	answer(index: number): void {
		this.respond(answerBlueprintJob(this.requests[index], labelOf));
	}
}

function runnerWithFakes() {
	const workers: FakeWorker[] = [];
	const run = createWorkerRunner(() => {
		const worker = new FakeWorker();
		workers.push(worker);
		return worker;
	});
	return {run, workers};
}

async function outcome(promise: Promise<unknown>): Promise<unknown> {
	return promise.then(
		(value) => ({value}),
		(error: unknown) => ({error: (error as Error).name, message: (error as Error).message}),
	);
}

describe('answerBlueprintJob', () => {
	test('answers with the computed result for the request id', () => {
		expect(answerBlueprintJob({id: 7, blueprint: labelled}, labelOf)).toStrictEqual({id: 7, result: 'Smelting'});
	});

	test('answers with the error message when the computation throws', () => {
		expect(answerBlueprintJob({id: 3, blueprint: {}}, labelOf)).toStrictEqual({id: 3, error: 'No label.'});
	});

	test('decodes a request that carries the encoded source and selection path', () => {
		expect(answerBlueprintJob({id: 5, source: {encoded: encodedBook, path: '1'}}, labelOf)).toStrictEqual({
			id: 5,
			result: 'Smelting',
		});
	});

	test('answers with an error when the selection path is not in the source', () => {
		expect(answerBlueprintJob({id: 6, source: {encoded: encodedBook, path: '2'}}, labelOf)).toStrictEqual({
			id: 6,
			error: 'Invalid path 2: index 2 is out of bounds at 2 (valid range: 1-1)',
		});
	});
});

describe('createWorkerRunner', () => {
	test('creates the worker lazily and resolves with the result the worker sends back', async () => {
		const {run, workers} = runnerWithFakes();
		const before = workers.length;

		const result = run(labelled);
		workers[0]?.answer(0);

		expect({before, result: await result, workers: workers.length}).toStrictEqual({
			before: 0,
			result: 'Smelting',
			workers: 1,
		});
	});

	test('reuses one worker for consecutive requests', async () => {
		const {run, workers} = runnerWithFakes();

		const first = run(labelled);
		workers[0]?.answer(0);
		await first;
		const second = run(labelled);
		workers[0]?.answer(1);

		expect({
			second: await second,
			ids: workers[0]?.requests.map(({id}) => id),
			workers: workers.length,
		}).toStrictEqual({second: 'Smelting', ids: [0, 1], workers: 1});
	});

	test('aborting terminates the busy worker so the next request starts on a fresh one', async () => {
		const {run, workers} = runnerWithFakes();
		const controller = new AbortController();

		const abandoned = run(labelled, controller.signal);
		controller.abort();
		const next = run(labelled);
		workers[1]?.answer(0);

		expect({
			abandoned: await outcome(abandoned),
			next: await next,
			terminated: workers.map((worker) => worker.terminated),
		}).toStrictEqual({
			abandoned: {error: 'AbortError', message: 'The blueprint job was cancelled.'},
			next: 'Smelting',
			terminated: [true, false],
		});
	});

	test('rejects at once when the signal is already aborted, without starting a worker', async () => {
		const {run, workers} = runnerWithFakes();

		const result = await outcome(run(labelled, AbortSignal.abort()));

		expect({result, workers: workers.length}).toStrictEqual({
			result: {error: 'AbortError', message: 'The blueprint job was cancelled.'},
			workers: 0,
		});
	});

	test('aborting a request that already finished leaves the worker and later requests alone', async () => {
		const {run, workers} = runnerWithFakes();
		const controller = new AbortController();

		const finished = run(labelled, controller.signal);
		workers[0]?.answer(0);
		await finished;
		const running = run(labelled);
		controller.abort();
		workers[0]?.answer(1);

		expect({running: await running, terminated: workers.map((worker) => worker.terminated)}).toStrictEqual({
			running: 'Smelting',
			terminated: [false],
		});
	});

	test('posts the encoded source instead of the parsed blueprint when it has one', async () => {
		const {run, workers} = runnerWithFakes();
		const child = deserializeBlueprint(encodedBook).blueprint_book?.blueprints?.at(0);

		const result = run(child ?? {});
		workers[0]?.answer(0);

		expect({result: await result, requests: workers[0]?.requests}).toStrictEqual({
			result: 'Smelting',
			requests: [{id: 0, source: {encoded: encodedBook, path: '1'}}],
		});
	});

	test('rejects when the worker reports an error', async () => {
		const {run, workers} = runnerWithFakes();

		const failed = run({});
		workers[0]?.answer(0);

		expect(await outcome(failed)).toStrictEqual({error: 'Error', message: 'No label.'});
	});
});

describe('inlineRunner', () => {
	test('computes on a later microtask so callers still see a pending state', async () => {
		const run = inlineRunner(labelOf);
		let settled = false;

		const result = run(labelled).then((value) => {
			settled = true;
			return value;
		});
		const settledSynchronously = settled;

		expect({settledSynchronously, result: await result}).toStrictEqual({
			settledSynchronously: false,
			result: 'Smelting',
		});
	});

	test('rejects when the computation throws', async () => {
		expect(await outcome(inlineRunner(labelOf)({}))).toStrictEqual({error: 'Error', message: 'No label.'});
	});
});
