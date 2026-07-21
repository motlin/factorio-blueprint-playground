import {z} from 'zod';

import type {ModDatabase} from '../../src/parsing/modDetection/types';
import {EDITOR_SOURCES, FACTORIOLAB_LICENSE, MOD_SOURCES} from './sources';

const prototypeSchema = z.object({id: z.string().min(1)});

const factorioLabDatasetSchema = z.object({
	version: z.record(z.string(), z.string()),
	items: z.array(prototypeSchema),
	recipes: z.array(prototypeSchema),
	locations: z
		.array(prototypeSchema)
		.nullish()
		.transform((locations) => locations ?? []),
	qualities: z
		.array(prototypeSchema)
		.nullish()
		.transform((qualities) => qualities ?? []),
});

const baseSupplementSchema = z.object({
	base: z.array(z.string().min(1)),
	spaceAge: z.array(z.string().min(1)),
	quality: z.array(z.string().min(1)),
	elevatedRails: z.array(z.string().min(1)),
	mapEditor: z.array(z.string().min(1)),
	spaceAgeMapEditor: z.array(z.string().min(1)),
});

const prefixesSchema = z.record(z.string().min(1), z.string().min(1));

export type FactorioLabDataset = z.infer<typeof factorioLabDatasetSchema>;

export interface BaseSupplement {
	base: string[];
	spaceAge: string[];
	quality: string[];
	elevatedRails: string[];
	mapEditor: string[];
	spaceAgeMapEditor: string[];
}

interface TransformInput {
	baseDatasets: FactorioLabDataset[];
	spaceAgeDataset: FactorioLabDataset;
	modDatasets: {
		id: string;
		label: string;
		dataset: FactorioLabDataset;
	}[];
	supplement: BaseSupplement;
	prefixes: Record<string, string>;
	generatedAt: string;
	factoriolabCommit: string;
}

export function parseFactorioLabDataset(value: unknown): FactorioLabDataset {
	return factorioLabDatasetSchema.parse(value);
}

export function parseBaseSupplement(value: unknown): BaseSupplement {
	return baseSupplementSchema.parse(value);
}

export function parsePrefixes(value: unknown): Record<string, string> {
	return prefixesSchema.parse(value);
}

function collectNames(dataset: FactorioLabDataset): Set<string> {
	return new Set(
		[...dataset.items, ...dataset.recipes, ...dataset.locations, ...dataset.qualities].map(
			(prototype) => prototype.id,
		),
	);
}

function sourceMask(sources: ModDatabase['sources'], sourceId: string): number {
	const sourceIndex = sources.findIndex((source) => source.id === sourceId);
	if (sourceIndex < 0) {
		throw new Error(`Unknown mod source: ${sourceId}`);
	}
	return 1 << sourceIndex;
}

function addNames(names: Map<string, number>, additions: Iterable<string>, mask: number): void {
	for (const name of additions) {
		names.set(name, (names.get(name) ?? 0) | mask);
	}
}

function sortedRecord<Value>(entries: Iterable<readonly [string, Value]>): Record<string, Value> {
	return Object.fromEntries([...entries].sort(([left], [right]) => left.localeCompare(right)));
}

function isElevatedRailsName(name: string): boolean {
	return name === 'rail-ramp' || name === 'rail-support' || name.startsWith('elevated-');
}

export function transformDatasets(input: TransformInput): ModDatabase {
	const sources = [
		...MOD_SOURCES,
		...input.modDatasets.map(({id, label, dataset}) => ({
			id,
			label,
			mods: sortedRecord(Object.entries(dataset.version).filter(([modName]) => modName !== 'base')),
		})),
		...EDITOR_SOURCES,
	];
	const mapEditorNames = new Set(input.supplement.mapEditor);
	const spaceAgeMapEditorNames = new Set(input.supplement.spaceAgeMapEditor);
	const allMapEditorNames = new Set([...mapEditorNames, ...spaceAgeMapEditorNames]);
	const baseNames = new Set(input.supplement.base);
	for (const dataset of input.baseDatasets) {
		for (const name of collectNames(dataset)) {
			if (!allMapEditorNames.has(name)) {
				baseNames.add(name);
			}
		}
	}

	const spaceAgeNames = collectNames(input.spaceAgeDataset);
	for (const name of allMapEditorNames) {
		spaceAgeNames.delete(name);
	}
	const qualityNames = new Set(input.spaceAgeDataset.qualities.map((quality) => quality.id));
	const names = new Map<string, number>();
	addNames(names, baseNames, sourceMask(sources, 'base'));

	for (const name of spaceAgeNames) {
		if (baseNames.has(name)) {
			continue;
		}
		if (qualityNames.has(name) || name.startsWith('quality-module')) {
			addNames(names, [name], sourceMask(sources, 'quality'));
		} else if (isElevatedRailsName(name)) {
			addNames(names, [name], sourceMask(sources, 'elevated-rails'));
		} else {
			addNames(names, [name], sourceMask(sources, 'space-age'));
		}
	}

	addNames(names, input.supplement.spaceAge, sourceMask(sources, 'space-age'));
	addNames(names, input.supplement.quality, sourceMask(sources, 'quality'));
	addNames(names, input.supplement.elevatedRails, sourceMask(sources, 'elevated-rails'));
	addNames(names, mapEditorNames, sourceMask(sources, 'map-editor'));
	addNames(names, spaceAgeMapEditorNames, sourceMask(sources, 'space-age-map-editor'));

	const vanillaNames = new Set([
		...baseNames,
		...spaceAgeNames,
		...input.supplement.spaceAge,
		...input.supplement.quality,
		...input.supplement.elevatedRails,
		...mapEditorNames,
		...spaceAgeMapEditorNames,
	]);
	for (const {id, dataset} of input.modDatasets) {
		const exclusiveNames = [...collectNames(dataset)].filter((name) => !vanillaNames.has(name));
		addNames(names, exclusiveNames, sourceMask(sources, id));
	}

	return {
		generatedAt: input.generatedAt,
		factoriolabCommit: input.factoriolabCommit,
		license: FACTORIOLAB_LICENSE,
		sources,
		names: sortedRecord(names),
		prefixes: sortedRecord(Object.entries(input.prefixes)),
	};
}
