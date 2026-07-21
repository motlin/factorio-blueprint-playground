import type {Direction16} from '../direction';
import {isCardinal} from '../direction';
import type {Entity} from '../../parsing/types';

interface EntityFootprint {
	width: number;
	height: number;
}

export interface TilePosition {
	x: number;
	y: number;
}

const ENTITY_FOOTPRINTS = {
	accumulator: {width: 2, height: 2},
	'active-provider-chest': {width: 1, height: 1},
	'agricultural-tower': {width: 3, height: 3},
	'arithmetic-combinator': {width: 1, height: 2},
	'assembling-machine-1': {width: 3, height: 3},
	'assembling-machine-2': {width: 3, height: 3},
	'assembling-machine-3': {width: 3, height: 3},
	beacon: {width: 3, height: 3},
	'big-electric-pole': {width: 2, height: 2},
	'big-mining-drill': {width: 5, height: 5},
	biolab: {width: 5, height: 5},
	biochamber: {width: 5, height: 5},
	boiler: {width: 3, height: 2},
	'buffer-chest': {width: 1, height: 1},
	'bulk-inserter': {width: 1, height: 1},
	'burner-inserter': {width: 1, height: 1},
	'burner-mining-drill': {width: 2, height: 2},
	centrifuge: {width: 3, height: 3},
	'chemical-plant': {width: 3, height: 3},
	'constant-combinator': {width: 1, height: 1},
	'cryogenic-plant': {width: 5, height: 5},
	'decider-combinator': {width: 1, height: 2},
	'electric-furnace': {width: 3, height: 3},
	'electric-mining-drill': {width: 3, height: 3},
	'electromagnetic-plant': {width: 4, height: 4},
	'express-splitter': {width: 2, height: 1},
	'express-transport-belt': {width: 1, height: 1},
	'express-underground-belt': {width: 1, height: 1},
	'fast-inserter': {width: 1, height: 1},
	'fast-splitter': {width: 2, height: 1},
	'fast-transport-belt': {width: 1, height: 1},
	'fast-underground-belt': {width: 1, height: 1},
	'filter-inserter': {width: 1, height: 1},
	foundry: {width: 5, height: 5},
	'heat-exchanger': {width: 3, height: 2},
	'heating-tower': {width: 3, height: 3},
	'infinity-chest': {width: 1, height: 1},
	inserter: {width: 1, height: 1},
	'iron-chest': {width: 1, height: 1},
	lab: {width: 3, height: 3},
	'laser-turret': {width: 2, height: 2},
	'linked-chest': {width: 1, height: 1},
	'long-handed-inserter': {width: 1, height: 1},
	'medium-electric-pole': {width: 1, height: 1},
	'nuclear-reactor': {width: 5, height: 5},
	'oil-refinery': {width: 5, height: 5},
	'passive-provider-chest': {width: 1, height: 1},
	pipe: {width: 1, height: 1},
	'pipe-to-ground': {width: 1, height: 1},
	'programmable-speaker': {width: 1, height: 1},
	pump: {width: 1, height: 2},
	pumpjack: {width: 3, height: 3},
	radar: {width: 3, height: 3},
	recycler: {width: 3, height: 3},
	'requester-chest': {width: 1, height: 1},
	roboport: {width: 4, height: 4},
	'rocket-silo': {width: 9, height: 9},
	'small-electric-pole': {width: 1, height: 1},
	'solar-panel': {width: 3, height: 3},
	splitter: {width: 2, height: 1},
	'stack-filter-inserter': {width: 1, height: 1},
	'stack-inserter': {width: 1, height: 1},
	'steel-chest': {width: 1, height: 1},
	'steel-furnace': {width: 2, height: 2},
	'stone-furnace': {width: 2, height: 2},
	substation: {width: 2, height: 2},
	'tesla-turret': {width: 2, height: 2},
	'train-stop': {width: 2, height: 2},
	'transport-belt': {width: 1, height: 1},
	'turbo-splitter': {width: 2, height: 1},
	'turbo-transport-belt': {width: 1, height: 1},
	'turbo-underground-belt': {width: 1, height: 1},
	'underground-belt': {width: 1, height: 1},
	'wooden-chest': {width: 1, height: 1},
} as const satisfies Record<string, EntityFootprint>;

export const INSERTER_REACH = {
	'bulk-inserter': 1,
	'burner-inserter': 1,
	'fast-inserter': 1,
	'filter-inserter': 1,
	inserter: 1,
	'long-handed-inserter': 2,
	'stack-filter-inserter': 1,
	'stack-inserter': 1,
} as const satisfies Record<string, number>;

export const INSERTER_TARGET_NAMES = {
	'active-provider-chest': true,
	'agricultural-tower': true,
	'assembling-machine-1': true,
	'assembling-machine-2': true,
	'assembling-machine-3': true,
	'big-mining-drill': true,
	biolab: true,
	biochamber: true,
	boiler: true,
	'buffer-chest': true,
	'burner-mining-drill': true,
	centrifuge: true,
	'chemical-plant': true,
	'cryogenic-plant': true,
	'electric-furnace': true,
	'electric-mining-drill': true,
	'electromagnetic-plant': true,
	'express-splitter': true,
	'express-transport-belt': true,
	'express-underground-belt': true,
	'fast-splitter': true,
	'fast-transport-belt': true,
	'fast-underground-belt': true,
	foundry: true,
	'heating-tower': true,
	'infinity-chest': true,
	'iron-chest': true,
	lab: true,
	'linked-chest': true,
	'nuclear-reactor': true,
	'oil-refinery': true,
	'passive-provider-chest': true,
	recycler: true,
	'requester-chest': true,
	'rocket-silo': true,
	splitter: true,
	'steel-chest': true,
	'steel-furnace': true,
	'stone-furnace': true,
	'transport-belt': true,
	'turbo-splitter': true,
	'turbo-transport-belt': true,
	'turbo-underground-belt': true,
	'underground-belt': true,
	'wooden-chest': true,
} as const satisfies Record<string, boolean>;

function isKnownFootprint(name: string): name is keyof typeof ENTITY_FOOTPRINTS {
	return Object.hasOwn(ENTITY_FOOTPRINTS, name);
}

function footprint(name: string): EntityFootprint | undefined {
	return isKnownFootprint(name) ? ENTITY_FOOTPRINTS[name] : undefined;
}

export function isKnownEntityName(name: string): boolean {
	return isKnownFootprint(name);
}

export function occupiedTileCenters(entity: Entity, direction: Direction16): TilePosition[] {
	const dimensions = footprint(entity.name);
	if (!dimensions) return [];
	if (dimensions.width !== dimensions.height && !isCardinal(direction)) return [];

	const horizontal = direction === 4 || direction === 12;
	const width = horizontal ? dimensions.height : dimensions.width;
	const height = horizontal ? dimensions.width : dimensions.height;
	const positions: TilePosition[] = [];

	for (let column = 0; column < width; column++) {
		for (let row = 0; row < height; row++) {
			positions.push({
				x: entity.position.x + column - (width - 1) / 2,
				y: entity.position.y + row - (height - 1) / 2,
			});
		}
	}

	return positions;
}
