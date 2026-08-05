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
	Number,
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

interface LuaUpgradeFrame {
	name: string | undefined;
	nextUpgrade: string | undefined;
}

interface LuaPrototypeFrame {
	group: string | undefined;
	hasFuelValue: boolean;
	hidden: boolean | undefined;
	itemPrototype: boolean;
	name: string | undefined;
	order: string | undefined;
	subgroup: string | undefined;
	type: string | undefined;
}

export interface PrototypeUpgrade {
	from: string;
	to: string;
}

export interface PickerSignalPrototype {
	group: string;
	hidden: boolean;
	name: string;
	order: string;
	subgroup: string;
	type:
		| 'achievement'
		| 'fluid'
		| 'item'
		| 'item-group'
		| 'planet'
		| 'recipe'
		| 'space-location'
		| 'technology'
		| 'tile'
		| 'virtual';
}

const nonItemPickerPrototypeTypes: readonly {
	prototypeType: string;
	signalType: PickerSignalPrototype['type'];
}[] = [
	{prototypeType: 'fluid', signalType: 'fluid'},
	{prototypeType: 'virtual-signal', signalType: 'virtual'},
	{prototypeType: 'recipe', signalType: 'recipe'},
	{prototypeType: 'planet', signalType: 'planet'},
	{prototypeType: 'space-location', signalType: 'space-location'},
	{prototypeType: 'tile', signalType: 'tile'},
	{prototypeType: 'technology', signalType: 'technology'},
	{prototypeType: 'item-group', signalType: 'item-group'},
	{prototypeType: 'achievement', signalType: 'achievement'},
];

function extractMatchingPrototypeNames(
	sources: readonly string[],
	matches: (prototype: LuaPrototypeFrame) => boolean,
): string[] {
	const prototypes = extractLiteralPrototypeFrames(sources);
	const matchingPrototypes = new Map<string, LuaPrototypeFrame>();
	for (const prototype of prototypes) {
		if (!matches(prototype) || prototype.name === undefined) {
			continue;
		}
		const existing = matchingPrototypes.get(prototype.name);
		if (existing === undefined || prototypeMetadataScore(prototype) > prototypeMetadataScore(existing)) {
			matchingPrototypes.set(prototype.name, prototype);
		}
	}
	return [...matchingPrototypes.values()]
		.sort((left, right) => {
			const leftOrder = left.order ?? left.name ?? '';
			const rightOrder = right.order ?? right.name ?? '';
			return leftOrder === rightOrder
				? (left.name ?? '').localeCompare(right.name ?? '')
				: leftOrder.localeCompare(rightOrder);
		})
		.map(({name}) => {
			if (name === undefined) {
				throw new Error('Matched prototype has no name.');
			}
			return name;
		});
}

function prototypeMetadataScore(prototype: LuaPrototypeFrame): number {
	return (
		[prototype.group, prototype.hidden, prototype.order, prototype.subgroup].filter((value) => value !== undefined)
			.length + Number(prototype.itemPrototype)
	);
}

function hasPrototypeName(prototype: LuaPrototypeFrame): prototype is LuaPrototypeFrame & {name: string} {
	return prototype.name !== undefined;
}

function hasPrototypeGroup(
	prototype: LuaPrototypeFrame & {name: string},
): prototype is LuaPrototypeFrame & {group: string; name: string} {
	return prototype.group !== undefined;
}

