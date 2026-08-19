import type {
	BlueprintString,
	BlueprintStringWithIndex,
	DeconstructionPlanner,
	Icon,
	UpgradePlanner,
	SignalID,
} from '../parsing/types';

export interface MetadataSubstitution {
	find: string;
	replace: string;
}

export interface IconReplacement {
	from: SignalID;
	to: SignalID;
}

export interface MetadataIconCandidate {
	count: number;
	signal: SignalID;
}

interface SubstitutionResult<T> {
	count: number;
	value: T;
}

interface DirectMetadata {
	description?: string;
	icons?: Icon[];
	label?: string;
}

function replacementWithMatchedCase(matched: string, replacement: string): string {
	if (matched === matched.toUpperCase() && matched !== matched.toLowerCase()) {
		return replacement.toUpperCase();
	}
	if (matched === matched.toLowerCase()) {
		return replacement.toLowerCase();
	}
	if (matched.startsWith(matched.slice(0, 1).toUpperCase()) && matched.slice(1) === matched.slice(1).toLowerCase()) {
		return `${replacement.slice(0, 1).toUpperCase()}${replacement.slice(1).toLowerCase()}`;
	}
	return replacement;
}

function substituteString(value: string, substitution: MetadataSubstitution): SubstitutionResult<string> {
	if (substitution.find === '') {
		throw new Error('Metadata substitution text cannot be empty.');
	}

	const source = value.toLowerCase();
	const search = substitution.find.toLowerCase();
	let cursor = 0;
	let count = 0;
	let result = '';
	while (true) {
		const matchIndex = source.indexOf(search, cursor);
		if (matchIndex === -1) {
			return {count, value: result + value.slice(cursor)};
		}
		const matched = value.slice(matchIndex, matchIndex + substitution.find.length);
		const replacement = replacementWithMatchedCase(matched, substitution.replace);
		result += value.slice(cursor, matchIndex) + replacement;
		cursor = matchIndex + substitution.find.length;
		count += 1;
	}
}

function substituteDirectMetadata<T extends DirectMetadata>(
	metadata: T,
	substitution: MetadataSubstitution,
): SubstitutionResult<T> {
	let count = 0;
	const value = {...metadata};
	if (metadata.label !== undefined) {
		const label = substituteString(metadata.label, substitution);
		value.label = label.value;
		count += label.count;
	}
	if (metadata.description !== undefined) {
		const description = substituteString(metadata.description, substitution);
		value.description = description.value;
		count += description.count;
	}
	return {count, value};
}

function substitutePlannerMetadata<T extends UpgradePlanner | DeconstructionPlanner>(
	planner: T,
	substitution: MetadataSubstitution,
): SubstitutionResult<T> {
	const direct = substituteDirectMetadata(planner, substitution);
	const settings = substituteDirectMetadata(planner.settings, substitution);
	return {
		count: direct.count + settings.count,
		value: {...direct.value, settings: settings.value},
	};
}

function substituteMetadata(
	root: BlueprintString,
	substitution: MetadataSubstitution,
): SubstitutionResult<BlueprintString> {
	if (root.blueprint !== undefined) {
		const blueprint = substituteDirectMetadata(root.blueprint, substitution);
		return {count: blueprint.count, value: {...root, blueprint: blueprint.value}};
	}
	if (root.blueprint_book !== undefined) {
		const book = substituteDirectMetadata(root.blueprint_book, substitution);
		let count = book.count;
		const blueprints = book.value.blueprints.map((child): BlueprintStringWithIndex => {
			const transformed = substituteMetadata(child, substitution);
			count += transformed.count;
			return {...transformed.value, index: child.index};
		});
		return {
			count,
			value: {...root, blueprint_book: {...book.value, blueprints}},
		};
	}
	if (root.upgrade_planner !== undefined) {
		const planner = substitutePlannerMetadata(root.upgrade_planner, substitution);
		return {count: planner.count, value: {...root, upgrade_planner: planner.value}};
	}
	if (root.deconstruction_planner !== undefined) {
		const planner = substitutePlannerMetadata(root.deconstruction_planner, substitution);
		return {count: planner.count, value: {...root, deconstruction_planner: planner.value}};
	}
	throw new Error('Cannot substitute metadata in an invalid blueprint string.');
}

