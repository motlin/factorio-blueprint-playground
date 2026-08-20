import type {Blueprint, BlueprintString, Entity, Quality, SignalType} from '../parsing/types';
import {removeEntities} from './visit';

export interface BlueprintComponentIdentity {
	name: string;
	quality?: Quality;
	type: SignalType;
}

export type BlueprintComponentRemovalKey = string;

export function blueprintComponentRemovalKey(component: BlueprintComponentIdentity): BlueprintComponentRemovalKey {
	return JSON.stringify({name: component.name, quality: component.quality, type: component.type});
}

function isRemoved(
	removedComponents: ReadonlySet<BlueprintComponentRemovalKey>,
	component: BlueprintComponentIdentity,
): boolean {
	return removedComponents.has(blueprintComponentRemovalKey(component));
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
		const items = entity.items?.filter(
			(item) => !isRemoved(removedComponents, {name: item.id.name, quality: item.id.quality, type: 'item'}),
		);
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
	const tiles = blueprint.tiles?.filter((tile) => !isRemoved(removedComponents, {name: tile.name, type: 'tile'}));
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

	let blueprint = removeEntities(source.blueprint, (entity) =>
		isRemoved(removedComponents, {name: entity.name, quality: entity.quality, type: 'entity'}),
	);
	blueprint = removeItemComponents(blueprint, removedComponents);
	blueprint = removeTileComponents(blueprint, removedComponents);
	return blueprint === source.blueprint ? source : {...source, blueprint};
}