function extractLiteralPrototypeFrames(sources: readonly string[]): LuaPrototypeFrame[] {
	const prototypes: LuaPrototypeFrame[] = [];
	for (const source of sources) {
		const frames: LuaPrototypeFrame[] = [];
		const tokens = tokenizeLua(source);
		for (let index = 0; index < tokens.length; index += 1) {
			const token = tokens[index];
			if (token.kind === LuaTokenKind.OpeningBrace) {
				frames.push({
					group: undefined,
					hasFuelValue: false,
					hidden: undefined,
					itemPrototype: false,
					name: undefined,
					order: undefined,
					subgroup: undefined,
					type: undefined,
				});
				continue;
			}
			if (token.kind === LuaTokenKind.ClosingBrace) {
				const frame = frames.pop();
				if (frame === undefined) {
					throw new Error('Unexpected closing brace in Lua source.');
				}
				if (frame.name !== undefined && frame.type !== undefined) {
					prototypes.push(frame);
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
			if (token.value === 'stack_size') {
				frame.itemPrototype = true;
				continue;
			}
			if (token.value === 'fuel_value') {
				frame.hasFuelValue = true;
				continue;
			}
			if (
				token.value === 'hidden' &&
				value.kind === LuaTokenKind.Identifier &&
				(value.value === 'true' || value.value === 'false')
			) {
				frame.hidden = value.value === 'true';
				continue;
			}
			if (value.kind !== LuaTokenKind.String) {
				continue;
			}
			if (token.value === 'type') {
				frame.type = value.value;
			} else if (token.value === 'group') {
				frame.group = value.value;
			} else if (token.value === 'name') {
				frame.name = value.value;
			} else if (token.value === 'order') {
				frame.order = value.value;
			} else if (token.value === 'subgroup') {
				frame.subgroup = value.value;
			}
		}
		if (frames.length > 0) {
			throw new Error('Unclosed table in Lua source.');
		}
	}
	return prototypes;
}

export function extractPrototypeNames(sources: readonly string[], prototypeType: string): string[] {
	return extractMatchingPrototypeNames(sources, ({type}) => type === prototypeType);
}

export function extractUpgradeModuleItems(sources: readonly string[]): string[] {
	return extractMatchingPrototypeNames(
		sources,
		({name, subgroup, type}) =>
			type === 'module' || (type === 'item' && subgroup === 'module' && name === 'empty-module-slot'),
	);
}

/**
 * UpgradeData::acceptableForUpgradeSource(ItemPrototype) admits any non-hidden
 * item with a positive fuel value, and sourceAndDestinationCompatible pairs
 * fuel with fuel; fluids also carry fuel_value but are not items.
 */
export function extractUpgradeFuelItems(sources: readonly string[]): string[] {
	return extractMatchingFueledPrototypeNames(sources);
}

function extractMatchingFueledPrototypeNames(sources: readonly string[]): string[] {
	const fueled = new Map<string, LuaPrototypeFrame>();
	for (const prototype of extractLiteralPrototypeFrames(sources)) {
		if (
			prototype.name === undefined ||
			prototype.hidden === true ||
			prototype.type === 'fluid' ||
			!prototype.hasFuelValue
		) {
			continue;
		}
		const existing = fueled.get(prototype.name);
		if (existing === undefined || prototypeMetadataScore(prototype) > prototypeMetadataScore(existing)) {
			fueled.set(prototype.name, prototype);
		}
	}
	return [...fueled.keys()].sort();
}

export function extractPickerSignals(
	sources: readonly string[],
	sourceTypeOrder: readonly string[],
): PickerSignalPrototype[] {
	const prototypes = extractLiteralPrototypeFrames(sources);
	const bestPrototypes = new Map<string, LuaPrototypeFrame>();
	for (const prototype of prototypes) {
		if (prototype.name === undefined || prototype.type === undefined) {
			continue;
		}
		const key = `${prototype.type}:${prototype.name}`;
		const existing = bestPrototypes.get(key);
		if (existing === undefined || prototypeMetadataScore(prototype) > prototypeMetadataScore(existing)) {
			bestPrototypes.set(key, prototype);
		}
	}
	const groups = new Map(
		[...bestPrototypes.values()]
			.filter((prototype) => prototype.type === 'item-group')
			.filter(hasPrototypeName)
			.map((prototype) => [prototype.name, {order: prototype.order ?? prototype.name}]),
	);
	const subgroups = new Map(
		[...bestPrototypes.values()]
			.filter((prototype) => prototype.type === 'item-subgroup')
			.filter(hasPrototypeName)
			.filter(hasPrototypeGroup)
			.map((prototype) => [prototype.name, {group: prototype.group, order: prototype.order ?? prototype.name}]),
	);
	const nonItemTypes = new Map(
		nonItemPickerPrototypeTypes.map(({prototypeType, signalType}) => [prototypeType, signalType]),
	);
	const typeOrder = new Map(sourceTypeOrder.map((type, index) => [type, index]));
	const pickerSignals = new Map<
		string,
		PickerSignalPrototype & {
			metadataScore: number;
		}
	>();
	for (const prototype of [...bestPrototypes.values()].filter(hasPrototypeName)) {
		const type = prototype.itemPrototype ? 'item' : nonItemTypes.get(prototype.type ?? '');
		if (type === undefined) {
			continue;
		}
		const subgroup = prototype.subgroup ?? 'other';
		const candidate = {
			type,
			name: prototype.name,
			group: subgroups.get(subgroup)?.group ?? 'other',
			hidden: prototype.hidden ?? false,
			subgroup,
			order: prototype.order ?? prototype.name,
			metadataScore: prototypeMetadataScore(prototype),
		};
		const key = `${type}:${prototype.name}`;
		const existing = pickerSignals.get(key);
		if (existing === undefined || candidate.metadataScore > existing.metadataScore) {
			pickerSignals.set(key, candidate);
		}
	}
	return [...pickerSignals.values()]
		.sort((left, right) => {
			const leftGroupOrder = groups.get(left.group)?.order ?? left.group;
			const rightGroupOrder = groups.get(right.group)?.order ?? right.group;
			const leftSubgroupOrder = subgroups.get(left.subgroup)?.order ?? left.subgroup;
			const rightSubgroupOrder = subgroups.get(right.subgroup)?.order ?? right.subgroup;
			return (
				leftGroupOrder.localeCompare(rightGroupOrder) ||
				leftSubgroupOrder.localeCompare(rightSubgroupOrder) ||
				(typeOrder.get(left.type) ?? Number.MAX_SAFE_INTEGER) -
					(typeOrder.get(right.type) ?? Number.MAX_SAFE_INTEGER) ||
				left.order.localeCompare(right.order) ||
				left.name.localeCompare(right.name)
			);
		})
		.map(({group, hidden, name, order, subgroup, type}) => ({group, hidden, name, order, subgroup, type}));
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
		if (/[0-9]/.test(character)) {
			const start = cursor;
			cursor += 1;
			while (/[0-9A-Fa-fxX.]/.test(source[cursor] ?? '')) {
				cursor += 1;
			}
			tokens.push({kind: LuaTokenKind.Number, value: source.slice(start, cursor)});
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

function extractPlaceResults(source: string, hidden: boolean): string[] {
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
			if (frame.hidden === hidden && frame.prototypeType !== undefined) {
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

export function extractHiddenPlaceResults(source: string): string[] {
	return extractPlaceResults(source, true);
}

export function extractVisiblePlaceResults(source: string): string[] {
	return extractPlaceResults(source, false);
}

/**
 * Entity `module_slots` counts drive UpgradeDestinationSelectListGui's Entity
 * settings extras: `UpgradeHelpers::getAvailableModuleSlots` gates the Module
 * slots editor on `EntityPrototype::getModuleCount`. Later prototype
 * definitions override earlier ones, matching data-stage load order.
 */
export function extractEntityModuleSlots(sources: readonly string[]): Record<string, number> {
	const moduleSlots = new Map<string, number>();
	for (const source of sources) {
		const frames: {name: string | undefined; slots: number | undefined}[] = [];
		const tokens = tokenizeLua(source);
		for (let index = 0; index < tokens.length; index += 1) {
			const token = tokens[index];
			if (token.kind === LuaTokenKind.OpeningBrace) {
				frames.push({name: undefined, slots: undefined});
				continue;
			}
			if (token.kind === LuaTokenKind.ClosingBrace) {
				const frame = frames.pop();
				if (frame === undefined) {
					throw new Error('Unexpected closing brace in Lua source.');
				}
				if (frame.name !== undefined && frame.slots !== undefined && frame.slots > 0) {
					moduleSlots.set(frame.name, frame.slots);
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
			if (token.value === 'name' && value.kind === LuaTokenKind.String) {
				frame.name = value.value;
			} else if (token.value === 'module_slots' && value.kind === LuaTokenKind.Number) {
				frame.slots = Number(value.value);
			}
		}
		if (frames.length > 0) {
			throw new Error('Unclosed table in Lua source.');
		}
	}
	return Object.fromEntries([...moduleSlots.entries()].sort(([left], [right]) => left.localeCompare(right)));
}

export function extractPrototypeUpgrades(sources: readonly string[]): PrototypeUpgrade[] {
	const upgrades = new Map<string, string>();
	const addUpgrade = (from: string, to: string) => {
		const existing = upgrades.get(from);
		if (existing !== undefined && existing !== to) {
			throw new Error(`Prototype ${from} has conflicting next upgrades: ${existing} and ${to}.`);
		}
		upgrades.set(from, to);
	};

	for (const source of sources) {
		const frames: LuaUpgradeFrame[] = [];
		const tokens = tokenizeLua(source);
		for (let index = 0; index < tokens.length; index += 1) {
			const token = tokens[index];
			if (token.kind === LuaTokenKind.OpeningBrace) {
				frames.push({name: undefined, nextUpgrade: undefined});
				continue;
			}
			if (token.kind === LuaTokenKind.ClosingBrace) {
				const frame = frames.pop();
				if (frame === undefined) {
					throw new Error('Unexpected closing brace in Lua source.');
				}
				if (frame.name !== undefined && frame.nextUpgrade !== undefined) {
					addUpgrade(frame.name, frame.nextUpgrade);
				}
				continue;
			}
			if (token.kind !== LuaTokenKind.Identifier || tokens[index + 1]?.kind !== LuaTokenKind.Equals) {
				continue;
			}
			const frame = frames.at(-1);
			const value = tokens.at(index + 2);
			if (frame === undefined || value?.kind !== LuaTokenKind.String) {
				continue;
			}
			if (token.value === 'name') {
				frame.name = value.value;
			} else if (token.value === 'next_upgrade') {
				frame.nextUpgrade = value.value;
			}
		}
		if (frames.length > 0) {
			throw new Error('Unclosed table in Lua source.');
		}

		const directAssignment =
			/^\s*data\.raw\[["']([^"']+)["']\]\[["']([^"']+)["']\]\.next_upgrade\s*=\s*["']([^"']+)["']/gm;
		for (const match of source.matchAll(directAssignment)) {
			addUpgrade(match[2], match[3]);
		}
	}

	const remaining = new Map(upgrades);
	const targets = new Set(remaining.values());
	const starts = [...remaining.keys()].filter((from) => !targets.has(from)).sort();
	const result: PrototypeUpgrade[] = [];
	const appendChain = (start: string) => {
		let from = start;
		while (true) {
			const to = remaining.get(from);
			if (to === undefined) {
				return;
			}
			result.push({from, to});
			remaining.delete(from);
			from = to;
		}
	};
	for (const start of starts) {
		appendChain(start);
	}
	for (const start of [...remaining.keys()].sort()) {
		appendChain(start);
	}
	return result;
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
