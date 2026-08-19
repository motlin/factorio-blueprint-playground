import type {GameUiSourceLock, GameUiSpec} from './schema';
import {parseGameUiSpec} from './schema';

interface LuaPrototype {
	type: string;
	name: string;
	order?: string;
	icon?: string;
	group?: string;
	level?: number;
	hidden?: boolean;
	next?: string;
	nextUpgrade?: string;
	fastReplaceableGroup?: string;
}

interface LuaFrame {
	fields: Map<string, string | number | boolean>;
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

const QUALITY_SOURCE_PATHS = [
	'data/base/prototypes/categories/quality.lua',
	'data/quality/prototypes/quality.lua',
] as const;
const ITEM_GROUP_SOURCE_PATHS = [
	'data/base/prototypes/item-groups.lua',
	'data/space-age/prototypes/item-groups.lua',
] as const;
const LOCALE_SOURCE_PATHS = [
	'data/core/locale/en/core.cfg',
	'data/base/locale/en/base.cfg',
	'data/quality/locale/en/quality.cfg',
	'data/space-age/locale/en/space-age.cfg',
] as const;
const UPGRADE_SOURCE_PATHS = [
	'data/base/prototypes/entity/circuit-network.lua',
	'data/base/prototypes/entity/crash-site.lua',
	'data/base/prototypes/entity/entities.lua',
	'data/base/prototypes/entity/fire.lua',
	'data/base/prototypes/entity/mining-drill.lua',
	'data/base/prototypes/entity/trains.lua',
	'data/base/prototypes/entity/transport-belts.lua',
	'data/base/prototypes/entity/turrets.lua',
	'data/space-age/prototypes/entity/big-mining-drill.lua',
	'data/space-age/prototypes/entity/entities.lua',
	'data/space-age/prototypes/entity/transport-belts.lua',
	'data/space-age/prototypes/entity/turrets.lua',
] as const;

function requiredSource(sources: ReadonlyMap<string, string>, path: string): string {
	const source = sources.get(path);
	if (source === undefined) {
		throw new Error(`Missing authorized Factorio source: ${path}`);
	}
	return source;
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
			while (/[0-9]/.test(source[cursor] ?? '')) {
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

function literalTokenValue(token: LuaToken | undefined): string | number | boolean | undefined {
	if (token?.kind === LuaTokenKind.String) {
		return token.value;
	}
	if (token?.kind === LuaTokenKind.Number) {
		return Number(token.value);
	}
	if (token?.kind === LuaTokenKind.Identifier && (token.value === 'true' || token.value === 'false')) {
		return token.value === 'true';
	}
	return undefined;
}

function optionalString(fields: ReadonlyMap<string, string | number | boolean>, field: string): string | undefined {
	const value = fields.get(field);
	return typeof value === 'string' ? value : undefined;
}

function luaPrototype(frame: LuaFrame): LuaPrototype | undefined {
	const type = optionalString(frame.fields, 'type');
	const name = optionalString(frame.fields, 'name');
	if (type === undefined || name === undefined) {
		return undefined;
	}
	const level = frame.fields.get('level');
	const hidden = frame.fields.get('hidden');
	return {
		type,
		name,
		order: optionalString(frame.fields, 'order'),
		icon: optionalString(frame.fields, 'icon'),
		group: optionalString(frame.fields, 'group'),
		level: typeof level === 'number' ? level : undefined,
		hidden: typeof hidden === 'boolean' ? hidden : undefined,
		next: optionalString(frame.fields, 'next'),
		nextUpgrade: optionalString(frame.fields, 'next_upgrade'),
		fastReplaceableGroup: optionalString(frame.fields, 'fast_replaceable_group'),
	};
}

export function extractLiteralLuaPrototypes(source: string): LuaPrototype[] {
	const frames: LuaFrame[] = [];
	const prototypes: LuaPrototype[] = [];
	const tokens = tokenizeLua(source);
	for (let index = 0; index < tokens.length; index += 1) {
		const token = tokens[index];
		if (token.kind === LuaTokenKind.OpeningBrace) {
			frames.push({fields: new Map()});
			continue;
		}
		if (token.kind === LuaTokenKind.ClosingBrace) {
			const frame = frames.pop();
			if (frame === undefined) {
				throw new Error('Unexpected closing brace in Lua source.');
			}
			const prototype = luaPrototype(frame);
			if (prototype !== undefined) {
				prototypes.push(prototype);
			}
			continue;
		}
		if (
			token.kind !== LuaTokenKind.Identifier ||
			tokens[index + 1]?.kind !== LuaTokenKind.Equals ||
			frames.length === 0
		) {
			continue;
		}
		const value = literalTokenValue(tokens[index + 2]);
		if (value !== undefined) {
			frames.at(-1)?.fields.set(token.value, value);
		}
	}
	if (frames.length > 0) {
		throw new Error('Unclosed table in Lua source.');
	}
	return prototypes;
}

function parseLocale(source: string): Map<string, string> {
	const entries = new Map<string, string>();
	let section = '';
	for (const line of source.split(/\r?\n/)) {
		const sectionMatch = /^\[([^\]]+)\]$/.exec(line);
		if (sectionMatch !== null) {
			section = sectionMatch[1];
			continue;
		}
		const entryMatch = /^([^=]+)=(.*)$/.exec(line);
		if (entryMatch !== null) {
			entries.set(`${section}.${entryMatch[1]}`, entryMatch[2]);
		}
	}
	return entries;
}

function combinedLocales(sources: ReadonlyMap<string, string>): Map<string, string> {
	const locales = new Map<string, string>();
	for (const path of LOCALE_SOURCE_PATHS) {
		for (const [key, value] of parseLocale(requiredSource(sources, path))) {
			locales.set(key, value);
		}
	}
	return locales;
}

function requireLocale(locales: ReadonlyMap<string, string>, key: string): string {
	const value = locales.get(key);
	if (value === undefined) {
		throw new Error(`Missing authorized English locale label: ${key}`);
	}
	return value;
}

function integerAssignment(source: string, name: string): number {
	const match = new RegExp(`^\\s*${name}\\s*=\\s*(\\d+)\\s*[,;]?`, 'm').exec(source);
	if (match === null) {
		throw new Error(`Missing integer assignment: ${name}`);
	}
	return Number(match[1]);
}

function objectIntegerField(source: string, name: string): number {
	const match = new RegExp(`^\\s*${name}\\s*=\\s*(\\d+)\\s*,?`, 'm').exec(source);
	if (match === null) {
		throw new Error(`Missing integer object field: ${name}`);
	}
	return Number(match[1]);
}

function objectDecimalField(source: string, name: string): number {
	const match = new RegExp(`${name}\\s*=\\s*(\\d+(?:\\.\\d+)?)`).exec(source);
	if (match === null) {
		throw new Error(`Missing decimal object field: ${name}`);
	}
	return Number(match[1]);
}

function objectSignedIntegerField(source: string, name: string): number {
	const match = new RegExp(`^\\s*${name}\\s*=\\s*(-?\\d+)\\s*,?`, 'm').exec(source);
	if (match === null) {
		throw new Error(`Missing signed integer object field: ${name}`);
	}
	return Number(match[1]);
}

function cppStaticInteger(source: string, name: string): number {
	const match = new RegExp(`static constexpr \\w+ ${name} = (\\d+);`).exec(source);
	if (match === null) {
		throw new Error(`Missing static integer: ${name}`);
	}
	return Number(match[1]);
}

function styleBlock(source: string, name: string): string {
	const startMatch = new RegExp(`^\\s*${name}\\s*=\\s*(?:--[^\\n]*\\n\\s*)?\\{`, 'm').exec(source);
	if (startMatch === null) {
		throw new Error(`Missing style block: ${name}`);
	}
	const openingBrace = source.indexOf('{', startMatch.index);
	let depth = 0;
	for (let cursor = openingBrace; cursor < source.length; cursor += 1) {
		if (source[cursor] === '{') {
			depth += 1;
		} else if (source[cursor] === '}') {
			depth -= 1;
			if (depth === 0) {
				return source.slice(openingBrace + 1, cursor);
			}
		}
	}
	throw new Error(`Unclosed style block: ${name}`);
}

function requiredMatch(source: string, expression: RegExp, label: string): RegExpExecArray {
	const match = expression.exec(source);
	if (match === null) {
		throw new Error(`Missing ${label}.`);
	}
	return match;
}

function extractSignalTypeOrder(source: string): string[] {
	const typeNames = [...source.matchAll(/addIterator\((\w+)PrototypeList::Iterator\(\)\);/g)].map(
		(match) => match[1],
	);
	const typeByPrototypeList = new Map<string, string>([
		['Item', 'item'],
		['Entity', 'entity'],
		['Fluid', 'fluid'],
		['VirtualSignal', 'virtual'],
		['Recipe', 'recipe'],
		['SpaceLocation', 'space-location'],
		['Quality', 'quality'],
	]);
	return typeNames.map((typeName) => {
		const signalType = typeByPrototypeList.get(typeName);
		if (signalType === undefined) {
			throw new Error(`Unknown ChatIcon prototype list: ${typeName}`);
		}
		return signalType;
	});
}

function decodeCppString(value: string): string {
	return value.replaceAll(/\\x([0-9A-Fa-f]{2})/g, (_match, hexadecimal: string) =>
		String.fromCodePoint(Number.parseInt(hexadecimal, 16)),
	);
}

function extractComparators(comparisonSource: string, stringUtilitySource: string): string[] {
	const arrayBody = requiredMatch(
		comparisonSource,
		/Comparison::allComparisons\s*=\s*\{([^}]+)\}/s,
		'Comparison::allComparisons',
	)[1];
	const names = [...arrayBody.matchAll(/Comparison::(\w+)/g)].map((match) => match[1]);
	const returnValues = new Map<string, string>();
	for (const match of comparisonSource.matchAll(/case Comparison::(\w+): return ("[^"]+"|UTF8_\w+);/g)) {
		const rawValue = match[2];
		if (rawValue.startsWith('"')) {
			returnValues.set(match[1], rawValue.slice(1, -1));
			continue;
		}
		const macro = requiredMatch(
			stringUtilitySource,
			new RegExp(`#define\\s+${rawValue}\\s+"([^"]+)"`),
			rawValue,
		)[1];
		returnValues.set(match[1], Buffer.from(decodeCppString(macro), 'binary').toString('utf8'));
	}
	return names.map((name) => {
		const value = returnValues.get(name);
		if (value === undefined) {
			throw new Error(`Missing serialized comparator: ${name}`);
		}
		return value;
	});
}

function mergePrototypes(
	sources: ReadonlyMap<string, string>,
	paths: readonly string[],
	predicate: (prototype: LuaPrototype) => boolean,
): LuaPrototype[] {
	const prototypes = new Map<string, LuaPrototype>();
	for (const path of paths) {
		for (const prototype of extractLiteralLuaPrototypes(requiredSource(sources, path))) {
			if (!predicate(prototype)) {
				continue;
			}
			const key = `${prototype.type}:${prototype.name}`;
			if (prototypes.has(key)) {
				throw new Error(`Duplicate literal prototype: ${key}`);
			}
			prototypes.set(key, prototype);
		}
	}
	return [...prototypes.values()];
}

function requiredPrototypeField(prototype: LuaPrototype, field: 'group' | 'icon' | 'order'): string {
	const value = prototype[field];
	if (value === undefined) {
		throw new Error(`Prototype ${prototype.type}:${prototype.name} has no literal ${field}.`);
	}
	return value;
}

function extractQualities(
	sources: ReadonlyMap<string, string>,
	locales: ReadonlyMap<string, string>,
): GameUiSpec['qualities'] {
	const qualities = mergePrototypes(sources, QUALITY_SOURCE_PATHS, (prototype) => prototype.type === 'quality');
	const normal = qualities.find((quality) => quality.name === 'normal');
	if (normal === undefined) {
		throw new Error('Missing normal quality prototype.');
	}
	const qualityData = requiredSource(sources, 'data/quality/data.lua');
	const qualityUpdates = requiredSource(sources, 'data/quality/prototypes/base-data-updates.lua');
	if (!/data\.raw\.quality\.normal\.hidden\s*=\s*false/.test(qualityData)) {
		throw new Error('Quality feature does not expose normal quality.');
	}
	normal.hidden = false;
	const normalNext = requiredMatch(
		qualityUpdates,
		/data\.raw\.quality\.normal\.next\s*=\s*"([^"]+)"/,
		'normal quality next relationship',
	)[1];
	normal.next = normalNext;
	return qualities
		.map((quality) => {
			if (quality.level === undefined) {
				throw new Error(`Quality ${quality.name} has no literal level.`);
			}
			return {
				name: quality.name,
				label: requireLocale(locales, `quality-name.${quality.name}`),
				level: quality.level,
				order: requiredPrototypeField(quality, 'order'),
				icon: requiredPrototypeField(quality, 'icon'),
				hidden: quality.hidden ?? false,
				...(quality.next === undefined ? {} : {next: quality.next}),
			};
		})
		.sort((left, right) => left.order.localeCompare(right.order) || left.name.localeCompare(right.name));
}

