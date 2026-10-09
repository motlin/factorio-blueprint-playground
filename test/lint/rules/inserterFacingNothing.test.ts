import {describe, expect, test} from 'vite-plus/test';

import {buildLintContext} from '../../../src/lint/engine';
import {inserterFacingNothingRule} from '../../../src/lint/rules/inserterFacingNothing';
import type {LintFinding} from '../../../src/lint/types';
import type {Entity} from '../../../src/parsing/types';
import {makeBlueprint} from '../helpers';

function entity(entityNumber: number, name: string, x: number, y: number, direction?: number): Entity {
	return {entity_number: entityNumber, name, position: {x, y}, direction};
}

function runRule(entities: Entity[], major = 2, atEdges = false): LintFinding[] {
	const blueprint = makeBlueprint(entities, major, {atEdges}).blueprint;
	if (!blueprint) throw new Error('Expected blueprint test data');
	return inserterFacingNothingRule.run(buildLintContext(blueprint));
}

describe('inserter-facing-nothing rule', () => {
	test('returns no findings for an empty blueprint', () => {
		expect(runRule([])).toStrictEqual([]);
	});

	test('accepts pickup and drop tiles occupied by known belts, chests, or machines', () => {
		const entities = [
			entity(100, 'assembling-machine-2', -1.5, 0.5),
			entity(200, 'inserter', 0.5, 0.5, 4),
			entity(300, 'transport-belt', 1.5, 0.5),
		];

		expect(runRule(entities)).toStrictEqual([]);
	});

	test('reports the missing pickup and drop sides without accepting a known non-target entity', () => {
		const entities = [entity(100, 'inserter', 0.5, 0.5, 4), entity(200, 'small-electric-pole', 1.5, 0.5)];

		expect(runRule(entities)).toStrictEqual([
			{
				ruleId: 'inserter-facing-nothing',
				severity: 'warning',
				message: 'Inserter "inserter" at (0.5, 0.5) has no pickup or drop target.',
				entityNumbers: [100],
			},
		]);
	});

	test('uses long-handed reach, normalizes 1.1 directions, and skips unknown or non-cardinal inserters', () => {
		const entities = [
			entity(100, 'wooden-chest', -1.5, 0.5),
			entity(200, 'long-handed-inserter', 0.5, 0.5, 2),
			entity(300, 'steel-chest', 2.5, 0.5),
			entity(400, 'inserter', 10.5, 0.5, 1),
			entity(500, 'alice-modded-inserter', 20.5, 0.5, 99),
		];

		expect(runRule(entities, 1)).toStrictEqual([]);
	});

	test('treats an unknown entity centered on a target tile conservatively', () => {
		const entities = [
			entity(100, 'alice-modded-machine', -0.5, 0.5),
			entity(200, 'inserter', 0.5, 0.5, 4),
			entity(300, 'bob-modded-machine', 1.5, 0.5),
		];

		expect(runRule(entities)).toStrictEqual([]);
	});

	test('accepts wagons on straight rails as the target of loading and unloading inserters', () => {
		const entities = [
			entity(100, 'iron-chest', 0.5, 0.5),
			entity(200, 'inserter', 0.5, 1.5, 8),
			entity(300, 'straight-rail', 1, 3, 4),
			entity(400, 'inserter', 1.5, 4.5, 8),
			entity(500, 'iron-chest', 1.5, 5.5),
		];

		expect(runRule(entities)).toStrictEqual([]);
	});

	test('accepts wagons on Factorio 1.1 straight rails', () => {
		const entities = [
			entity(100, 'iron-chest', 0.5, 0.5),
			entity(200, 'inserter', 0.5, 1.5, 4),
			entity(300, 'straight-rail', 1, 3, 2),
		];

		expect(runRule(entities, 1)).toStrictEqual([]);
	});

	test('does not treat diagonal rails as a wagon stop', () => {
		const entities = [
			entity(100, 'iron-chest', 0.5, 0.5),
			entity(200, 'inserter', 0.5, 1.5, 8),
			entity(300, 'straight-rail', 1, 3, 2),
		];

		expect(runRule(entities).map((finding) => finding.message)).toStrictEqual([
			'Inserter "inserter" at (0.5, 1.5) has no pickup target.',
		]);
	});

	test('accepts turrets, crushers, recyclers, and Factorio 1.1 logistic chests as targets', () => {
		const entities = [
			entity(100, 'gun-turret', 0, 0),
			entity(200, 'inserter', 1.5, 0.5, 4),
			entity(300, 'logistic-chest-requester', 2.5, 0.5),
			entity(400, 'crusher', 10, 0.5, 0),
			entity(500, 'inserter', 11.5, 1.5, 12),
			entity(600, 'recycler', 21, 20, 0),
			entity(700, 'inserter', 21.5, 22.5, 0),
			entity(800, 'storage-chest', 21.5, 23.5),
			entity(900, 'iron-chest', 12.5, 1.5),
		];

		expect(runRule(entities)).toStrictEqual([]);
	});

	test('assumes a nearby modded entity of unknown size is the target', () => {
		const entities = [
			entity(100, 'iron-chest', 0.5, 0.5),
			entity(200, 'inserter', 0.5, 1.5, 8),
			entity(300, 'alice-big-machine', 1.5, 4.5),
		];

		expect(runRule(entities)).toStrictEqual([]);
	});

	test('accepts wagons standing where a station curves', () => {
		const entities = [
			entity(100, 'steel-chest', 36.5, -4.5),
			entity(200, 'fast-inserter', 36.5, -5.5, 8),
			entity(300, 'curved-rail-a', 38, -7, 6),
		];

		expect(runRule(entities)).toStrictEqual([]);
	});

	// Boilers and turrets, which inserters only ever drop into, sit behind the inserter's direction in real blueprints.
	test('reads the inserter direction as pointing at its pickup side', () => {
		const entities = [entity(100, 'inserter', 0.5, 0.5, 4), entity(200, 'iron-chest', 1.5, 0.5)];

		expect(runRule(entities).map((finding) => finding.message)).toStrictEqual([
			'Inserter "inserter" at (0.5, 0.5) has no drop target.',
		]);
	});

	test('assumes a target past the blueprint edge is placed with it, as add-ons do', () => {
		const entities = [
			entity(100, 'iron-chest', 0.5, 0.5),
			entity(200, 'long-handed-inserter', 0.5, 2.5, 8),
			entity(300, 'wooden-chest', 5.5, 3.5),
		];

		expect(runRule(entities, 2, true)).toStrictEqual([]);
	});

	// The railgun's footprint per facing is uncertain, so like a modded entity it counts when nearby.
	test('accepts a railgun turret in any facing', () => {
		const entities = [
			entity(100, 'railgun-turret', -23.5, -191.5, 2),
			entity(200, 'bulk-inserter', -25.5, -192.5, 12),
			entity(300, 'railgun-turret', -27.5, -192.5, 0),
		];

		expect(runRule(entities)).toStrictEqual([]);
	});

	test('treats a row of inserters that all miss the same side as an interface with something placed separately', () => {
		const entities = [
			...[0.5, 1.5, 2.5].map((x, index) => entity(100 + index, 'iron-chest', x, 0.5)),
			...[0.5, 1.5, 2.5].map((x, index) => entity(200 + index, 'inserter', x, 1.5, 0)),
			entity(300, 'iron-chest', 10.5, 0.5),
			entity(301, 'inserter', 10.5, 1.5, 0),
		];

		expect(runRule(entities).map((finding) => finding.entityNumbers)).toStrictEqual([[301]]);
	});

	// Track runs two tiles to the left of a stop's direction of travel in real blueprints.
	test('treats the track beside a train stop as wagon space when the blueprint has no rails', () => {
		const loader = [entity(100, 'iron-chest', 0.5, 5.5), entity(200, 'inserter', -0.5, 5.5, 4)];

		expect({
			withStop: runRule([...loader, entity(300, 'train-stop', 0, 0, 0)]),
			withoutStop: runRule(loader).map((finding) => finding.entityNumbers),
		}).toStrictEqual({withStop: [], withoutStop: [[200]]});
	});
});
