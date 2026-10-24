import {describe, expect, test} from 'vite-plus/test';

import {buildLintContext} from '../../../src/lint/engine';
import {powerPoleCoverageRule} from '../../../src/lint/rules/powerPoleCoverage';
import type {LintFinding} from '../../../src/lint/types';
import type {Entity} from '../../../src/parsing/types';
import {makeBlueprint} from '../helpers';

function entity(entityNumber: number, name: string, x: number, y: number): Entity {
	return {entity_number: entityNumber, name, position: {x, y}};
}

// A substation powering 30 inserters, so the blueprint carries a near-complete pole network.
const POWERED_NEIGHBORHOOD: Entity[] = [
	entity(9000, 'substation', 500, 500),
	...Array.from({length: 30}, (_, index) =>
		entity(9001 + index, 'inserter', 492.5 + (index % 15), 498.5 + Math.floor(index / 15)),
	),
];

function runRule(entities: Entity[], {nearComplete = true, atEdges = false} = {}): LintFinding[] {
	const blueprint = makeBlueprint(nearComplete ? [...entities, ...POWERED_NEIGHBORHOOD] : entities, 2, {
		atEdges,
	}).blueprint;
	if (!blueprint) throw new Error('Expected blueprint test data');
	return powerPoleCoverageRule.run(buildLintContext(blueprint));
}

describe('power-pole-coverage rule', () => {
	test('returns no findings for an empty blueprint', () => {
		expect(runRule([])).toStrictEqual([]);
	});

	test('accepts a powered machine when part of its footprint intersects a pole supply area', () => {
		const entities = [entity(100, 'small-electric-pole', 0.5, 0.5), entity(200, 'assembling-machine-2', 3.5, 0.5)];

		expect(runRule(entities)).toStrictEqual([]);
	});

	test('reports known powered entities outside every pole supply area', () => {
		const entities = [entity(100, 'small-electric-pole', 0.5, 0.5), entity(200, 'inserter', 3.5, 0.5)];

		expect(runRule(entities)).toStrictEqual([
			{
				ruleId: 'power-pole-coverage',
				severity: 'warning',
				message: 'Powered entity "inserter" at (3.5, 0.5) is outside every power pole supply area.',
				entityNumbers: [200],
			},
		]);
	});

	test('includes the supply boundary and skips unknown modded entities', () => {
		const entities = [
			entity(100, 'medium-electric-pole', 0.5, 0.5),
			entity(200, 'inserter', 4, 0.5),
			entity(300, 'inserter', 4.5, 10.5),
			entity(400, 'alice-modded-machine', 20.5, 20.5),
		];

		expect(runRule(entities)).toStrictEqual([
			{
				ruleId: 'power-pole-coverage',
				severity: 'warning',
				message: 'Powered entity "inserter" at (4.5, 10.5) is outside every power pole supply area.',
				entityNumbers: [300],
			},
		]);
	});

	test('checks entities that draw electricity and ignores ones that do not', () => {
		const entities = [
			entity(50, 'small-electric-pole', 0.5, 0.5),
			entity(100, 'constant-combinator', 10.5, 10.5),
			entity(200, 'train-stop', 20, 20),
			entity(300, 'selector-combinator', 30.5, 31),
			entity(400, 'small-lamp', 40.5, 40.5),
		];

		expect(runRule(entities).map((finding) => finding.entityNumbers)).toStrictEqual([[300], [400]]);
	});

	test('skips blueprints without power poles, which get power from wherever they are placed', () => {
		const entities = [entity(100, 'assembling-machine-2', 0.5, 0.5), entity(200, 'inserter', 2.5, 0.5)];

		expect(runRule(entities, {nearComplete: false})).toStrictEqual([]);
	});

	test('skips blueprints that carry only part of their pole network', () => {
		const entities = [
			entity(100, 'small-electric-pole', 0.5, 0.5),
			...Array.from({length: 5}, (_, index) => entity(200 + index, 'inserter', 20.5 + index, 0.5)),
		];

		expect(runRule(entities, {nearComplete: false})).toStrictEqual([]);
	});

	test('skips misses near the edge, which a neighboring copy of a tileable design may power', () => {
		const entities = [
			entity(100, 'inserter', 470.5, 500.5),
			entity(200, 'inserter', 530.5, 530.5),
			entity(300, 'wooden-chest', 440.5, 440.5),
			entity(400, 'wooden-chest', 560.5, 560.5),
			entity(500, 'inserter', 545.5, 560.5),
		];

		expect(runRule(entities, {atEdges: true}).map((finding) => finding.entityNumbers)).toStrictEqual([
			[100],
			[200],
		]);
	});
});