function extractCategories(
	sources: ReadonlyMap<string, string>,
	locales: ReadonlyMap<string, string>,
): GameUiSpec['signals']['categories'] {
	const prototypes = mergePrototypes(
		sources,
		ITEM_GROUP_SOURCE_PATHS,
		(prototype) => prototype.type === 'item-group' || prototype.type === 'item-subgroup',
	);
	const subgroupsByGroup = new Map<string, LuaPrototype[]>();
	for (const subgroup of prototypes.filter((prototype) => prototype.type === 'item-subgroup')) {
		const group = requiredPrototypeField(subgroup, 'group');
		const subgroups = subgroupsByGroup.get(group) ?? [];
		subgroups.push(subgroup);
		subgroupsByGroup.set(group, subgroups);
	}

	/*
	 * The nested group → subgroup layout follows Teoxoy's Factorio Blueprint
	 * Editor inventory exporter (MIT, commit 2bfc95e). Factorio 2.1.12 remains
	 * the authoritative data source; the prior-art commit and blobs are recorded
	 * in the generated provenance.
	 */
	return prototypes
		.filter((prototype) => prototype.type === 'item-group')
		.map((category) => ({
			name: category.name,
			label: requireLocale(locales, `item-group-name.${category.name}`),
			order: requiredPrototypeField(category, 'order'),
			icon: requiredPrototypeField(category, 'icon'),
			subgroups: (subgroupsByGroup.get(category.name) ?? [])
				.map((subgroup) => ({
					name: subgroup.name,
					order: requiredPrototypeField(subgroup, 'order'),
				}))
				.sort((left, right) => left.order.localeCompare(right.order) || left.name.localeCompare(right.name)),
		}))
		.sort((left, right) => left.order.localeCompare(right.order) || left.name.localeCompare(right.name));
}

