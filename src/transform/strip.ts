import type {Blueprint, BlueprintString, Entity} from '../parsing/types';
import {BlueprintEditorSourceMode} from './blueprintEditor';
import {mapBlueprints, removeEntities} from './visit';

const ROLLING_STOCK_NAMES = new Set(['locomotive', 'cargo-wagon', 'fluid-wagon', 'artillery-wagon']);
const VEHICLE_NAMES = new Set(['car', 'tank', 'spidertron']);
const MODULE_NAMES = new Set([
	'efficiency-module',
	'efficiency-module-2',
	'efficiency-module-3',
	'productivity-module',
	'productivity-module-2',
	'productivity-module-3',
	'quality-module',
	'quality-module-2',
	'quality-module-3',
	'speed-module',
	'speed-module-2',
	'speed-module-3',
]);
const FUEL_NAMES = new Set([
	'bioflux',
	'biter-egg',
	'carbon',
	'coal',
	'fusion-power-cell',
	'jelly',
	'jellynut',
	'jellynut-seed',
	'nuclear-fuel',
	'nutrients',
	'pentapod-egg',
	'rocket-fuel',
	'solid-fuel',
	'spoilage',
	'tree-seed',
	'uranium-fuel-cell',
	'wood',
	'yumako',
	'yumako-mash',
	'yumako-seed',
]);
const QUALITY_KEYS = new Set(['quality', 'recipe_quality']);

export interface BlueprintFilterCategories {
	entities: boolean;
	fuel: boolean;
	modules: boolean;
	stationNames: boolean;
	tiles: boolean;
	trains: boolean;
	vehicles: boolean;
}

export interface BlueprintFilterAnalysis {
	categories: BlueprintFilterCategories;
	defaults: BlueprintFilterCategories;
	showGroup: boolean;
	visible: BlueprintFilterCategories;
}

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

function isVehicle(entity: Entity): boolean {
	return isRollingStock(entity) || VEHICLE_NAMES.has(entity.name);
}

function hasItem(entity: Entity, names: ReadonlySet<string>): boolean {
	return entity.items?.some((item) => names.has(item.id.name)) ?? false;
}

function withoutItems(entity: Entity, names: ReadonlySet<string>): Entity {
	if (entity.items === undefined) {
		return entity;
	}
	const items = entity.items.filter((item) => !names.has(item.id.name));
	if (items.length === entity.items.length) {
		return entity;
	}
	const result = {...entity};
	delete result.items;
	if (items.length > 0) {
		result.items = items;
	}
	return result;
}

export function stripQuality(root: BlueprintString): BlueprintString {
	return mapBlueprints(root, (blueprint) => ({
		...blueprint,
		...(blueprint.entities === undefined ? {} : {entities: withoutQuality(blueprint.entities)}),
		...(blueprint.icons === undefined ? {} : {icons: withoutQuality(blueprint.icons)}),
	}));
}

export function stripEntities(root: BlueprintString): BlueprintString {
	return mapBlueprints(root, (blueprint) => removeEntities(blueprint, (entity) => !isVehicle(entity)));
}

export function blueprintFilterCategories(root: BlueprintString): BlueprintFilterCategories {
	const categories: BlueprintFilterCategories = {
		entities: false,
		fuel: false,
		modules: false,
		stationNames: false,
		tiles: false,
		trains: false,
		vehicles: false,
	};
	const visit = (entry: BlueprintString): void => {
		if (entry.blueprint !== undefined) {
			categories.tiles ||= (entry.blueprint.tiles?.length ?? 0) > 0;
			for (const entity of entry.blueprint.entities ?? []) {
				if (isRollingStock(entity)) {
					categories.trains = true;
				} else if (isVehicle(entity)) {
					categories.vehicles = true;
				} else {
					categories.entities = true;
				}
				categories.modules ||= hasItem(entity, MODULE_NAMES);
				categories.fuel ||= hasItem(entity, FUEL_NAMES);
				categories.stationNames ||= entity.station !== undefined && entity.station !== '';
			}
		}
		for (const child of entry.blueprint_book?.blueprints ?? []) {
			visit(child);
		}
	};
	visit(root);
	return categories;
}

/**
 * Factorio 2.1.12's Blueprint Settings filters depend on the captured content,
 * record mode, and capture surface. The exchange-string format does not retain
 * the originating surface, so callers provide that context explicitly.
 */
export function blueprintFilterAnalysis(
	root: BlueprintString,
	sourceMode: BlueprintEditorSourceMode,
	capturedOnSpacePlatform = false,
): BlueprintFilterAnalysis {
	const categories = blueprintFilterCategories(root);
	const structuralCategoryCount = [
		categories.entities,
		categories.tiles,
		categories.trains,
		categories.vehicles,
	].filter(Boolean).length;
	// BlueprintSettingsGui::updateCheckboxes only exposes structural filters
	// when at least two of these four independently removable categories exist.
	const showStructuralFilters = structuralCategoryCount > 1;

	const capturedDraft = sourceMode === BlueprintEditorSourceMode.CapturedDraft;
	const defaults: BlueprintFilterCategories = {
		entities: true,
		fuel: true,
		modules: true,
		stationNames: true,
		tiles: !capturedDraft || !categories.tiles || !showStructuralFilters || capturedOnSpacePlatform,
		trains: !capturedDraft || (!showStructuralFilters && categories.trains),
		vehicles: !capturedDraft || (!showStructuralFilters && categories.vehicles),
	};
	const visible: BlueprintFilterCategories = {
		entities: showStructuralFilters && categories.entities,
		fuel: categories.fuel,
		modules: categories.modules,
		stationNames: categories.stationNames,
		tiles: showStructuralFilters && categories.tiles,
		trains: showStructuralFilters && categories.trains,
		vehicles: showStructuralFilters && categories.vehicles,
	};
	return {
		categories,
		defaults,
		showGroup: categories.modules || categories.stationNames || categories.fuel || showStructuralFilters,
		visible,
	};
}

export function stripModules(root: BlueprintString): BlueprintString {
	return mapBlueprints(root, (blueprint) => {
		if (blueprint.entities === undefined) {
			return blueprint;
		}
		return {
			...blueprint,
			entities: blueprint.entities.map((entity) => withoutItems(entity, MODULE_NAMES)),
		};
	});
}

export function stripStationNames(root: BlueprintString): BlueprintString {
	return mapBlueprints(root, (blueprint) => {
		if (blueprint.entities === undefined) {
			return blueprint;
		}
		return {
			...blueprint,
			entities: blueprint.entities.map((entity) => {
				if (entity.station === undefined) {
					return entity;
				}
				const result = {...entity};
				delete result.station;
				return result;
			}),
		};
	});
}

export function stripFuel(root: BlueprintString): BlueprintString {
	return mapBlueprints(root, (blueprint) => {
		if (blueprint.entities === undefined) {
			return blueprint;
		}
		return {
			...blueprint,
			entities: blueprint.entities.map((entity) => withoutItems(entity, FUEL_NAMES)),
		};
	});
}

export function stripTrains(root: BlueprintString): BlueprintString {
	return mapBlueprints(root, (blueprint) => removeSchedules(removeEntities(blueprint, isRollingStock)));
}

export function stripVehicles(root: BlueprintString): BlueprintString {
	return mapBlueprints(root, (blueprint) => removeEntities(blueprint, (entity) => VEHICLE_NAMES.has(entity.name)));
}

export function stripTiles(root: BlueprintString): BlueprintString {
	return mapBlueprints(root, (blueprint) => {
		const result = {...blueprint};
		delete result.tiles;
		return result;
	});
}
