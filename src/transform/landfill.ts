import type {Blueprint, BlueprintString, Entity, Tile} from '../parsing/types';
import {mapBlueprints} from './visit';

const entityFootprints: Record<string, [number, number]> = {
	accumulator: [2, 2],
	'agricultural-tower': [3, 3],
	'artillery-turret': [3, 3],
	'assembling-machine-1': [3, 3],
	'assembling-machine-2': [3, 3],
	'assembling-machine-3': [3, 3],
	beacon: [3, 3],
	'big-mining-drill': [5, 5],
	biolab: [5, 5],
	biochamber: [3, 3],
	boiler: [3, 2],
	'burner-mining-drill': [2, 2],
	'cargo-landing-pad': [8, 8],
	centrifuge: [3, 3],
	'chemical-plant': [3, 3],
	'cryogenic-plant': [5, 5],
	'electric-furnace': [3, 3],
	'electric-mining-drill': [3, 3],
	'electromagnetic-plant': [4, 4],
	'flamethrower-turret': [2, 3],
	foundry: [5, 5],
	'fusion-generator': [3, 5],
	'fusion-reactor': [6, 6],
	'gun-turret': [2, 2],
	'heat-exchanger': [3, 2],
	'heating-tower': [3, 3],
	lab: [3, 3],
	'laser-turret': [2, 2],
	'nuclear-reactor': [5, 5],
	'oil-refinery': [5, 5],
	'programmable-speaker': [2, 2],
	pumpjack: [3, 3],
	radar: [3, 3],
	'railgun-turret': [3, 5],
	recycler: [4, 2],
	roboport: [4, 4],
	'rocket-silo': [9, 9],
	'solar-panel': [3, 3],
	'steam-engine': [3, 5],
	'steam-turbine': [3, 5],
	'steel-furnace': [2, 2],
	'stone-furnace': [2, 2],
	'storage-tank': [3, 3],
	substation: [2, 2],
	'tesla-turret': [4, 4],
	'train-stop': [2, 2],
};

const RAIL_NAMES = new Set([
	'curved-rail-a',
	'curved-rail-b',
	'elevated-curved-rail-a',
	'elevated-curved-rail-b',
	'elevated-half-diagonal-rail',
	'elevated-straight-rail',
	'half-diagonal-rail',
	'legacy-curved-rail',
	'legacy-straight-rail',
	'rail-ramp',
	'rail-support',
	'straight-rail',
]);
const ROLLING_STOCK_NAMES = new Set(['artillery-wagon', 'cargo-wagon', 'fluid-wagon', 'locomotive']);

function positionKey(x: number, y: number): string {
	return `${x},${y}`;
}

function shouldSkip(entity: Entity): boolean {
	return RAIL_NAMES.has(entity.name) || ROLLING_STOCK_NAMES.has(entity.name);
}

function footprint(entity: Entity): [number, number] {
	const [width, height] = entityFootprints[entity.name] ?? [1, 1];
	return entity.direction === 2 || entity.direction === 6 ? [height, width] : [width, height];
}

function addLandfillToBlueprint(blueprint: Blueprint): Blueprint {
	const tiles: Tile[] = [...(blueprint.tiles ?? [])];
	const coveredPositions = new Set(tiles.map((tile) => positionKey(tile.position.x, tile.position.y)));

	for (const entity of blueprint.entities ?? []) {
		if (shouldSkip(entity)) {
			continue;
		}

		const [width, height] = footprint(entity);
		const firstX = Math.floor(entity.position.x - width / 2);
		const lastX = Math.ceil(entity.position.x + width / 2) - 1;
		const firstY = Math.floor(entity.position.y - height / 2);
		const lastY = Math.ceil(entity.position.y + height / 2) - 1;

		for (let x = firstX; x <= lastX; x += 1) {
			for (let y = firstY; y <= lastY; y += 1) {
				const key = positionKey(x, y);
				if (coveredPositions.has(key)) {
					continue;
				}

				coveredPositions.add(key);
				tiles.push({name: 'landfill', position: {x, y}});
			}
		}
	}

	if (tiles.length === (blueprint.tiles?.length ?? 0)) {
		return blueprint;
	}

	return {...blueprint, tiles};
}

export function addLandfillUnderlay(root: BlueprintString): BlueprintString {
	return mapBlueprints(root, addLandfillToBlueprint);
}
