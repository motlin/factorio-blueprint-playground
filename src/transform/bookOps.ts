import {BlueprintWrapper} from '../parsing/BlueprintWrapper';
import type {BlueprintString, BlueprintStringWithIndex, Icon, SignalType} from '../parsing/types';

const SIGNAL_TYPES = new Set<string>([
	'item',
	'fluid',
	'virtual',
	'entity',
	'technology',
	'recipe',
	'item-group',
	'tile',
	'virtual-signal',
	'achievement',
	'equipment',
	'planet',
	'quality',
	'utility',
	'space-location',
]);

function toSignalType(type: string | undefined): SignalType | undefined {
	if (type !== undefined && SIGNAL_TYPES.has(type)) {
		// oxlint-disable-next-line typescript/no-unsafe-type-assertion -- membership checked against SIGNAL_TYPES
		return type as SignalType;
	}

	return undefined;
}

function addIndex(blueprint: BlueprintString, index: number): BlueprintStringWithIndex {
	return {...blueprint, index};
}

function collectLeaves(root: BlueprintString): BlueprintString[] {
	if (root.blueprint_book === undefined) {
		return [root];
	}

	return root.blueprint_book.blueprints.flatMap((child) => collectLeaves(child));
}

function compareLabels(first: BlueprintString, second: BlueprintString): number {
	const firstLabel = new BlueprintWrapper(first).getLabel();
	const secondLabel = new BlueprintWrapper(second).getLabel();

	if (firstLabel === undefined) {
		return secondLabel === undefined ? 0 : 1;
	}
	if (secondLabel === undefined) {
		return -1;
	}

	return firstLabel.localeCompare(secondLabel);
}

function createBookIcons(wrappers: BlueprintWrapper[]): Icon[] {
	const icons: Icon[] = [];

	for (const wrapper of wrappers) {
		const blueprintIcons = wrapper.getIcons();
		if (blueprintIcons.length > 0) {
			const [icon] = blueprintIcons;
			icons.push({
				signal: {
					type: toSignalType(icon.signal.type) ?? 'item',
					name: icon.signal.name,
				},
				index: icons.length + 1,
			});
		}

		if (icons.length === 4) {
			break;
		}
	}

	return icons.length === 0 ? [{signal: {type: 'item', name: 'blueprint-book'}, index: 1}] : icons;
}

export function flattenBook(root: BlueprintString): BlueprintString {
	if (root.blueprint_book === undefined) {
		return root;
	}

	return {
		...root,
		blueprint_book: {
			...root.blueprint_book,
			blueprints: collectLeaves(root).map(addIndex),
			active_index: 0,
		},
	};
}

export function sortBookByLabel(root: BlueprintString, recursive = false): BlueprintString {
	if (root.blueprint_book === undefined) {
		return root;
	}

	const children = recursive
		? root.blueprint_book.blueprints.map((child) => sortBookByLabel(child, true))
		: root.blueprint_book.blueprints;

	return {
		...root,
		blueprint_book: {
			...root.blueprint_book,
			blueprints: [...children].sort(compareLabels).map(addIndex),
			active_index: 0,
		},
	};
}

export function splitBook(root: BlueprintString): BlueprintString[] {
	if (root.blueprint_book === undefined) {
		return [root];
	}

	return root.blueprint_book.blueprints.map(({index: _index, ...child}) => child);
}

export function makeBook(blueprints: BlueprintString[], label: string): BlueprintString {
	const wrappers = blueprints.map((blueprint) => new BlueprintWrapper(blueprint));

	return {
		blueprint_book: {
			item: 'blueprint-book',
			label,
			icons: createBookIcons(wrappers),
			blueprints: blueprints.map(addIndex),
			active_index: 0,
			version: Math.max(0, ...wrappers.map((wrapper) => wrapper.getVersion())),
		},
	};
}
