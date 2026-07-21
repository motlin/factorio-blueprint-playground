import {z} from 'zod';

import type {ModDatabase} from '../../src/parsing/modDetection/types';
import {FACTORIOLAB_LICENSE, MOD_SOURCES} from './sources';

const prototypeSchema = z.object({id: z.string().min(1)});

const factorioLabDatasetSchema = z.object({
	version: z.record(z.string(), z.string()),
	items: z.array(prototypeSchema),
	recipes: z.array(prototypeSchema),
	locations: z.array(prototypeSchema),
	qualities: z.array(prototypeSchema).optional(),
});

const baseSupplementSchema = z.object({
	base: z.array(z.string().min(1)),
	spaceAge: z.array(z.string().min(1)),
	quality: z.array(z.string().min(1)),
	elevatedRails: z.array(z.string().min(1)),
});

const prefixesSchema = z.record(z.string().min(1), z.string().min(1));

export type FactorioLabDataset = z.infer<typeof factorioLabDatasetSchema>;

export interface BaseSupplement {
	base: string[];
	spaceAge: string[];
	quality: string[];
	elevatedRails: string[];
}

interface TransformInput {
	baseDatasets: FactorioLabDataset[];
	spaceAgeDataset: FactorioLabDataset;
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
		[...dataset.items, ...dataset.recipes, ...dataset.locations, ...(dataset.qualities ?? [])].map(
			(prototype) => prototype.id,
		),
	);
}

function sourceMask(sourceId: string): number {
	const sourceIndex = MOD_SOURCES.findIndex((source) => source.id === sourceId);
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
	const baseNames = new Set(input.supplement.base);
	for (const dataset of input.baseDatasets) {
		for (const name of collectNames(dataset)) {
			baseNames.add(name);
		}
	}

	const spaceAgeNames = collectNames(input.spaceAgeDataset);
	const qualityNames = new Set(input.spaceAgeDataset.qualities?.map((quality) => quality.id) ?? []);
	const names = new Map<string, number>();
	addNames(names, baseNames, sourceMask('base'));

	for (const name of spaceAgeNames) {
		if (baseNames.has(name)) {
			continue;
		}
		if (qualityNames.has(name) || name.startsWith('quality-module')) {
			addNames(names, [name], sourceMask('quality'));
		} else if (isElevatedRailsName(name)) {
			addNames(names, [name], sourceMask('elevated-rails'));
		} else {
			addNames(names, [name], sourceMask('space-age'));
		}
	}

	addNames(names, input.supplement.spaceAge, sourceMask('space-age'));
	addNames(names, input.supplement.quality, sourceMask('quality'));
	addNames(names, input.supplement.elevatedRails, sourceMask('elevated-rails'));

	return {
		generatedAt: input.generatedAt,
		factoriolabCommit: input.factoriolabCommit,
		license: FACTORIOLAB_LICENSE,
		sources: MOD_SOURCES,
		names: sortedRecord(names),
		prefixes: sortedRecord(Object.entries(input.prefixes)),
	};
}