export function analyzeMetadataSubstitution(root: BlueprintString, substitution: MetadataSubstitution): number {
	return substituteMetadata(root, substitution).count;
}

export function applyMetadataSubstitution(root: BlueprintString, substitution: MetadataSubstitution): BlueprintString {
	return substituteMetadata(root, substitution).value;
}

function normalizedSignalType(signal: SignalID): string {
	if (signal.type === 'virtual-signal') {
		return 'virtual';
	}
	return signal.type ?? 'item';
}

function signalKey(signal: SignalID): string {
	return [normalizedSignalType(signal), signal.name, signal.quality ?? 'normal'].join(':');
}

function mapDirectIcons<T extends DirectMetadata>(metadata: T, mapper: (signal: SignalID) => SignalID): T {
	if (metadata.icons === undefined) {
		return metadata;
	}
	return {
		...metadata,
		icons: metadata.icons.map((icon) => ({...icon, signal: mapper(icon.signal)})),
	};
}

function mapMetadataIcons(root: BlueprintString, mapper: (signal: SignalID) => SignalID): BlueprintString {
	if (root.blueprint !== undefined) {
		return {...root, blueprint: mapDirectIcons(root.blueprint, mapper)};
	}
	if (root.blueprint_book !== undefined) {
		const book = mapDirectIcons(root.blueprint_book, mapper);
		return {
			...root,
			blueprint_book: {
				...book,
				blueprints: book.blueprints.map(
					(child): BlueprintStringWithIndex => ({
						...mapMetadataIcons(child, mapper),
						index: child.index,
					}),
				),
			},
		};
	}
	if (root.upgrade_planner !== undefined) {
		return {
			...root,
			upgrade_planner: {
				...mapDirectIcons(root.upgrade_planner, mapper),
				settings: mapDirectIcons(root.upgrade_planner.settings, mapper),
			},
		};
	}
	if (root.deconstruction_planner !== undefined) {
		return {
			...root,
			deconstruction_planner: {
				...mapDirectIcons(root.deconstruction_planner, mapper),
				settings: mapDirectIcons(root.deconstruction_planner.settings, mapper),
			},
		};
	}
	throw new Error('Cannot replace icons in an invalid blueprint string.');
}

function replacementLookup(replacements: readonly IconReplacement[]): ReadonlyMap<string, SignalID> {
	const lookup = new Map<string, SignalID>();
	for (const replacement of replacements) {
		const key = signalKey(replacement.from);
		if (lookup.has(key)) {
			throw new Error(`More than one icon replacement is defined for ${replacement.from.name}.`);
		}
		if (normalizedSignalType(replacement.from) !== normalizedSignalType(replacement.to)) {
			throw new Error(`Icon replacement ${replacement.from.name} cannot change signal types.`);
		}
		lookup.set(key, replacement.to);
	}
	return lookup;
}

export function analyzeMetadataIcons(root: BlueprintString): MetadataIconCandidate[] {
	const signals = new Map<string, MetadataIconCandidate>();
	mapMetadataIcons(root, (signal) => {
		const key = signalKey(signal);
		const candidate = signals.get(key);
		if (candidate === undefined) {
			signals.set(key, {count: 1, signal});
		} else {
			candidate.count += 1;
		}
		return signal;
	});
	return [...signals.values()].sort(
		(left, right) => right.count - left.count || left.signal.name.localeCompare(right.signal.name),
	);
}

export function analyzeIconReplacements(root: BlueprintString, replacements: readonly IconReplacement[]): number {
	const lookup = replacementLookup(replacements);
	return analyzeMetadataIcons(root).reduce(
		(total, candidate) => total + (lookup.has(signalKey(candidate.signal)) ? candidate.count : 0),
		0,
	);
}

export function applyIconReplacements(
	root: BlueprintString,
	replacements: readonly IconReplacement[],
): BlueprintString {
	const lookup = replacementLookup(replacements);
	return mapMetadataIcons(root, (signal) => lookup.get(signalKey(signal)) ?? signal);
}
