import type {Blueprint, BlueprintString, Entity, SignalType} from '../parsing/types';
import {removeEntities} from './visit';

export interface BlueprintComponentIdentity {
	name: string;
	type: SignalType;
}

export type BlueprintComponentRemovalKey = string;

export function blueprintComponentRemovalKey(component: BlueprintComponentIdentity): BlueprintComponentRemovalKey {
	return JSON.stringify({name: component.name, type: component.type});
}

function isRemoved(
	removedComponents: ReadonlySet<BlueprintComponentRemovalKey>,
	type: SignalType,
	name: string,
): boolean {
	return removedComponents.has(blueprintComponentRemovalKey({name, type}));
}

function removeItemComponents(
	blueprint: Blueprint,
	removedComponents: ReadonlySet<BlueprintComponentRemovalKey>,
): Blueprint {
	const sourceEntities = blueprint.entities;
	if (sourceEntities === undefined) {
		return blueprint;
	}

	const entities = sourceEntities.map((entity): Entity => {
		const items = entity.items?.filter((item) => !isRemoved(removedComponents, 'item', item.id.name));
		if (items?.length === entity.items?.length) {
			return entity;
		}

		const result = {...entity};
		if (items === undefined || items.length === 0) {
			delete result.items;
		} else {
			result.items = items;
		}
		return result;
	});

	return entities.every((entity, index) => entity === sourceEntities[index]) ? blueprint : {...blueprint, entities};
}

function removeTileComponents(
	blueprint: Blueprint,
	removedComponents: ReadonlySet<BlueprintComponentRemovalKey>,
): Blueprint {
	const tiles = blueprint.tiles?.filter((tile) => !isRemoved(removedComponents, 'tile', tile.name));
	if (tiles?.length === blueprint.tiles?.length) {
		return blueprint;
	}

	const result = {...blueprint};
	if (tiles === undefined || tiles.length === 0) {
		delete result.tiles;
	} else {
		result.tiles = tiles;
	}
	return result;
}

export function removeBlueprintComponents(
	source: BlueprintString,
	removedComponents: ReadonlySet<BlueprintComponentRemovalKey>,
): BlueprintString {
	if (source.blueprint === undefined || removedComponents.size === 0) {
		return source;
	}

	let blueprint = removeEntities(source.blueprint, (entity) => isRemoved(removedComponents, 'entity', entity.name));
	blueprint = removeItemComponents(blueprint, removedComponents);
	blueprint = removeTileComponents(blueprint, removedComponents);
	return blueprint === source.blueprint ? source : {...source, blueprint};
}
