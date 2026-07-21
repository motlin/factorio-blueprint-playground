import {describe, expect, test} from 'vite-plus/test';

import {buildLintContext} from '../../../src/lint/engine';
import {inserterFacingNothingRule} from '../../../src/lint/rules/inserterFacingNothing';
import type {LintFinding} from '../../../src/lint/types';
import type {Entity} from '../../../src/parsing/types';
import {makeBlueprint} from '../helpers';

function entity(entityNumber: number, name: string, x: number, y: number, direction?: number): Entity {
	return {entity_number: entityNumber, name, position: {x, y}, direction};
}

function runRule(entities: Entity[], major = 2): LintFinding[] {
	const blueprint = makeBlueprint(entities, major).blueprint;
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
});
