import type {
	BlueprintString,
	BlueprintStringWithIndex,
	DeconstructionPlanner,
	Icon,
	UpgradePlanner,
} from '../parsing/types';

export interface MetadataSubstitution {
	find: string;
	replace: string;
	matchCase: boolean;
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

	const source = substitution.matchCase ? value : value.toLowerCase();
	const search = substitution.matchCase ? substitution.find : substitution.find.toLowerCase();
	let cursor = 0;
	let count = 0;
	let result = '';
	while (true) {
		const matchIndex = source.indexOf(search, cursor);
		if (matchIndex === -1) {
			return {count, value: result + value.slice(cursor)};
		}
		const matched = value.slice(matchIndex, matchIndex + substitution.find.length);
		const replacement = substitution.matchCase
			? substitution.replace
			: replacementWithMatchedCase(matched, substitution.replace);
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
	if (metadata.icons !== undefined) {
		value.icons = metadata.icons.map((icon) => {
			const name = substituteString(icon.signal.name, substitution);
			count += name.count;
			return {...icon, signal: {...icon.signal, name: name.value}};
		});
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
