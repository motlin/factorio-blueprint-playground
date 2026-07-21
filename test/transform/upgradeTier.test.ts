import {describe, expect, test} from 'vite-plus/test';

import type {BlueprintString, Entity} from '../../src/parsing/types';
import {shiftTier} from '../../src/transform/upgradeTier';

function blueprintWithEntities(entities: Entity[]): BlueprintString {
	return {
		blueprint: {
			item: 'blueprint',
			version: 0,
			icons: [{index: 1, signal: {type: 'entity', name: entities[0]?.name ?? 'transport-belt'}}],
			entities,
		},
	};
}

describe('shiftTier', () => {
	test('upgrades entities and remaps matching icons by default', () => {
		const input = blueprintWithEntities([
			{entity_number: 1, name: 'transport-belt', position: {x: 0, y: 0}},
			{entity_number: 2, name: 'stone-furnace', position: {x: 1, y: 0}},
		]);

		expect(shiftTier(input, 1)).toStrictEqual({
			blueprint: {
				item: 'blueprint',
				version: 0,
				icons: [{index: 1, signal: {type: 'entity', name: 'fast-transport-belt'}}],
				entities: [
					{entity_number: 1, name: 'fast-transport-belt', position: {x: 0, y: 0}},
					{entity_number: 2, name: 'stone-furnace', position: {x: 1, y: 0}},
				],
			},
		});
		expect(input).toStrictEqual(
			blueprintWithEntities([
				{entity_number: 1, name: 'transport-belt', position: {x: 0, y: 0}},
				{entity_number: 2, name: 'stone-furnace', position: {x: 1, y: 0}},
			]),
		);
	});

	test('clamps upgrades at the highest non-Space Age tier by default', () => {
		const input = blueprintWithEntities([
			{entity_number: 1, name: 'express-transport-belt', position: {x: 0, y: 0}},
		]);

		expect(shiftTier(input, 1)).toStrictEqual(input);
	});

	test('upgrades into Space Age tiers when enabled', () => {
		const input = blueprintWithEntities([{entity_number: 1, name: 'express-splitter', position: {x: 0, y: 0}}]);

		expect(shiftTier(input, 1, {includeSpaceAge: true})).toStrictEqual({
			blueprint: {
				item: 'blueprint',
				version: 0,
				icons: [{index: 1, signal: {type: 'entity', name: 'turbo-splitter'}}],
				entities: [{entity_number: 1, name: 'turbo-splitter', position: {x: 0, y: 0}}],
			},
		});
	});

	test('downgrades from a Space Age tier without requiring the option', () => {
		const input = blueprintWithEntities([
			{entity_number: 1, name: 'turbo-underground-belt', position: {x: 0, y: 0}},
		]);

		expect(shiftTier(input, -1)).toStrictEqual({
			blueprint: {
				item: 'blueprint',
				version: 0,
				icons: [{index: 1, signal: {type: 'entity', name: 'express-underground-belt'}}],
				entities: [{entity_number: 1, name: 'express-underground-belt', position: {x: 0, y: 0}}],
			},
		});
	});

	test('preserves underground belt direction and input type', () => {
		const input = blueprintWithEntities([
			{
				entity_number: 1,
				name: 'fast-underground-belt',
				position: {x: 0, y: 0},
				direction: 6,
				type: 'input',
			},
		]);

		expect(shiftTier(input, 1, {remapIcons: false})).toStrictEqual({
			blueprint: {
				item: 'blueprint',
				version: 0,
				icons: [{index: 1, signal: {type: 'entity', name: 'fast-underground-belt'}}],
				entities: [
					{
						entity_number: 1,
						name: 'express-underground-belt',
						position: {x: 0, y: 0},
						direction: 6,
						type: 'input',
					},
				],
			},
		});
	});

	test('recurses through books and passes planners through', () => {
		const input: BlueprintString = {
			blueprint_book: {
				item: 'blueprint-book',
				version: 0,
				blueprints: [
					{
						index: 0,
						...blueprintWithEntities([{entity_number: 1, name: 'inserter', position: {x: 0, y: 0}}]),
					},
					{
						index: 1,
						deconstruction_planner: {
							item: 'deconstruction-planner',
							version: 0,
							settings: {},
						},
					},
				],
			},
		};

		expect(shiftTier(input, 1)).toStrictEqual({
			blueprint_book: {
				item: 'blueprint-book',
				version: 0,
				blueprints: [
					{
						index: 0,
						blueprint: {
							item: 'blueprint',
							version: 0,
							icons: [{index: 1, signal: {type: 'entity', name: 'fast-inserter'}}],
							entities: [{entity_number: 1, name: 'fast-inserter', position: {x: 0, y: 0}}],
						},
					},
					{
						index: 1,
						deconstruction_planner: {
							item: 'deconstruction-planner',
							version: 0,
							settings: {},
						},
					},
				],
			},
		});
	});

	test('returns empty and planner roots unchanged', () => {
		const empty: BlueprintString = {};
		const planner: BlueprintString = {
			upgrade_planner: {item: 'upgrade-planner', version: 0, settings: {mappers: []}},
		};

		expect({empty: shiftTier(empty, -1), planner: shiftTier(planner, 1)}).toStrictEqual({empty, planner});
	});
});
