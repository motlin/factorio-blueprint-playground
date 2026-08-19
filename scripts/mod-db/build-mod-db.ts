import {gzipSync} from 'node:zlib';
import {mkdir, readFile, writeFile} from 'node:fs/promises';
import {z} from 'zod';

import {FACTORIOLAB_DATASETS, parseSourceLock} from './sources';
import {
	extractHiddenPlaceResults,
	extractPrototypeNames,
	extractPrototypeUpgrades,
	parseBaseSupplement,
	parseFactorioLabDataset,
	parsePrefixes,
	transformDatasets,
	type FactorioLabDataset,
} from './transform';

const OUTPUT_URL = new URL('../../src/generated/mod-db.json', import.meta.url);
const GAME_DATA_OUTPUT_URL = new URL('../../src/generated/game-data.json', import.meta.url);
const SOURCE_LOCK_URL = new URL('source-lock.json', import.meta.url);
const factorioDataTreeSchema = z.object({
	truncated: z.literal(false),
	tree: z.array(z.object({path: z.string(), type: z.string()})),
});

async function fetchDataset(id: string, commit: string): Promise<FactorioLabDataset> {
	const url = `https://raw.githubusercontent.com/factoriolab/factoriolab/${commit}/public/data/${id}/data.json`;
	const response = await fetch(url);
	if (!response.ok) {
		throw new Error(`FactorioLab dataset ${id} returned ${response.status.toString()} ${response.statusText}.`);
	}
	const data: unknown = await response.json();
	return parseFactorioLabDataset(data);
}

async function fetchText(url: string, label: string): Promise<string> {
	const response = await fetch(url);
	if (!response.ok) {
		throw new Error(`${label} returned ${response.status.toString()} ${response.statusText}.`);
	}
	return response.text();
}

async function fetchFactorioDataSources(commit: string): Promise<Map<string, string>> {
	const headers: Record<string, string> = {
		Accept: 'application/vnd.github+json',
		'User-Agent': 'factorio-blueprint-playground',
	};
	const token = process.env.GITHUB_TOKEN;
	if (token !== undefined && token !== '') {
		headers.Authorization = `Bearer ${token}`;
	}
	const treeResponse = await fetch(
		`https://api.github.com/repos/wube/factorio-data/git/trees/${commit}?recursive=1`,
		{headers},
	);
	if (!treeResponse.ok) {
		throw new Error(`Factorio data tree returned ${treeResponse.status.toString()} ${treeResponse.statusText}.`);
	}
	const tree = factorioDataTreeSchema.parse(await treeResponse.json());
	const paths = tree.tree
		.filter((entry) => entry.type === 'blob' && entry.path.includes('/prototypes/') && entry.path.endsWith('.lua'))
		.map((entry) => entry.path)
		.sort();
	const sources = new Map<string, string>();
	const factorioDataRoot = `https://raw.githubusercontent.com/wube/factorio-data/${commit}`;
	const batchSize = 20;
	for (let start = 0; start < paths.length; start += batchSize) {
		const batch = paths.slice(start, start + batchSize);
		const fetched = await Promise.all(
			batch.map(async (path) => [path, await fetchText(`${factorioDataRoot}/${path}`, path)] as const),
		);
		for (const [path, source] of fetched) {
			sources.set(path, source);
		}
	}
	return sources;
}

async function readJson(url: URL): Promise<unknown> {
	return JSON.parse(await readFile(url, 'utf8')) as unknown;
}

const sourceLock = parseSourceLock(await readJson(SOURCE_LOCK_URL));
const [datasetEntries, factorioDataSources] = await Promise.all([
	Promise.all(
		FACTORIOLAB_DATASETS.map(async ({id}) => [id, await fetchDataset(id, sourceLock.factorioLab.commit)] as const),
	),
	fetchFactorioDataSources(sourceLock.factorioData.commit),
]);
const baseItemSource = factorioDataSources.get('base/prototypes/item.lua');
const spaceAgeItemSource = factorioDataSources.get('space-age/prototypes/item.lua');
if (baseItemSource === undefined || spaceAgeItemSource === undefined) {
	throw new Error('Factorio item prototype sources are missing.');
}
const datasets = new Map(datasetEntries);
for (const [id, dataset] of datasets) {
	const source = FACTORIOLAB_DATASETS.find((candidate) => candidate.id === id);
	if (source?.role !== 'mod' && dataset.version.base !== sourceLock.factorioData.version) {
		throw new Error(
			`FactorioLab dataset ${id} uses Factorio ${dataset.version.base}, expected ${sourceLock.factorioData.version}.`,
		);
	}
}
const baseDatasets = FACTORIOLAB_DATASETS.filter(({role}) => role === 'base').map(({id}) => {
	const dataset = datasets.get(id);
	if (dataset === undefined) {
		throw new Error(`Missing fetched FactorioLab dataset: ${id}`);
	}
	return dataset;
});
const spaceAgeDataset = datasets.get('spa');
if (spaceAgeDataset === undefined) {
	throw new Error('Missing fetched FactorioLab dataset: spa');
}
const modDatasets = FACTORIOLAB_DATASETS.flatMap((source) => {
	if (source.role !== 'mod') {
		return [];
	}
	const dataset = datasets.get(source.id);
	if (dataset === undefined) {
		throw new Error(`Missing fetched FactorioLab dataset: ${source.id}`);
	}
	return [{id: source.id, label: source.label, dataset}];
});

const supplement = parseBaseSupplement(await readJson(new URL('base-supplement.json', import.meta.url)));
const prefixes = parsePrefixes(await readJson(new URL('prefix-heuristics.json', import.meta.url)));
const database = transformDatasets({
	baseDatasets,
	spaceAgeDataset,
	modDatasets,
	supplement,
	mapEditorNames: extractHiddenPlaceResults(baseItemSource),
	spaceAgeMapEditorNames: extractHiddenPlaceResults(spaceAgeItemSource),
	prefixes,
	generatedAt: sourceLock.factorioLab.committedAt.slice(0, 10),
	factoriolabCommit: sourceLock.factorioLab.commit,
	factorioDataVersion: sourceLock.factorioData.version,
});
const output = `${JSON.stringify(database, undefined, '\t')}\n`;
const nextUpgrades = extractPrototypeUpgrades([...factorioDataSources.values()]);
const virtualSignals = extractPrototypeNames([...factorioDataSources.values()], 'virtual-signal');
const gameDataOutput = `${JSON.stringify(
	{
		factorioDataVersion: sourceLock.factorioData.version,
		nextUpgrades,
		virtualSignals,
	},
	undefined,
	'\t',
)}\n`;

await mkdir(new URL('.', OUTPUT_URL), {recursive: true});
await Promise.all([writeFile(OUTPUT_URL, output, 'utf8'), writeFile(GAME_DATA_OUTPUT_URL, gameDataOutput, 'utf8')]);

console.log(
	`Generated ${Object.keys(database.names).length.toString()} names from FactorioLab ${sourceLock.factorioLab.commit} and Factorio ${sourceLock.factorioData.version}.`,
);
console.log(
	`${Buffer.byteLength(output).toLocaleString()} bytes raw; ${gzipSync(output).byteLength.toLocaleString()} bytes gzip.`,
);
console.log(
	`Generated ${nextUpgrades.length.toString()} native next-upgrade mappings from Factorio ${sourceLock.factorioData.version}.`,
);
console.log(`Generated ${virtualSignals.length.toString()} virtual signals for the replacement picker.`);
