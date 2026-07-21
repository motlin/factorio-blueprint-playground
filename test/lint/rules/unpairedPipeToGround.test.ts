import {describe, expect, test} from 'vite-plus/test';

import {buildLintContext} from '../../../src/lint/engine';
import {unpairedPipeToGroundRule} from '../../../src/lint/rules/unpairedPipeToGround';
import type {LintFinding} from '../../../src/lint/types';
import {deserializeBlueprint} from '../../../src/parsing/blueprintParser';
import type {Entity} from '../../../src/parsing/types';
import {readFixtureFile} from '../../fixtures/utils';
import {makeBlueprint} from '../helpers';

function pipe(entityNumber: number, x: number, y: number, direction: number, name = 'pipe-to-ground'): Entity {
	return {entity_number: entityNumber, name, position: {x, y}, direction};
}

function runRule(entities: Entity[], major = 2): LintFinding[] {
	const blueprint = makeBlueprint(entities, major).blueprint;
	if (!blueprint) throw new Error('Expected blueprint test data');
	return unpairedPipeToGroundRule.run(buildLintContext(blueprint));
}

function expectedUnpaired(entityNumber: number, x: number, y: number): LintFinding {
	return {
		ruleId: 'unpaired-pipe-to-ground',
		severity: 'warning',
		message: `Pipe-to-ground at (${x}, ${y}) has no paired pipe-to-ground.`,
		entityNumbers: [entityNumber],
	};
}

describe('unpaired-pipe-to-ground rule', () => {
	test('returns no findings for an empty blueprint', () => {
		expect(runRule([])).toStrictEqual([]);
	});

	test('pairs pipes facing each other in all four directions', () => {
		const entities = [
			pipe(100, 0, 0, 0),
			pipe(200, 0, -10, 8),
			pipe(300, 20, 0, 4),
			pipe(400, 30, 0, 12),
			pipe(500, 40, 0, 8),
			pipe(600, 40, 10, 0),
			pipe(700, 60, 0, 12),
			pipe(800, 50, 0, 4),
		];

		expect(runRule(entities)).toStrictEqual([]);
	});

	test('reports pipes that face the same direction or exceed the maximum span', () => {
		const entities = [pipe(100, 0, 0, 4), pipe(200, 10, 0, 4), pipe(300, 0, 10, 4), pipe(400, 11, 10, 12)];

		expect(runRule(entities)).toStrictEqual([
			expectedUnpaired(100, 0, 0),
			expectedUnpaired(200, 10, 0),
			expectedUnpaired(300, 0, 10),
			expectedUnpaired(400, 11, 10),
		]);
	});

	test('skips non-cardinal and unknown modded pipes', () => {
		const entities = [pipe(100, 0, 0, 1), pipe(200, 20, 0, 99, 'alice-pipe-to-ground')];

		expect(runRule(entities)).toStrictEqual([]);
	});

	test.each([{fixture: 'txt/lint-pipe-boundaries-1.1.txt'}, {fixture: 'txt/lint-pipe-boundaries-2.0.txt'}])(
		'pins the inclusive maximum span and direction encoding in $fixture',
		({fixture}) => {
			const blueprintString = deserializeBlueprint(readFixtureFile(fixture));
			const blueprint = blueprintString.blueprint;
			if (!blueprint) throw new Error('Expected blueprint fixture data');

			expect(unpairedPipeToGroundRule.run(buildLintContext(blueprint))).toStrictEqual([
				expectedUnpaired(300, 0, 10),
				expectedUnpaired(400, 11, 10),
			]);
		},
	);
});
