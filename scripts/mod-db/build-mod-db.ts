import {gzipSync} from 'node:zlib';
import {mkdir, readFile, writeFile} from 'node:fs/promises';

import {FACTORIO_DATA_PROTOTYPE_FILES, FACTORIOLAB_DATASETS, parseSourceLock} from './sources';
import {
	extractHiddenPlaceResults,
	extractPrototypeNames,
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

async function fetchPrototypeNames(root: string, files: readonly string[]): Promise<string[]> {
	const sources = await Promise.all(files.map(async (file) => fetchText(`${root}/${file}`, `Factorio ${file}`)));
	return [...new Set(sources.flatMap((source) => extractPrototypeNames(source)))].sort();
}

async function readJson(url: URL): Promise<unknown> {
	return JSON.parse(await readFile(url, 'utf8')) as unknown;
}

const sourceLock = parseSourceLock(await readJson(SOURCE_LOCK_URL));
const factorioDataRoot = `https://raw.githubusercontent.com/wube/factorio-data/${sourceLock.factorioData.commit}`;
const [
	datasetEntries,
	baseItemSource,
	spaceAgeItemSource,
	basePrototypeNames,
	spaceAgePrototypeNames,
	qualityPrototypeNames,
] = await Promise.all([
	Promise.all(
		FACTORIOLAB_DATASETS.map(async ({id}) => [id, await fetchDataset(id, sourceLock.factorioLab.commit)] as const),
	),
	fetchText(`${factorioDataRoot}/base/prototypes/item.lua`, 'Factorio base item prototypes'),
	fetchText(`${factorioDataRoot}/space-age/prototypes/item.lua`, 'Factorio Space Age item prototypes'),
	fetchPrototypeNames(factorioDataRoot, FACTORIO_DATA_PROTOTYPE_FILES.base),
	fetchPrototypeNames(factorioDataRoot, FACTORIO_DATA_PROTOTYPE_FILES.spaceAge),
	fetchPrototypeNames(factorioDataRoot, FACTORIO_DATA_PROTOTYPE_FILES.quality),
]);
const datasets = new Map(datasetEntries);
for (const [id, dataset] of datasets) {
	const source = FACTORIOLAB_DATASETS.find((candidate) => candidate.id === id);
	const isCurrentRelease = source?.role === 'base' || source?.role === 'space-age';
	if (isCurrentRelease && dataset.version.base !== sourceLock.factorioData.version) {
		throw new Error(
			`FactorioLab dataset ${id} uses Factorio ${dataset.version.base}, expected ${sourceLock.factorioData.version}.`,
		);
	}
}
function datasetsWithRole(role: (typeof FACTORIOLAB_DATASETS)[number]['role']): FactorioLabDataset[] {
	return FACTORIOLAB_DATASETS.filter((source) => source.role === role).map(({id}) => {
		const dataset = datasets.get(id);
		if (dataset === undefined) {
			throw new Error(`Missing fetched FactorioLab dataset: ${id}`);
		}
		return dataset;
	});
}
const baseDatasets = datasetsWithRole('base');
const spaceAgeDatasets = datasetsWithRole('space-age');
const legacyDatasets = datasetsWithRole('legacy');
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
	spaceAgeDatasets,
	legacyDatasets,
	modDatasets,
	supplement,
	mapEditorNames: extractHiddenPlaceResults(baseItemSource),
	spaceAgeMapEditorNames: extractHiddenPlaceResults(spaceAgeItemSource),
	prototypeNames: {
		base: basePrototypeNames,
		spaceAge: spaceAgePrototypeNames,
		quality: qualityPrototypeNames,
	},
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
