import type {Blueprint, BlueprintString, Entity} from '../parsing/types';
import {mapBlueprints, removeEntities} from './visit';

const ROLLING_STOCK_NAMES = new Set(['locomotive', 'cargo-wagon', 'fluid-wagon', 'artillery-wagon']);
const QUALITY_KEYS = new Set(['quality', 'recipe_quality']);

function deleteQualityKeys(value: unknown): void {
	if (value === null || typeof value !== 'object') {
		return;
	}

	if (Array.isArray(value)) {
		for (const item of value) {
			deleteQualityKeys(item);
		}
		return;
	}

	for (const [key, nestedValue] of Object.entries(value)) {
		if (QUALITY_KEYS.has(key)) {
			Reflect.deleteProperty(value, key);
		} else {
			deleteQualityKeys(nestedValue);
		}
	}
}

function withoutQuality<T>(value: T): T {
	const result = structuredClone(value);
	deleteQualityKeys(result);
	return result;
}

function removeSchedules(blueprint: Blueprint): Blueprint {
	const result = {...blueprint};
	delete result.schedules;
	return result;
}

function isRollingStock(entity: Entity): boolean {
	return ROLLING_STOCK_NAMES.has(entity.name);
}

export function stripQuality(root: BlueprintString): BlueprintString {
	return mapBlueprints(root, (blueprint) => ({
		...blueprint,
		...(blueprint.entities === undefined ? {} : {entities: withoutQuality(blueprint.entities)}),
		...(blueprint.icons === undefined ? {} : {icons: withoutQuality(blueprint.icons)}),
	}));
}

export function stripEntities(root: BlueprintString): BlueprintString {
	return mapBlueprints(root, (blueprint) => removeEntities(blueprint, () => true));
}

export function stripModules(root: BlueprintString): BlueprintString {
	return mapBlueprints(root, (blueprint) => {
		if (blueprint.entities === undefined) {
			return blueprint;
		}
		return {
			...blueprint,
			entities: blueprint.entities.map((entity) => {
				const result = {...entity};
				delete result.items;
				return result;
			}),
		};
	});
}

export function stripWires(root: BlueprintString): BlueprintString {
	return mapBlueprints(root, (blueprint) => {
		const result = {...blueprint};
		delete result.wires;
		return result;
	});
}

export function stripTrains(root: BlueprintString): BlueprintString {
	return mapBlueprints(root, (blueprint) => removeSchedules(removeEntities(blueprint, isRollingStock)));
}

export function stripTiles(root: BlueprintString): BlueprintString {
	return mapBlueprints(root, (blueprint) => {
		const result = {...blueprint};
		delete result.tiles;
		return result;
	});
}
