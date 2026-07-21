import {describe, expect, test} from 'vite-plus/test';

import {buildLintContext} from '../../../src/lint/engine';
import {powerPoleCoverageRule} from '../../../src/lint/rules/powerPoleCoverage';
import type {LintFinding} from '../../../src/lint/types';
import type {Entity} from '../../../src/parsing/types';
import {makeBlueprint} from '../helpers';

function entity(entityNumber: number, name: string, x: number, y: number): Entity {
	return {entity_number: entityNumber, name, position: {x, y}};
}

function runRule(entities: Entity[]): LintFinding[] {
	const blueprint = makeBlueprint(entities).blueprint;
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
});
