import type {BlueprintString, Quality, SignalType} from '../../../../parsing/types';
import {
	countItems,
	getEntityKey,
	getItemCount,
	getItemKey,
	getTileKey,
	mapToSortedArray,
	processEntitiesItems,
} from '../contents/countUtils';

export interface BlueprintComponent {
	count: number;
	name: string;
	quality: Quality;
	type: SignalType;
}

export function blueprintComponentName(component: Pick<BlueprintComponent, 'name'>): string {
	const words = component.name.replace(/^signal-/, 'signal ').replaceAll('-', ' ');
	return words.slice(0, 1).toUpperCase() + words.slice(1);
}

function compareComponents(left: BlueprintComponent, right: BlueprintComponent): number {
	return (
		right.count - left.count ||
		blueprintComponentName(left).localeCompare(blueprintComponentName(right)) ||
		left.type.localeCompare(right.type) ||
		(left.quality ?? 'normal').localeCompare(right.quality ?? 'normal')
	);
}

function componentsFromCounts(type: SignalType, counts: Map<string, number>): BlueprintComponent[] {
	return mapToSortedArray(counts).map(({name, quality, count}) => ({count, name, quality, type}));
}

export function aggregateBlueprintComponents(blueprint: BlueprintString): BlueprintComponent[] {
	const content = blueprint.blueprint;
	if (content === undefined) {
		return [];
	}

	const {inventoryItems, moduleItems} = processEntitiesItems(content.entities);
	return [
		...componentsFromCounts('entity', countItems(getEntityKey, content.entities)),
		...componentsFromCounts('item', countItems(getItemKey, [...moduleItems, ...inventoryItems], getItemCount)),
		...componentsFromCounts('tile', countItems(getTileKey, content.tiles)),
	].sort(compareComponents);
}
