import {describe, expect, test} from 'vite-plus/test';

import {buildLintContext} from '../../../src/lint/engine';
import {labeledInputsOutputsRule} from '../../../src/lint/rules/labeledInputsOutputs';
import type {LintFinding} from '../../../src/lint/types';
import type {BlueprintString, Entity} from '../../../src/parsing/types';
import {makeBlueprint} from '../helpers';

function label2(entityNumber: number, x: number, y: number, ...signals: string[]): Entity {
	return {
		entity_number: entityNumber,
		name: 'constant-combinator',
		position: {x, y},
		control_behavior: {
			sections: {
				sections: [{index: 1, filters: signals.map((name, index) => ({index: index + 1, name, count: 1}))}],
			},
		},
	};
}

function label11(entityNumber: number, x: number, y: number, signal: string): Entity {
	return {
		entity_number: entityNumber,
		name: 'constant-combinator',
		position: {x, y},
		control_behavior: {filters: [{signal: {type: 'item', name: signal}, count: 1, index: 1}]},
	};
}

function run(blueprintString: BlueprintString): LintFinding[] {
	const blueprint = blueprintString.blueprint;
	if (!blueprint) throw new Error('Expected blueprint test data');
	return labeledInputsOutputsRule.run(buildLintContext(blueprint));
}

describe('labeled-inputs-outputs rule', () => {
	test('praises single-signal, unwired combinators at the edge as input and output labels', () => {
		const blueprintString = makeBlueprint(
			[
				label2(1, 0.5, 0.5, 'iron-plate'),
				label2(2, 1.5, 0.5, 'lubricant'),
				label2(3, 2.5, 0.5, 'copper-plate'),
				label2(4, 3.5, 0.5, 'coal', 'stone'),
				label2(5, 5.5, 5.5, 'battery'),
				{entity_number: 6, name: 'wooden-chest', position: {x: 10.5, y: 10.5}},
			],
			2,
			{atEdges: true},
		);
		const blueprint = blueprintString.blueprint;
		if (!blueprint) throw new Error('Expected blueprint test data');
		blueprint.wires = [[3, 1, 6, 1]];

		expect(run(blueprintString)).toStrictEqual([
			{
				ruleId: 'labeled-inputs-outputs',
				severity: 'good',
				message: 'Labels its inputs and outputs: iron-plate, lubricant.',
				entityNumbers: [1, 2],
			},
		]);
	});

	test('recognizes Factorio 1.1 labels and skips ones with circuit connections', () => {
		const wired = {...label11(2, 1.5, 0.5, 'steel-plate'), connections: {'1': {red: [{entity_id: 3}]}}};
		const blueprintString = makeBlueprint(
			[
				label11(1, 0.5, 0.5, 'iron-gear-wheel'),
				wired,
				{entity_number: 3, name: 'wooden-chest', position: {x: 10.5, y: 10.5}},
			],
			1,
			{atEdges: true},
		);

		expect(run(blueprintString).map((finding) => finding.message)).toStrictEqual([
			'Labels its inputs and outputs: iron-gear-wheel.',
		]);
	});

	test('says nothing when there are no labels', () => {
		expect(
			run(makeBlueprint([{entity_number: 1, name: 'wooden-chest', position: {x: 0.5, y: 0.5}}])),
		).toStrictEqual([]);
	});
});
