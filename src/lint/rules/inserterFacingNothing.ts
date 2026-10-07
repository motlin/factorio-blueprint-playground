import type {Entity} from '../../parsing/types';
import {INSERTER_REACH, INSERTER_TARGET_NAMES, isKnownEntityName, isVanillaTrackEntity} from '../data/footprints';
import type {TilePosition} from '../data/footprints';
import {isCardinal, unitVector} from '../direction';
import type {LintContext, LintFinding, LintRule} from '../types';
import {CoverageIndex} from './coverage';

function isKnownInserter(name: string): name is keyof typeof INSERTER_REACH {
	return Object.hasOwn(INSERTER_REACH, name);
}

function isKnownTarget(name: string): boolean {
	return Object.hasOwn(INSERTER_TARGET_NAMES, name);
}

const STRAIGHT_RAIL_NAMES = new Set(['straight-rail', 'legacy-straight-rail']);

const CURVED_RAIL_NAMES = new Set([
	'curved-rail',
	'curved-rail-a',
	'curved-rail-b',
	'half-diagonal-rail',
	'legacy-curved-rail',
]);
// Curved rails cover more than 2x2, so a wagon at the start of a curve can sit this far from the rail's center.
const CURVED_RAIL_REACH = 2;

// Modded entities have unknown sizes, so one this close may well cover the target tile.
const UNKNOWN_ENTITY_REACH = 3;

interface Surroundings {
	nearCurvedRail: CoverageIndex;
	nearUnknownEntity: CoverageIndex;
	trainStops: Entity[];
}

// Track runs two tiles to the left of a stop's direction of travel, and the train waits behind the stop.
const STOP_TO_TRACK = 2;
const TRAIN_AHEAD_OF_STOP = 3;

function isOnStationTrack(context: LintContext, trainStops: Entity[], position: TilePosition): boolean {
	return trainStops.some((stop) => {
		const travel = unitVector(context.direction(stop));
		const right = {dx: -travel.dy, dy: travel.dx};
		const offsetX = position.x - stop.position.x;
		const offsetY = position.y - stop.position.y;
		const across = offsetX * right.dx + offsetY * right.dy;
		const ahead = offsetX * travel.dx + offsetY * travel.dy;
		return Math.abs(across + STOP_TO_TRACK) < 1 && ahead <= TRAIN_AHEAD_OF_STOP;
	});
}

function surroundings(context: LintContext): Surroundings {
	const curvedRails = context.entities.filter((entity) => CURVED_RAIL_NAMES.has(entity.name));
	const unknownEntities = context.entities.filter(
		(entity) => !isKnownEntityName(entity.name) && !isVanillaTrackEntity(entity.name),
	);
	return {
		trainStops: context.entities.filter(
			(entity) => entity.name === 'train-stop' && isCardinal(context.direction(entity)),
		),
		nearCurvedRail: new CoverageIndex(curvedRails.map((entity) => ({entity, halfWidth: CURVED_RAIL_REACH}))),
		nearUnknownEntity: new CoverageIndex(
			unknownEntities.map((entity) => ({entity, halfWidth: UNKNOWN_ENTITY_REACH})),
		),
	};
}

// A wagon stopped on a straight rail fills the rail's 2x2 footprint, so train stations load and unload there.
function isOnStraightRail(context: LintContext, position: TilePosition): boolean {
	return [-0.5, 0.5].some((dx) =>
		[-0.5, 0.5].some((dy) =>
			context.index
				.entitiesAt(position.x + dx, position.y + dy)
				.some((entity) => STRAIGHT_RAIL_NAMES.has(entity.name) && isCardinal(context.direction(entity))),
		),
	);
}

// Add-ons such as a rocket silo extension reach for machines placed alongside the blueprint.
function isOutsideBlueprint(context: LintContext, position: TilePosition): boolean {
	const {minX, maxX, minY, maxY} = context.bounds;
	return position.x < minX || position.x > maxX || position.y < minY || position.y > maxY;
}

function hasTarget(context: LintContext, nearby: Surroundings, position: TilePosition): boolean {
	return (
		isOutsideBlueprint(context, position) ||
		context.index.entitiesOccupying(position.x, position.y).some((entity) => isKnownTarget(entity.name)) ||
		isOnStraightRail(context, position) ||
		isOnStationTrack(context, nearby.trainStops, position) ||
		nearby.nearCurvedRail.covers(position.x, position.y) ||
		nearby.nearUnknownEntity.covers(position.x, position.y)
	);
}

function finding(rule: LintRule, entity: Entity, missingTargets: string[]): LintFinding {
	return {
		ruleId: rule.id,
		severity: rule.severity,
		message: `Inserter "${entity.name}" at (${entity.position.x}, ${entity.position.y}) has no ${missingTargets.join(' or ')} target.`,
		entityNumbers: [entity.entity_number],
	};
}

interface Miss {
	entity: Entity;
	side: 'pickup' | 'drop';
	target: TilePosition;
	// Unit step along the row of inserters, across the inserter's own axis.
	across: {dx: number; dy: number};
}

function tileKey(x: number, y: number): string {
	return `${x},${y}`;
}

export const inserterFacingNothingRule: LintRule = {
	id: 'inserter-facing-nothing',
	severity: 'warning',
	run(context) {
		const nearby = surroundings(context);
		const misses = context.entities.flatMap((entity): Miss[] => {
			if (!isKnownInserter(entity.name)) return [];
			const direction = context.direction(entity);
			if (!isCardinal(direction)) return [];
			const vector = unitVector(direction);
			const reach = INSERTER_REACH[entity.name];
			const across = {dx: vector.dy === 0 ? 0 : 1, dy: vector.dx === 0 ? 0 : 1};
			// An inserter's direction points at its pickup side; boilers and turrets in real blueprints sit behind it.
			const sides = [
				{side: 'pickup' as const, sign: 1},
				{side: 'drop' as const, sign: -1},
			];
			return sides.flatMap(({side, sign}) => {
				const target = {
					x: entity.position.x + sign * vector.dx * reach,
					y: entity.position.y + sign * vector.dy * reach,
				};
				return hasTarget(context, nearby, target) ? [] : [{entity, side, target, across}];
			});
		});

		// A row of inserters missing the same side meets a belt, wagon, or machine placed separately.
		const missedTiles = new Set(misses.map(({target}) => tileKey(target.x, target.y)));
		const isRowInterface = ({target, across}: Miss) =>
			missedTiles.has(tileKey(target.x + across.dx, target.y + across.dy)) ||
			missedTiles.has(tileKey(target.x - across.dx, target.y - across.dy));

		const sidesByEntity = new Map<Entity, string[]>();
		for (const miss of misses) {
			if (isRowInterface(miss)) continue;
			sidesByEntity.set(miss.entity, [...(sidesByEntity.get(miss.entity) ?? []), miss.side]);
		}
		return [...sidesByEntity].map(([entity, sides]) => finding(this, entity, sides));
	},
};
