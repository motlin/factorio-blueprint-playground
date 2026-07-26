import {execFileSync} from 'node:child_process';
import {readFile, writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';

import {parseGameUiSourceLock, parseGameUiSpec} from './schema';
import {readPinnedGameUiSources, type GameUiSourceRepository} from './source-repository';
import {buildGameUiSpec, serializeGameUiSpec} from './transform';

const SOURCE_LOCK_URL = new URL('source-lock.json', import.meta.url);
const OUTPUT_URL = new URL('../../src/generated/game-ui-spec.json', import.meta.url);

interface Arguments {
	check: boolean;
	factorioRepository: string;
}

function parseArguments(values: readonly string[]): Arguments {
	let check = false;
	let factorioRepository = process.env.FACTORIO_SOURCE_REPOSITORY;
	for (let index = 0; index < values.length; index += 1) {
		const value = values[index];
		if (value === '--check') {
			check = true;
			continue;
		}
		if (value === '--factorio-repository') {
			factorioRepository = values[index + 1];
			index += 1;
			continue;
		}
		throw new Error(`Unknown game UI specification argument: ${value}`);
	}
	if (factorioRepository === undefined || factorioRepository === '') {
		throw new Error(
			'Set FACTORIO_SOURCE_REPOSITORY or pass --factorio-repository with the bare Factorio source repository.',
		);
	}
	return {check, factorioRepository: resolve(factorioRepository)};
}

function git(repository: string, arguments_: readonly string[]): string {
	return execFileSync('git', ['-C', repository, ...arguments_], {
		encoding: 'utf8',
		env: {...process.env, GIT_NO_LAZY_FETCH: '1'},
	}).trimEnd();
}

const arguments_ = parseArguments(process.argv.slice(2));
const sourceLock = parseGameUiSourceLock(JSON.parse(await readFile(SOURCE_LOCK_URL, 'utf8')) as unknown);
const repository: GameUiSourceRepository = {
	resolveCommit: (tag) => git(arguments_.factorioRepository, ['rev-parse', `refs/tags/${tag}^{commit}`]),
	resolveBlob: (commit, path) => git(arguments_.factorioRepository, ['rev-parse', `${commit}:${path}`]),
	readBlob: (blob) => git(arguments_.factorioRepository, ['cat-file', 'blob', blob]),
};
const sources = readPinnedGameUiSources(sourceLock, repository);

const output = serializeGameUiSpec(buildGameUiSpec(sourceLock, sources));
if (arguments_.check) {
	const currentOutput = await readFile(OUTPUT_URL, 'utf8');
	parseGameUiSpec(JSON.parse(currentOutput) as unknown);
	if (currentOutput !== output) {
		throw new Error('Generated game UI specification is stale. Run generate:game-ui-spec.');
	}
	console.log(`Verified deterministic Factorio ${sourceLock.sourceVersion} game UI specification.`);
} else {
	await writeFile(OUTPUT_URL, output, 'utf8');
	console.log(`Generated Factorio ${sourceLock.sourceVersion} game UI specification.`);
}
