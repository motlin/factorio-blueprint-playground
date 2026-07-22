import {gzipSync} from 'node:zlib';
import {mkdir, readFile, writeFile} from 'node:fs/promises';

import {FACTORIOLAB_DATASETS, parseSourceLock} from './sources';
import {
	extractHiddenPlaceResults,
	parseBaseSupplement,
	parseFactorioLabDataset,
	parsePrefixes,
	transformDatasets,
	type FactorioLabDataset,
} from './transform';

const OUTPUT_URL = new URL('../../src/generated/mod-db.json', import.meta.url);
const SOURCE_LOCK_URL = new URL('source-lock.json', import.meta.url);

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

async function readJson(url: URL): Promise<unknown> {
	return JSON.parse(await readFile(url, 'utf8')) as unknown;
}

const sourceLock = parseSourceLock(await readJson(SOURCE_LOCK_URL));
const factorioDataRoot = `https://raw.githubusercontent.com/wube/factorio-data/${sourceLock.factorioData.commit}`;
const [datasetEntries, baseItemSource, spaceAgeItemSource] = await Promise.all([
	Promise.all(
		FACTORIOLAB_DATASETS.map(async ({id}) => [id, await fetchDataset(id, sourceLock.factorioLab.commit)] as const),
	),
	fetchText(`${factorioDataRoot}/base/prototypes/item.lua`, 'Factorio base item prototypes'),
	fetchText(`${factorioDataRoot}/space-age/prototypes/item.lua`, 'Factorio Space Age item prototypes'),
]);
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

await mkdir(new URL('.', OUTPUT_URL), {recursive: true});
await writeFile(OUTPUT_URL, output, 'utf8');

console.log(
	`Generated ${Object.keys(database.names).length.toString()} names from FactorioLab ${sourceLock.factorioLab.commit} and Factorio ${sourceLock.factorioData.version}.`,
);
console.log(
	`${Buffer.byteLength(output).toLocaleString()} bytes raw; ${gzipSync(output).byteLength.toLocaleString()} bytes gzip.`,
);
