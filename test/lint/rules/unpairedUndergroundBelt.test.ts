import {describe, expect, test} from 'vite-plus/test';

import {deserializeBlueprint} from '../../../src/parsing/blueprintParser';
import type {Entity} from '../../../src/parsing/types';
import {lintBlueprint} from '../../../src/lint/engine';
import type {LintFinding} from '../../../src/lint/types';
import {readFixtureFile} from '../../fixtures/utils';
import {makeBlueprint} from '../helpers';

function underground(
	entityNumber: number,
	x: number,
	y: number,
	direction: number,
	type: 'input' | 'output',
	name = 'underground-belt',
): Entity {
	return {entity_number: entityNumber, name, position: {x, y}, direction, type};
}

function expectedUnpaired(
	entityNumber: number,
	name: string,
	x: number,
	y: number,
	expectedType: 'input' | 'output',
): LintFinding {
	return {
		ruleId: 'unpaired-underground-belt',
		severity: 'warning',
		message: `Underground belt "${name}" at (${x}, ${y}) has no paired ${expectedType}.`,
		entityNumbers: [entityNumber],
	};
}

describe('unpaired-underground-belt rule', () => {
	test('reports unpaired inputs and outputs', () => {
		expect(
			lintBlueprint(makeBlueprint([underground(100, 0, 0, 4, 'input'), underground(200, 10, 0, 4, 'output')])),
		).toStrictEqual([
			{
				ruleId: 'unpaired-underground-belt',
				severity: 'warning',
				message: 'Underground belt "underground-belt" at (0, 0) has no paired output.',
				entityNumbers: [100],
			},
			{
				ruleId: 'unpaired-underground-belt',
				severity: 'warning',
				message: 'Underground belt "underground-belt" at (10, 0) has no paired input.',
				entityNumbers: [200],
			},
		]);
	});

	test('pairs the nearest output in all four directions', () => {
		const entities = [
			underground(100, 0, 0, 0, 'input'),
			underground(200, 0, -5, 0, 'output'),
			underground(300, 10, 0, 4, 'input'),
			underground(400, 15, 0, 4, 'output'),
			underground(500, 20, 0, 8, 'input'),
			underground(600, 20, 5, 8, 'output'),
			underground(700, 30, 0, 12, 'input'),
			underground(800, 25, 0, 12, 'output'),
		];

		expect(lintBlueprint(makeBlueprint(entities))).toStrictEqual([]);
	});

	test('stops a scan at an intervening same-axis underground', () => {
		const entities = [
			underground(100, 0, 0, 4, 'input'),
			underground(200, 2, 0, 4, 'input'),
			underground(300, 4, 0, 4, 'output'),
		];

		expect(lintBlueprint(makeBlueprint(entities))).toStrictEqual([
			{
				ruleId: 'unpaired-underground-belt',
				severity: 'warning',
				message: 'Underground belt "underground-belt" at (0, 0) has no paired output.',
				entityNumbers: [100],
			},
		]);
	});

	test('does not pair an output facing a different direction', () => {
		const entities = [underground(100, 0, 0, 4, 'input'), underground(200, 5, 0, 12, 'output')];

		expect(lintBlueprint(makeBlueprint(entities))).toStrictEqual([
			{
				ruleId: 'unpaired-underground-belt',
				severity: 'warning',
				message: 'Underground belt "underground-belt" at (0, 0) has no paired output.',
				entityNumbers: [100],
			},
			{
				ruleId: 'unpaired-underground-belt',
				severity: 'warning',
				message: 'Underground belt "underground-belt" at (5, 0) has no paired input.',
				entityNumbers: [200],
			},
		]);
	});

	test('skips non-cardinal and unknown modded undergrounds', () => {
		const entities = [
			underground(100, 0, 0, 1, 'input'),
			underground(200, 10, 0, 4, 'input', 'alice-underground-belt'),
		];

		expect(lintBlueprint(makeBlueprint(entities))).toStrictEqual([]);
	});

	test.each([
		{
			fixture: 'txt/lint-underground-boundaries-1.1.txt',
			expectedFindings: [
				expectedUnpaired(102, 'underground-belt', 0, 1, 'output'),
				expectedUnpaired(103, 'underground-belt', 6, 1, 'input'),
				expectedUnpaired(106, 'fast-underground-belt', 0, 11, 'output'),
				expectedUnpaired(107, 'fast-underground-belt', 8, 11, 'input'),
				expectedUnpaired(110, 'express-underground-belt', 0, 21, 'output'),
				expectedUnpaired(111, 'express-underground-belt', 10, 21, 'input'),
			],
		},
		{
			fixture: 'txt/lint-underground-boundaries-2.0.txt',
			expectedFindings: [
				expectedUnpaired(102, 'underground-belt', 0, 1, 'output'),
				expectedUnpaired(103, 'underground-belt', 6, 1, 'input'),
				expectedUnpaired(106, 'fast-underground-belt', 0, 11, 'output'),
				expectedUnpaired(107, 'fast-underground-belt', 8, 11, 'input'),
				expectedUnpaired(110, 'express-underground-belt', 0, 21, 'output'),
				expectedUnpaired(111, 'express-underground-belt', 10, 21, 'input'),
				expectedUnpaired(114, 'turbo-underground-belt', 0, 31, 'output'),
				expectedUnpaired(115, 'turbo-underground-belt', 12, 31, 'input'),
			],
		},
	])('pins maximum and over-span boundaries in $fixture', ({fixture, expectedFindings}) => {
		const blueprint = deserializeBlueprint(readFixtureFile(fixture));
		const findings = lintBlueprint(blueprint);

		expect(findings).toStrictEqual(expectedFindings);
	});
});