function extractSubgroupStartsNewRow(selectListSource: string): true {
	const subgroupRowPaddingContract =
		/lastSubGroupID != this->itemIterator->getSubGroupID\(\)[\s\S]+while \(slotsInRow\+\+ % UtilityConstants::instance\(\)\.selectSlotRowCount != 0\)[\s\S]+slotTable << agui::empty;/;
	if (!subgroupRowPaddingContract.test(selectListSource)) {
		throw new Error('SelectListGui no longer pads each item subgroup to the next slot row.');
	}
	return true;
}

function addUpgrade(
	upgrades: Map<string, {prototypeType: string; from: string; to: string}>,
	prototypeType: string,
	from: string,
	to: string,
): void {
	const existing = upgrades.get(from);
	if (existing !== undefined && (existing.to !== to || existing.prototypeType !== prototypeType)) {
		throw new Error(`Prototype ${from} has conflicting literal next upgrades.`);
	}
	upgrades.set(from, {prototypeType, from, to});
}

function orderedUpgrades(
	upgrades: ReadonlyMap<string, {prototypeType: string; from: string; to: string}>,
): GameUiSpec['upgrades']['next'] {
	const remaining = new Map(upgrades);
	const targets = new Set([...remaining.values()].map(({to}) => to));
	const starts = [...remaining.keys()].filter((from) => !targets.has(from)).sort();
	const result: GameUiSpec['upgrades']['next'] = [];
	const appendChain = (start: string) => {
		let from = start;
		while (true) {
			const upgrade = remaining.get(from);
			if (upgrade === undefined) {
				return;
			}
			result.push(upgrade);
			remaining.delete(from);
			from = upgrade.to;
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

function extractUpgrades(sources: ReadonlyMap<string, string>): GameUiSpec['upgrades'] {
	const groupMembers = new Map<string, Map<string, {prototypeType: string; name: string}>>();
	const nextUpgrades = new Map<string, {prototypeType: string; from: string; to: string}>();
	for (const path of UPGRADE_SOURCE_PATHS) {
		const source = requiredSource(sources, path);
		for (const prototype of extractLiteralLuaPrototypes(source)) {
			if (prototype.fastReplaceableGroup !== undefined && prototype.fastReplaceableGroup !== '') {
				const group =
					groupMembers.get(prototype.fastReplaceableGroup) ??
					new Map<string, {prototypeType: string; name: string}>();
				group.set(`${prototype.type}:${prototype.name}`, {prototypeType: prototype.type, name: prototype.name});
				groupMembers.set(prototype.fastReplaceableGroup, group);
			}
			if (prototype.nextUpgrade !== undefined) {
				addUpgrade(nextUpgrades, prototype.type, prototype.name, prototype.nextUpgrade);
			}
		}
		for (const match of source.matchAll(/data\.raw\["([^"]+)"\]\["([^"]+)"\]\.next_upgrade\s*=\s*"([^"]+)"/g)) {
			addUpgrade(nextUpgrades, match[1], match[2], match[3]);
		}
		for (const match of source.matchAll(/data\.raw\.(\w+)\.(\w+)\.next_upgrade\s*=\s*"([^"]+)"/g)) {
			addUpgrade(nextUpgrades, match[1], match[2], match[3]);
		}
	}
	const groups = [...groupMembers]
		.map(([name, members]) => ({
			name,
			members: [...members.values()].sort(
				(left, right) =>
					left.prototypeType.localeCompare(right.prototypeType) || left.name.localeCompare(right.name),
			),
		}))
		.sort((left, right) => left.name.localeCompare(right.name));
	return {groups, next: orderedUpgrades(nextUpgrades)};
}

function extractStyleBindings(guiStyleSource: string, guiStyleHeader: string): GameUiSpec['styles']['bindings'] {
	const slotButton = requiredMatch(
		guiStyleSource,
		/GuiStyle::slotButtonStyleName\s*=\s*"([^"]+)"/,
		'GuiStyle slot button binding',
	)[1];
	const binding = (getter: string) =>
		requiredMatch(
			guiStyleHeader,
			new RegExp(`MACRO\\(\\w+,\\s*${getter},\\s*"([^"]+)"\\)`),
			`GuiStyle ${getter} binding`,
		)[1];
	return {
		slotButton,
		filterSlotTable: binding('filterSlotTable'),
		deepSlotsScrollPane: binding('deepSlotsScrollPane'),
		mappingScrollPane: binding('mappersScrollPane'),
		mappingTable: binding('mappersTable'),
	};
}

