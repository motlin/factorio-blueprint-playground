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
	modDatasets: {
		id: string;
		label: string;
		dataset: FactorioLabDataset;
	}[];
	supplement: BaseSupplement;
	mapEditorNames: string[];
	spaceAgeMapEditorNames: string[];
	prefixes: Record<string, string>;
	generatedAt: string;
	factoriolabCommit: string;
	factorioDataVersion: string;
}

enum LuaTokenKind {
	Identifier,
	String,
	OpeningBrace,
	ClosingBrace,
	Equals,
}

interface LuaToken {
	kind: LuaTokenKind;
	value: string;
}

interface LuaTableFrame {
	hidden: boolean;
	prototypeType: string | undefined;
	placeResults: Set<string>;
}

function longBracketClosing(source: string, start: number): {closing: string; contentStart: number} | undefined {
	if (source[start] !== '[') {
		return undefined;
	}
	let cursor = start + 1;
	while (source[cursor] === '=') {
		cursor += 1;
	}
	if (source[cursor] !== '[') {
		return undefined;
	}
	const equals = source.slice(start + 1, cursor);
	return {closing: `]${equals}]`, contentStart: cursor + 1};
}

function tokenizeLua(source: string): LuaToken[] {
	const tokens: LuaToken[] = [];
	let cursor = 0;
	while (cursor < source.length) {
		const character = source[cursor] ?? '';
		if (/\s/.test(character)) {
			cursor += 1;
			continue;
		}
		if (character === '-' && source[cursor + 1] === '-') {
			const blockComment = longBracketClosing(source, cursor + 2);
			if (blockComment === undefined) {
				const lineEnd = source.indexOf('\n', cursor + 2);
				cursor = lineEnd < 0 ? source.length : lineEnd + 1;
				continue;
			}
			const commentEnd = source.indexOf(blockComment.closing, blockComment.contentStart);
			if (commentEnd < 0) {
				throw new Error('Unterminated Lua block comment.');
			}
			cursor = commentEnd + blockComment.closing.length;
			continue;
		}
		if (character === '"' || character === "'") {
			const quote = character;
			let value = '';
			cursor += 1;
			while (cursor < source.length && source[cursor] !== quote) {
				if (source[cursor] === '\\') {
					cursor += 1;
					if (cursor >= source.length) {
						throw new Error('Unterminated Lua string escape.');
					}
				}
				value += source[cursor];
				cursor += 1;
			}
			if (source[cursor] !== quote) {
				throw new Error('Unterminated Lua string.');
			}
			tokens.push({kind: LuaTokenKind.String, value});
			cursor += 1;
			continue;
		}
		const longString = longBracketClosing(source, cursor);
		if (longString !== undefined) {
			const stringEnd = source.indexOf(longString.closing, longString.contentStart);
			if (stringEnd < 0) {
				throw new Error('Unterminated Lua long string.');
			}
			tokens.push({kind: LuaTokenKind.String, value: source.slice(longString.contentStart, stringEnd)});
			cursor = stringEnd + longString.closing.length;
			continue;
		}
		if (/[A-Za-z_]/.test(character)) {
			const start = cursor;
			cursor += 1;
			while (/[A-Za-z0-9_]/.test(source[cursor] ?? '')) {
				cursor += 1;
			}
			tokens.push({kind: LuaTokenKind.Identifier, value: source.slice(start, cursor)});
			continue;
		}
		if (character === '{') {
			tokens.push({kind: LuaTokenKind.OpeningBrace, value: character});
		} else if (character === '}') {
			tokens.push({kind: LuaTokenKind.ClosingBrace, value: character});
		} else if (character === '=') {
			tokens.push({kind: LuaTokenKind.Equals, value: character});
		}
		cursor += 1;
	}
	return tokens;
}

export function extractHiddenPlaceResults(source: string): string[] {
	const frames: LuaTableFrame[] = [];
	const placeResults = new Set<string>();
	const tokens = tokenizeLua(source);

	for (let index = 0; index < tokens.length; index += 1) {
		const token = tokens[index];
		if (token.kind === LuaTokenKind.OpeningBrace) {
			frames.push({hidden: false, prototypeType: undefined, placeResults: new Set()});
			continue;
		}
		if (token.kind === LuaTokenKind.ClosingBrace) {
			const frame = frames.pop();
			if (frame === undefined) {
				throw new Error('Unexpected closing brace in Lua source.');
			}
			if (frame.hidden && frame.prototypeType !== undefined) {
				for (const placeResult of frame.placeResults) {
					placeResults.add(placeResult);
				}
			}
			continue;
		}
		if (token.kind !== LuaTokenKind.Identifier || tokens[index + 1]?.kind !== LuaTokenKind.Equals) {
			continue;
		}
		const frame = frames.at(-1);
		const value = tokens.at(index + 2);
		if (frame === undefined || value === undefined) {
			continue;
		}
		if (token.value === 'hidden' && value.kind === LuaTokenKind.Identifier && value.value === 'true') {
			frame.hidden = true;
		} else if (token.value === 'type' && value.kind === LuaTokenKind.String) {
			frame.prototypeType = value.value;
		} else if (token.value === 'place_result' && value.kind === LuaTokenKind.String) {
			frame.placeResults.add(value.value);
		}
	}

	if (frames.length > 0) {
		throw new Error('Unclosed table in Lua source.');
	}
	return [...placeResults].sort();
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
	const mapEditorNames = new Set(input.mapEditorNames);
	const spaceAgeMapEditorNames = new Set(input.spaceAgeMapEditorNames);
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
		factorioDataVersion: input.factorioDataVersion,
		license: FACTORIOLAB_LICENSE,
		sources,
		names: sortedRecord(names),
		prefixes: sortedRecord(Object.entries(input.prefixes)),
	};
}
