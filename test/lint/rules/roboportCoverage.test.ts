import {describe, expect, test} from 'vite-plus/test';

import {buildLintContext} from '../../../src/lint/engine';
import {roboportCoverageRule} from '../../../src/lint/rules/roboportCoverage';
import type {LintFinding} from '../../../src/lint/types';
import type {Entity} from '../../../src/parsing/types';
import {makeBlueprint} from '../helpers';

function entity(entityNumber: number, name: string, x: number, y: number): Entity {
	return {entity_number: entityNumber, name, position: {x, y}};
}

function runRule(entities: Entity[]): LintFinding[] {
	const blueprint = makeBlueprint(entities).blueprint;
	if (!blueprint) throw new Error('Expected blueprint test data');
	return roboportCoverageRule.run(buildLintContext(blueprint));
}

describe('roboport-coverage rule', () => {
	test('returns no findings for an empty blueprint', () => {
		expect(runRule([])).toStrictEqual([]);
	});

	test('does not require construction coverage when a blueprint has no roboports', () => {
		expect(runRule([entity(100, 'assembling-machine-1', 100.5, 100.5)])).toStrictEqual([]);
	});

	test('accepts known entities inside a roboport construction area', () => {
		const entities = [entity(100, 'roboport', 0, 0), entity(200, 'assembling-machine-1', 54.5, 0.5)];

		expect(runRule(entities)).toStrictEqual([]);
	});

	test('reports known entities outside every construction area', () => {
		const entities = [entity(100, 'roboport', 0, 0), entity(200, 'transport-belt', 55.5, 0.5)];

		expect(runRule(entities)).toStrictEqual([
			{
				ruleId: 'roboport-coverage',
				severity: 'warning',
				message: 'Entity "transport-belt" at (55.5, 0.5) is outside every roboport construction area.',
				entityNumbers: [200],
			},
		]);
	});

	test('includes the construction boundary and skips unknown modded entities', () => {
		const entities = [
			entity(100, 'roboport', 0, 0),
			entity(200, 'transport-belt', 55, 0),
			entity(300, 'alice-modded-machine', 100.5, 100.5),
		];

		expect(runRule(entities)).toStrictEqual([]);
	});
});
