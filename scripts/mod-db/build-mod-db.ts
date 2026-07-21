import {gzipSync} from 'node:zlib';
import {mkdir, readFile, writeFile} from 'node:fs/promises';

import {FACTORIOLAB_COMMIT, FACTORIOLAB_DATASETS} from './sources';
import {
	parseBaseSupplement,
	parseFactorioLabDataset,
	parsePrefixes,
	transformDatasets,
	type FactorioLabDataset,
} from './transform';

const OUTPUT_URL = new URL('../../src/generated/mod-db.json', import.meta.url);

async function fetchDataset(id: string): Promise<FactorioLabDataset> {
	const url = `https://raw.githubusercontent.com/factoriolab/factoriolab/${FACTORIOLAB_COMMIT}/public/data/${id}/data.json`;
	const response = await fetch(url);
	if (!response.ok) {
		throw new Error(`FactorioLab dataset ${id} returned ${response.status.toString()} ${response.statusText}.`);
	}
	const data: unknown = await response.json();
	return parseFactorioLabDataset(data);
}

async function readJson(url: URL): Promise<unknown> {
	return JSON.parse(await readFile(url, 'utf8')) as unknown;
}

const datasets = new Map(
	await Promise.all(FACTORIOLAB_DATASETS.map(async ({id}) => [id, await fetchDataset(id)] as const)),
);
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

const supplement = parseBaseSupplement(await readJson(new URL('base-supplement.json', import.meta.url)));
const prefixes = parsePrefixes(await readJson(new URL('prefix-heuristics.json', import.meta.url)));
const database = transformDatasets({
	baseDatasets,
	spaceAgeDataset,
	supplement,
	prefixes,
	generatedAt: new Date().toISOString().slice(0, 10),
	factoriolabCommit: FACTORIOLAB_COMMIT,
});
const output = `${JSON.stringify(database, undefined, '\t')}\n`;

await mkdir(new URL('.', OUTPUT_URL), {recursive: true});
await writeFile(OUTPUT_URL, output, 'utf8');

console.log(`Generated ${Object.keys(database.names).length.toString()} names from FactorioLab ${FACTORIOLAB_COMMIT}.`);
console.log(
	`${Buffer.byteLength(output).toLocaleString()} bytes raw; ${gzipSync(output).byteLength.toLocaleString()} bytes gzip.`,
);
