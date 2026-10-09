import {describe, expect, test} from 'vite-plus/test';

import {buildLintContext} from '../../../src/lint/engine';
import {duplicateEntitiesRule} from '../../../src/lint/rules/duplicateEntities';
import type {LintFinding} from '../../../src/lint/types';
import type {Entity} from '../../../src/parsing/types';
import {makeBlueprint} from '../helpers';

function entity(entityNumber: number, name: string, x: number, y: number): Entity {
	return {entity_number: entityNumber, name, position: {x, y}};
}

function runRule(entities: Entity[]): LintFinding[] {
	const blueprint = makeBlueprint(entities).blueprint;
	if (!blueprint) throw new Error('Expected blueprint test data');
	return duplicateEntitiesRule.run(buildLintContext(blueprint));
}

describe('duplicate-entities rule', () => {
	test('returns no findings for an empty blueprint', () => {
		expect(runRule([])).toStrictEqual([]);
	});

	test('allows different names at one position and identical names at different positions', () => {
		const entities = [
			entity(100, 'straight-rail', 0, 0),
			entity(200, 'rail-signal', 0, 0),
			entity(300, 'inserter', 10, 10),
			entity(400, 'inserter', 10, 11),
		];

		expect(runRule(entities)).toStrictEqual([]);
	});

	test('reports one finding for every identical name and position group', () => {
		const entities = [
			entity(100, 'inserter', 0.5, -0.5),
			entity(200, 'inserter', 0.5, -0.5),
			entity(300, 'inserter', 0.5, -0.5),
			entity(400, 'transport-belt', 10, 10),
			entity(500, 'transport-belt', 10, 10),
		];

		expect(runRule(entities)).toStrictEqual([
			{
				ruleId: 'duplicate-entities',
				severity: 'error',
				message: '3 "inserter" entities share position (0.5, -0.5).',
				entityNumbers: [100, 200, 300],
			},
			{
				ruleId: 'duplicate-entities',
				severity: 'error',
				message: '2 "transport-belt" entities share position (10, 10).',
				entityNumbers: [400, 500],
			},
		]);
	});

	test('allows rails crossing at one position and mod entities that stack by design', () => {
		const entities = [
			{...entity(100, 'straight-rail', 1, 1), direction: 0},
			{...entity(200, 'straight-rail', 1, 1), direction: 4},
			{...entity(300, 'curved-rail-a', 5, 5), direction: 0},
			{...entity(400, 'curved-rail-a', 5, 5), direction: 8},
			entity(500, 'express-miniloader-inserter', 9.5, 9.5),
			entity(600, 'express-miniloader-inserter', 9.5, 9.5),
		];

		expect(runRule(entities)).toStrictEqual([]);
	});

	test('reports identical vanilla entities that also face the same way', () => {
		const entities = [
			{...entity(100, 'straight-rail', 1, 1), direction: 4},
			{...entity(200, 'straight-rail', 1, 1), direction: 4},
		];

		expect(runRule(entities)).toStrictEqual([
			{
				ruleId: 'duplicate-entities',
				severity: 'error',
				message: '2 "straight-rail" entities share position (1, 1).',
				entityNumbers: [100, 200],
			},
		]);
	});
});