export function buildGameUiSpec(sourceLock: GameUiSourceLock, sources: ReadonlyMap<string, string>): GameUiSpec {
	const authorizedPaths = new Set(sourceLock.sources.map(({path}) => path));
	for (const path of sources.keys()) {
		if (!authorizedPaths.has(path)) {
			throw new Error(`Unauthorized Factorio source supplied to generator: ${path}`);
		}
	}
	const locales = combinedLocales(sources);
	const utilitySource = requiredSource(sources, 'data/core/prototypes/utility-constants.lua');
	const styleSource = requiredSource(sources, 'data/core/prototypes/style.lua');
	const blueprintRecordSlotButton = styleBlock(styleSource, 'blueprint_record_slot_button');
	const defaultTable = styleBlock(styleSource, 'table');
	const labelUnderWidget = styleBlock(styleSource, 'label_under_widget');
	const mappingTable = styleBlock(styleSource, 'mappers_table');
	const mappingTableColumnWidths = styleBlock(mappingTable, 'column_widths');
	const mappingTableHorizontalSpacing = styleBlock(mappingTable, 'horizontal_spacing');
	const slotColumnHeader = styleBlock(styleSource, 'slot_column_header_label');
	const slotTable = styleBlock(styleSource, 'slot_table');
	const frameStyle = styleBlock(styleSource, 'frame');
	const buttonStyle = styleBlock(styleSource, 'button');
	const frameActionButton = styleBlock(styleSource, 'frame_action_button');
	const headerFiller = styleBlock(frameStyle, 'header_filler_style');
	const draggableSpaceHeader = styleBlock(styleSource, 'draggable_space_header');
	const verticalScrollbar = styleBlock(styleSource, 'vertical_scrollbar');
	const scrollbarThumb = styleBlock(verticalScrollbar, 'thumb_button_style');
	const tooltipLabel = styleBlock(styleSource, 'tooltip_label');
	const tooltipFrame = styleBlock(styleSource, 'tooltip_frame');
	const framePadding = requiredMatch(
		frameStyle,
		/top_padding\s*=\s*(\d+),\s*right_padding\s*=\s*(\d+),\s*bottom_padding\s*=\s*(\d+),\s*left_padding\s*=\s*(\d+)/,
		'frame content padding',
	);
	const fontsSource = requiredSource(sources, 'data/core/prototypes/fonts.lua');
	const frameTitleFontSize = requiredMatch(
		fontsSource,
		/name\s*=\s*"heading-1"[\s\S]*?size\s*=\s*(\d+)/,
		'heading-1 font size',
	)[1];
	const blueprintsListSource = requiredSource(sources, 'src/Gui/BlueprintsList.cpp');
	for (const rowCount of ['blueprintBigSlotsPerRow', 'blueprintSmallSlotsPerRow']) {
		if (!blueprintsListSource.includes(`UtilityConstants::instance().${rowCount}`)) {
			throw new Error(`Blueprint list no longer uses the configured ${rowCount} row count.`);
		}
	}
	const signalsTableSource = requiredSource(sources, 'src/Gui/SignalsTable.cpp');
	const signalsTableConstructor = requiredMatch(
		signalsTableSource,
		/SignalsTable::SignalsTable[\s\S]+?:\s*agui::Table\((\d+),/,
		'SignalsTable column count',
	)[1];
	const signalsTableWidth = requiredMatch(
		signalsTableSource,
		/setMinimalWidth\(GuiConstants::getScaled\((\d+)\)\)/,
		'SignalsTable minimum width',
	)[1];
	const qualityConditionSource = requiredSource(sources, 'src/Gui/QualityConditionGui.cpp');
	if (!qualityConditionSource.includes('Comparison::allComparisons')) {
		throw new Error('Quality condition comparator order is no longer sourced from Comparison::allComparisons.');
	}
	const qualitySelectorSource = requiredSource(sources, 'src/Gui/QualitySelector.cpp');
	if (!qualitySelectorSource.includes('qualitySelectorDropdownThreshold')) {
		throw new Error('Quality selector no longer uses the configured dropdown threshold.');
	}
	const upgradeRecordSource = requiredSource(sources, 'src/Blueprint/UpgradeRecord.cpp');
	for (const recordContract of [
		'this->label = other.label;',
		'this->upgradeData.description = description;',
		'this->upgradeData.previewIcons = previewIcons;',
	]) {
		if (!upgradeRecordSource.includes(recordContract)) {
			throw new Error(`Upgrade record metadata contract changed: ${recordContract}`);
		}
	}
	const upgradeItemGuiSource = requiredSource(sources, 'src/Gui/UpgradeItemGui.cpp');
	const upgradeItemGuiHeader = requiredSource(sources, 'src/Gui/UpgradeItemGui.hpp');
	for (const editorField of [
		'UpgradeItemGui::getItemLabel(this->upgradeItem, this->upgradeRecord)',
		'UpgradeItemGui::getUpgradeData(this->upgradeItem, this->upgradeRecord).description',
		'UpgradeItemGui::getUpgradeData(this->upgradeItem, this->upgradeRecord).previewIcons',
	]) {
		if (!upgradeItemGuiSource.includes(editorField)) {
			throw new Error(`Upgrade item metadata editor contract changed: ${editorField}`);
		}
	}

	return parseGameUiSpec({
		schemaVersion: 1,
		sourceVersion: sourceLock.sourceVersion,
		provenance: {
			repository: sourceLock.repository,
			tag: sourceLock.tag,
			commit: sourceLock.commit,
			locale: 'en',
			sources: [...sourceLock.sources].sort((left, right) => left.path.localeCompare(right.path)),
			priorArt: sourceLock.priorArt,
		},
		qualities: extractQualities(sources, locales),
		qualityComparators: extractComparators(
			requiredSource(sources, 'src/Comparison.cpp'),
			requiredSource(sources, 'libraries/CommonUtil/StringUtil.hpp'),
		),
		labels: {
			anyQuality: requireLocale(locales, '.quality-condition-any'),
			qualitySelectionTooltip: requireLocale(locales, '.quality-selection-tooltip'),
			upgradeFrom: requireLocale(locales, 'gui-upgrade.from'),
			upgradeTo: requireLocale(locales, 'gui-upgrade.to'),
		},
		signals: {
			typeOrder: extractSignalTypeOrder(requiredSource(sources, 'src/Gui/ChatIconIDIterator.cpp')),
			categories: extractCategories(sources, locales),
			subgroupStartsNewRow: extractSubgroupStartsNewRow(requiredSource(sources, 'src/Gui/SelectListGui.cpp')),
		},
		upgrades: extractUpgrades(sources),
		upgradePlanner: {
			mappingsPerRow: cppStaticInteger(upgradeItemGuiHeader, 'mappersPerRow'),
			minimumMappingRows: cppStaticInteger(upgradeItemGuiHeader, 'mappersMinRows'),
		},
		utilityConstants: {
			blueprintBigSlotsPerRow: objectIntegerField(utilitySource, 'blueprint_big_slots_per_row'),
			blueprintSmallSlotsPerRow: objectIntegerField(utilitySource, 'blueprint_small_slots_per_row'),
			selectGroupRowCount: objectIntegerField(utilitySource, 'select_group_row_count'),
			selectSlotRowCount: objectIntegerField(utilitySource, 'select_slot_row_count'),
			qualitySelectorDropdownThreshold: objectIntegerField(utilitySource, 'quality_selector_dropdown_threshold'),
		},
		styles: {
			blueprintRecordSlotPadding: objectIntegerField(blueprintRecordSlotButton, 'padding'),
			blueprintRecordSlotSize: objectIntegerField(blueprintRecordSlotButton, 'size'),
			defaultTableHorizontalSpacing: objectIntegerField(defaultTable, 'horizontal_spacing'),
			defaultTableVerticalSpacing: objectIntegerField(defaultTable, 'vertical_spacing'),
			slotSize: integerAssignment(styleSource, 'slot_size'),
			filterGroupTabWidth: objectIntegerField(styleBlock(styleSource, 'filter_group_tab'), 'minimal_width'),
			filterGroupTabHeight: objectIntegerField(styleBlock(styleSource, 'filter_group_tab'), 'height'),
			filterSlotHorizontalSpacing: objectIntegerField(slotTable, 'horizontal_spacing'),
			filterSlotVerticalSpacing: objectIntegerField(slotTable, 'vertical_spacing'),
			labelUnderWidgetBottomMargin: objectSignedIntegerField(labelUnderWidget, 'bottom_margin'),
			labelUnderWidgetHeight: objectIntegerField(labelUnderWidget, 'height'),
			labelUnderWidgetTopMargin: objectSignedIntegerField(labelUnderWidget, 'top_margin'),
			mappingPairWidth: objectIntegerField(mappingTableColumnWidths, 'width'),
			mappingTableHorizontalSpacing: [...mappingTableHorizontalSpacing.matchAll(/spacing\s*=\s*(\d+)/g)].map(
				(match) => Number(match[1]),
			),
			mappingTableVerticalSpacing: objectIntegerField(mappingTable, 'vertical_spacing'),
			signalsTableColumnCount: Number(signalsTableConstructor),
			signalsTableMinimumWidth: Number(signalsTableWidth),
			slotColumnHeaderWidth: objectIntegerField(slotColumnHeader, 'width'),
			buttonHorizontalPadding: objectIntegerField(buttonStyle, 'left_padding'),
			buttonMinimalHeight: objectIntegerField(buttonStyle, 'minimal_height'),
			buttonMinimalWidth: objectIntegerField(buttonStyle, 'minimal_width'),
			draggableSpaceHeaderLeftMargin: objectIntegerField(draggableSpaceHeader, 'left_margin'),
			frameActionButtonSize: objectIntegerField(frameActionButton, 'size'),
			framePaddingBottom: Number(framePadding[3]),
			framePaddingLeft: Number(framePadding[4]),
			framePaddingRight: Number(framePadding[2]),
			framePaddingTop: Number(framePadding[1]),
			frameTitleFontSize: Number(frameTitleFontSize),
			headerFillerHeight: objectIntegerField(headerFiller, 'height'),
			scrollbarThumbWidth: objectIntegerField(scrollbarThumb, 'width'),
			scrollbarWidth: objectIntegerField(verticalScrollbar, 'width'),
			tooltipFrameOpacity: objectDecimalField(tooltipFrame, 'opacity'),
			tooltipLabelMaximalWidth: objectIntegerField(tooltipLabel, 'maximal_width'),
			tooltipLabelMinimalWidth: objectIntegerField(tooltipLabel, 'minimal_width'),
			bindings: extractStyleBindings(
				requiredSource(sources, 'src/Gui/GuiStyle.cpp'),
				requiredSource(sources, 'src/Gui/GuiStyle.hpp'),
			),
		},
	});
}

export function serializeGameUiSpec(specification: GameUiSpec): string {
	const formatJson = (value: unknown, depth: number): string => {
		if (value === null || typeof value !== 'object') {
			return JSON.stringify(value);
		}
		if (Array.isArray(value)) {
			if (value.length === 0) {
				return '[]';
			}
			if (value.every((entry) => entry === null || typeof entry !== 'object')) {
				return `[${value.map((entry) => formatJson(entry, depth + 1)).join(', ')}]`;
			}
			const indentation = '\t'.repeat(depth + 1);
			return `[\n${indentation}${value
				.map((entry) => formatJson(entry, depth + 1))
				.join(`,\n${indentation}`)}\n${'\t'.repeat(depth)}]`;
		}
		const entries = Object.entries(value);
		if (entries.length === 0) {
			return '{}';
		}
		const indentation = '\t'.repeat(depth + 1);
		return `{\n${indentation}${entries
			.map(([key, entry]) => `${JSON.stringify(key)}: ${formatJson(entry, depth + 1)}`)
			.join(`,\n${indentation}`)}\n${'\t'.repeat(depth)}}`;
	};
	return `${formatJson(parseGameUiSpec(specification), 0)}\n`;
}
