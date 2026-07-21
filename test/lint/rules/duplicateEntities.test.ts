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

	test('detects exact duplicates for unknown modded names without treating unlike entities as collisions', () => {
		const entities = [
			entity(100, 'alice-modded-entity', 0, 0),
			entity(200, 'bob-modded-entity', 0, 0),
			entity(300, 'alice-modded-entity', 0, 0),
		];

		expect(runRule(entities)).toStrictEqual([
			{
				ruleId: 'duplicate-entities',
				severity: 'error',
				message: '2 "alice-modded-entity" entities share position (0, 0).',
				entityNumbers: [100, 300],
			},
		]);
	});
});
