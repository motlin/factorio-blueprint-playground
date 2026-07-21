import {describe, expect, test} from 'vite-plus/test';

import {buildLintContext, lintBlueprint} from '../../src/lint/engine';
import type {BlueprintString} from '../../src/parsing/types';

import {makeBlueprint} from './helpers';

describe('lint engine', () => {
	test('builds a reusable context from a blueprint', () => {
		const wrapper = makeBlueprint([{entity_number: 100, name: 'inserter', position: {x: 0, y: 0}, direction: 4}]);
		const blueprint = wrapper.blueprint;
		if (!blueprint) throw new Error('Expected blueprint test data');

		const context = buildLintContext(blueprint);

		expect({
			entities: context.entities,
			entityByNumber: context.entityByNumber,
			entitiesAtOrigin: context.index.entitiesAt(0, 0),
			direction: context.direction(context.entities[0]),
		}).toStrictEqual({
			entities: blueprint.entities,
			entityByNumber: new Map([[100, blueprint.entities?.[0]]]),
			entitiesAtOrigin: blueprint.entities,
			direction: 4,
		});
	});

	test('does not lint books or planners', () => {
		const inputs: BlueprintString[] = [
			{blueprint_book: {item: 'blueprint-book', version: 562949958139904, blueprints: []}},
			{upgrade_planner: {item: 'upgrade-planner', version: 562949958139904, settings: {mappers: []}}},
			{
				deconstruction_planner: {
					item: 'deconstruction-planner',
					version: 562949958139904,
					settings: {},
				},
			},
		];

		expect(inputs.map((input) => lintBlueprint(input))).toStrictEqual([[], [], []]);
	});

	test('reports an empty blueprint', () => {
		expect(lintBlueprint(makeBlueprint())).toStrictEqual([
			{
				ruleId: 'empty-blueprint',
				severity: 'info',
				message: 'Blueprint contains no entities or tiles.',
				entityNumbers: [],
			},
		]);
	});

	test('does not report an otherwise valid blueprint with an entity', () => {
		expect(
			lintBlueprint(makeBlueprint([{entity_number: 100, name: 'alice-modded-entity', position: {x: 0, y: 0}}])),
		).toStrictEqual([]);
	});
});
