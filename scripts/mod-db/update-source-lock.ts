import {readFile, writeFile} from 'node:fs/promises';

import {z} from 'zod';

import {parseSourceLock} from './sources';

const SOURCE_LOCK_URL = new URL('source-lock.json', import.meta.url);
const FACTORIOLAB_REPOSITORY = 'factoriolab/factoriolab';
const FACTORIO_DATA_REPOSITORY = 'wube/factorio-data';

const commitSchema = z.object({
	sha: z.string().regex(/^[0-9a-f]{40}$/),
	commit: z.object({committer: z.object({date: z.iso.datetime()})}),
});
const commitsSchema = z.array(commitSchema).min(1);

const referenceSchema = z.object({
	object: z.object({
		sha: z.string().regex(/^[0-9a-f]{40}$/),
		type: z.enum(['commit', 'tag']),
	}),
});

const tagSchema = z.object({
	object: z.object({
		sha: z.string().regex(/^[0-9a-f]{40}$/),
		type: z.enum(['commit', 'tag']),
	}),
});

const datasetVersionSchema = z.object({version: z.object({base: z.string().regex(/^\d+\.\d+\.\d+$/)})});

function githubHeaders(): Record<string, string> {
	const headers: Record<string, string> = {
		Accept: 'application/vnd.github+json',
		'X-GitHub-Api-Version': '2022-11-28',
	};
	const token = process.env.GITHUB_TOKEN;
	if (token !== undefined && token !== '') {
		headers.Authorization = `Bearer ${token}`;
	}
	return headers;
}

async function fetchJson(url: string, label: string): Promise<unknown> {
	const response = await fetch(url, {headers: url.startsWith('https://api.github.com/') ? githubHeaders() : {}});
	if (!response.ok) {
		throw new Error(`${label} returned ${response.status.toString()} ${response.statusText}.`);
	}
	const value: unknown = await response.json();
	return value;
}

async function resolveFactorioDataCommit(version: string): Promise<string> {
	const reference = referenceSchema.parse(
		await fetchJson(
			`https://api.github.com/repos/${FACTORIO_DATA_REPOSITORY}/git/ref/tags/${version}`,
			`Factorio data tag ${version}`,
		),
	);
	let object = reference.object;
	while (object.type === 'tag') {
		object = tagSchema.parse(
			await fetchJson(
				`https://api.github.com/repos/${FACTORIO_DATA_REPOSITORY}/git/tags/${object.sha}`,
				`Factorio data annotated tag ${object.sha}`,
			),
		).object;
	}
	return object.sha;
}

const latestCommit = commitsSchema.parse(
	await fetchJson(
		`https://api.github.com/repos/${FACTORIOLAB_REPOSITORY}/commits?path=public/data&per_page=1`,
		'latest FactorioLab data commit',
	),
)[0];
const versionDatasets = await Promise.all(
	['2.0', '2.1', 'spa'].map(async (dataset) =>
		datasetVersionSchema.parse(
			await fetchJson(
				`https://raw.githubusercontent.com/${FACTORIOLAB_REPOSITORY}/${latestCommit.sha}/public/data/${dataset}/data.json`,
				`FactorioLab ${dataset} dataset`,
			),
		),
	),
);
const factorioVersions = new Set(versionDatasets.map((dataset) => dataset.version.base));
if (factorioVersions.size !== 1) {
	throw new Error(`FactorioLab datasets disagree on the Factorio version: ${[...factorioVersions].join(', ')}.`);
}
const factorioVersion = [...factorioVersions][0];

const sourceLock = parseSourceLock({
	factorioLab: {
		commit: latestCommit.sha,
		committedAt: latestCommit.commit.committer.date,
	},
	factorioData: {
		version: factorioVersion,
		commit: await resolveFactorioDataCommit(factorioVersion),
	},
});
const previousSourceLock = parseSourceLock(JSON.parse(await readFile(SOURCE_LOCK_URL, 'utf8')) as unknown);
await writeFile(SOURCE_LOCK_URL, `${JSON.stringify(sourceLock, undefined, '\t')}\n`, 'utf8');

if (JSON.stringify(previousSourceLock) === JSON.stringify(sourceLock)) {
	console.log('Mod database source lock is current.');
} else {
	console.log(`Updated mod database sources to FactorioLab ${sourceLock.factorioLab.commit}.`);
	console.log(`Pinned Factorio data ${sourceLock.factorioData.version} at ${sourceLock.factorioData.commit}.`);
}
