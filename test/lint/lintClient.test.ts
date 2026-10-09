import {describe, expect, test} from 'vite-plus/test';

import {createWorkerLintRunner, type LintWorker} from '../../src/lint/lintClient';
import {handleLintRequest, type LintRequest, type LintResponse} from '../../src/lint/lintProtocol';
import type {BlueprintString} from '../../src/parsing/types';

const VERSION_2_0 = 562949958139904;

const emptyBlueprint: BlueprintString = {blueprint: {item: 'blueprint', version: VERSION_2_0}};
const emptyFinding = {
	ruleId: 'empty-blueprint',
	severity: 'info',
	message: 'Blueprint contains no entities or tiles.',
	entityNumbers: [],
	path: '',
	blueprintLabel: undefined,
	entity: undefined,
};

// Records traffic and answers only when the test says so, like a busy worker thread.
class FakeWorker implements LintWorker {
	onmessage: ((event: MessageEvent<LintResponse>) => void) | null = null;
	readonly requests: LintRequest[] = [];
	terminated = false;

	postMessage(request: LintRequest): void {
		this.requests.push(request);
	}

	terminate(): void {
		this.terminated = true;
	}

	respond(response: LintResponse): void {
		this.onmessage?.({data: response} as MessageEvent<LintResponse>);
	}

	answerAll(): void {
		for (const request of this.requests) {
			this.respond(handleLintRequest(request));
		}
	}
}

function runnerWithFakes() {
	const workers: FakeWorker[] = [];
	const runLint = createWorkerLintRunner(() => {
		const worker = new FakeWorker();
		workers.push(worker);
		return worker;
	});
	return {runLint, workers};
}

describe('handleLintRequest', () => {
	test('answers with the findings for the requested blueprint', () => {
		expect(handleLintRequest({id: 7, blueprint: emptyBlueprint})).toStrictEqual({id: 7, findings: [emptyFinding]});
	});

	test('lints every blueprint in a book and says where each finding is', () => {
		const book: BlueprintString = {
			blueprint_book: {
				item: 'blueprint-book',
				version: VERSION_2_0,
				blueprints: [
					{
						index: 0,
						blueprint: {
							item: 'blueprint',
							label: 'Inserters',
							version: VERSION_2_0,
							entities: [
								{
									entity_number: 1,
									name: 'inserter',
									position: {x: 0.5, y: 0.5},
									direction: 4,
									quality: 'rare',
								},
								{entity_number: 2, name: 'wooden-chest', position: {x: -50.5, y: -50.5}},
								{entity_number: 3, name: 'wooden-chest', position: {x: 50.5, y: 50.5}},
							],
						},
					},
					{
						index: 1,
						blueprint_book: {
							item: 'blueprint-book',
							version: VERSION_2_0,
							blueprints: [
								{index: 0, blueprint: {item: 'blueprint', label: 'Empty', version: VERSION_2_0}},
							],
						},
					},
				],
			},
		};

		expect(handleLintRequest({id: 1, blueprint: book})).toStrictEqual({
			id: 1,
			findings: [
				{
					ruleId: 'inserter-facing-nothing',
					severity: 'warning',
					message: 'Inserter "inserter" at (0.5, 0.5) has no pickup or drop target.',
					entityNumbers: [1],
					path: '1',
					blueprintLabel: 'Inserters',
					entity: {name: 'inserter', quality: 'rare', position: {x: 0.5, y: 0.5}},
				},
				{...emptyFinding, path: '2.1', blueprintLabel: 'Empty'},
			],
		});
	});
});

describe('createWorkerLintRunner', () => {
	test('creates the worker lazily and resolves with the findings the worker sends back', async () => {
		const {runLint, workers} = runnerWithFakes();
		expect(workers).toStrictEqual([]);

		const findings = runLint(emptyBlueprint);
		workers[0]?.answerAll();

		expect({findings: await findings, workers: workers.length}).toStrictEqual({
			findings: [emptyFinding],
			workers: 1,
		});
	});

	test('reuses one worker for consecutive requests', async () => {
		const {runLint, workers} = runnerWithFakes();

		const first = runLint(emptyBlueprint);
		workers[0]?.answerAll();
		await first;
		const second = runLint(emptyBlueprint);
		workers[0]?.respond(handleLintRequest(workers[0].requests[1]));

		expect({second: await second, workers: workers.length}).toStrictEqual({second: [emptyFinding], workers: 1});
	});

	test('aborting terminates the busy worker so the next request starts on a fresh one', async () => {
		const {runLint, workers} = runnerWithFakes();
		const controller = new AbortController();

		const abandoned = runLint(emptyBlueprint, controller.signal);
		controller.abort();
		const next = runLint(emptyBlueprint);
		workers[1]?.answerAll();

		expect({
			abandoned: await abandoned.then(
				() => 'resolved',
				(error: unknown) => (error as Error).name,
			),
			next: await next,
			terminated: workers.map((worker) => worker.terminated),
		}).toStrictEqual({abandoned: 'AbortError', next: [emptyFinding], terminated: [true, false]});
	});

	test('aborting a request that already finished leaves the worker and later requests alone', async () => {
		const {runLint, workers} = runnerWithFakes();
		const controller = new AbortController();

		const finished = runLint(emptyBlueprint, controller.signal);
		workers[0]?.answerAll();
		await finished;
		const running = runLint(emptyBlueprint);
		controller.abort();
		workers[0]?.respond(handleLintRequest(workers[0].requests[1]));

		expect({running: await running, terminated: workers.map((worker) => worker.terminated)}).toStrictEqual({
			running: [emptyFinding],
			terminated: [false],
		});
	});

	test('rejects when the worker reports an error', async () => {
		const {runLint, workers} = runnerWithFakes();

		const failed = runLint(emptyBlueprint);
		workers[0]?.respond({id: workers[0].requests[0]?.id ?? -1, error: 'boom'});

		await expect(failed).rejects.toThrow('boom');
	});
});
