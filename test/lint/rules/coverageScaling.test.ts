import {describe, expect, test} from 'vite-plus/test';

import {buildLintContext} from '../../../src/lint/engine';
import {powerPoleCoverageRule} from '../../../src/lint/rules/powerPoleCoverage';
import type {Entity} from '../../../src/parsing/types';
import {makeBlueprint} from '../helpers';

// Megabase-sized blueprints have hundreds of thousands of entities; coverage must not compare every pair.
function grid(
	name: string,
	count: number,
	columns: number,
	spacing: number,
	origin: number,
	firstNumber: number,
): Entity[] {
	return Array.from({length: count}, (_, index) => ({
		entity_number: firstNumber + index,
		name,
		position: {
			x: origin + (index % columns) * spacing + 0.5,
			y: origin + Math.floor(index / columns) * spacing + 0.5,
		},
	}));
}

describe('power pole coverage at megabase scale', () => {
	test('finishes quickly with many poles and many powered entities', () => {
		// Small poles 5 apart leave no gaps in their 5x5 supply areas.
		const poles = grid('small-electric-pole', 10_000, 100, 5, 0, 1);
		const covered = grid('inserter', 50_000, 240, 2, 0, 20_001);
		const uncovered = grid('inserter', 100, 10, 2, 800, 80_001);
		const blueprint = makeBlueprint([...poles, ...covered, ...uncovered]).blueprint;
		if (!blueprint) throw new Error('Expected blueprint test data');
		const context = buildLintContext(blueprint);

		const start = performance.now();
		const findings = powerPoleCoverageRule.run(context);
		const elapsed = performance.now() - start;

		expect({unpowered: findings.length, fast: elapsed < 1_500}).toStrictEqual({unpowered: 100, fast: true});
	});
});
