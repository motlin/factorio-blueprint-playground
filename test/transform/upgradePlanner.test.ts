import {describe, expect, test} from 'vite-plus/test';

import {serializeBlueprint} from '../../src/parsing/blueprintParser';
import type {BlueprintString, UpgradePlanner} from '../../src/parsing/types';
import {
	analyzeUpgradeRules,
	applyUpgradeRules,
	builtInUpgradeRules,
	findUpgradePlanners,
	parseUpgradePlanner,
	rulesFromUpgradePlanner,
} from '../../src/transform/upgradePlanner';

const configuredPlanner: UpgradePlanner = {
	item: 'upgrade-planner',
	label: "Alice's replacements",
	version: 0,
	settings: {
		mappers: [
			{
				index: 10,
				from: {type: 'item', name: 'speed-module'},
				to: {type: 'item', name: 'speed-module-2'},
			},
			{
				index: 20,
				from: {type: 'entity', name: 'assembling-machine-1', quality: 'rare'},
				to: {type: 'entity', name: 'assembling-machine-2', quality: 'epic'},
			},
		],
	},
};

describe('upgrade planner transforms', () => {
	test('defines Factorio next-upgrade suggestions and their reverse mappings', () => {
		expect({
			upgrade: builtInUpgradeRules('upgrade', true),
			downgrade: builtInUpgradeRules('downgrade'),
		}).toStrictEqual({
			upgrade: [
				{from: {type: 'entity', name: 'transport-belt'}, to: {type: 'entity', name: 'fast-transport-belt'}},
				{
					from: {type: 'entity', name: 'fast-transport-belt'},
					to: {type: 'entity', name: 'express-transport-belt'},
				},
				{
					from: {type: 'entity', name: 'express-transport-belt'},
					to: {type: 'entity', name: 'turbo-transport-belt'},
				},
				{from: {type: 'entity', name: 'underground-belt'}, to: {type: 'entity', name: 'fast-underground-belt'}},
				{
					from: {type: 'entity', name: 'fast-underground-belt'},
					to: {type: 'entity', name: 'express-underground-belt'},
				},
				{
					from: {type: 'entity', name: 'express-underground-belt'},
					to: {type: 'entity', name: 'turbo-underground-belt'},
				},
				{from: {type: 'entity', name: 'splitter'}, to: {type: 'entity', name: 'fast-splitter'}},
				{from: {type: 'entity', name: 'fast-splitter'}, to: {type: 'entity', name: 'express-splitter'}},
				{from: {type: 'entity', name: 'express-splitter'}, to: {type: 'entity', name: 'turbo-splitter'}},
				{from: {type: 'entity', name: 'inserter'}, to: {type: 'entity', name: 'fast-inserter'}},
				{from: {type: 'entity', name: 'fast-inserter'}, to: {type: 'entity', name: 'bulk-inserter'}},
				{from: {type: 'entity', name: 'stone-furnace'}, to: {type: 'entity', name: 'steel-furnace'}},
				{
					from: {type: 'entity', name: 'assembling-machine-1'},
					to: {type: 'entity', name: 'assembling-machine-2'},
				},
				{
					from: {type: 'entity', name: 'assembling-machine-2'},
					to: {type: 'entity', name: 'assembling-machine-3'},
				},
			],
			downgrade: [
				{from: {type: 'entity', name: 'fast-transport-belt'}, to: {type: 'entity', name: 'transport-belt'}},
				{
					from: {type: 'entity', name: 'express-transport-belt'},
					to: {type: 'entity', name: 'fast-transport-belt'},
				},
				{
					from: {type: 'entity', name: 'turbo-transport-belt'},
					to: {type: 'entity', name: 'express-transport-belt'},
				},
				{from: {type: 'entity', name: 'fast-underground-belt'}, to: {type: 'entity', name: 'underground-belt'}},
				{
					from: {type: 'entity', name: 'express-underground-belt'},
					to: {type: 'entity', name: 'fast-underground-belt'},
				},
				{
					from: {type: 'entity', name: 'turbo-underground-belt'},
					to: {type: 'entity', name: 'express-underground-belt'},
				},
				{from: {type: 'entity', name: 'fast-splitter'}, to: {type: 'entity', name: 'splitter'}},
				{from: {type: 'entity', name: 'express-splitter'}, to: {type: 'entity', name: 'fast-splitter'}},
				{from: {type: 'entity', name: 'turbo-splitter'}, to: {type: 'entity', name: 'express-splitter'}},
				{from: {type: 'entity', name: 'fast-inserter'}, to: {type: 'entity', name: 'inserter'}},
				{from: {type: 'entity', name: 'bulk-inserter'}, to: {type: 'entity', name: 'fast-inserter'}},
				{from: {type: 'entity', name: 'steel-furnace'}, to: {type: 'entity', name: 'stone-furnace'}},
				{
					from: {type: 'entity', name: 'assembling-machine-2'},
					to: {type: 'entity', name: 'assembling-machine-1'},
				},
				{
					from: {type: 'entity', name: 'assembling-machine-3'},
					to: {type: 'entity', name: 'assembling-machine-2'},
				},
			],
		});
		expect(builtInUpgradeRules('upgrade').map((rule) => rule.to.name)).toStrictEqual([
			'fast-transport-belt',
			'express-transport-belt',
			'fast-underground-belt',
			'express-underground-belt',
			'fast-splitter',
			'express-splitter',
			'fast-inserter',
			'bulk-inserter',
			'steel-furnace',
			'assembling-machine-2',
			'assembling-machine-3',
		]);
	});

	test('analyzes and applies suggested entity replacements without inventing a bulk inserter upgrade', () => {
		const input: BlueprintString = {
			blueprint: {
				item: 'blueprint',
				version: 0,
				icons: [
					{index: 1, signal: {type: 'entity', name: 'transport-belt'}},
					{index: 2, signal: {type: 'virtual', name: 'signal-each'}},
				],
				entities: [
					{entity_number: 100, name: 'transport-belt', position: {x: 0, y: 0}},
					{entity_number: 200, name: 'stone-furnace', position: {x: 10, y: 0}},
					{entity_number: 300, name: 'bulk-inserter', position: {x: 20, y: 0}},
					{entity_number: 400, name: 'transport-belt', quality: 'rare', position: {x: 30, y: 0}},
				],
			},
		};
		const rules = builtInUpgradeRules('upgrade');

		expect({candidates: analyzeUpgradeRules(input, rules), result: applyUpgradeRules(input, rules)}).toStrictEqual({
			candidates: [
				{
					from: {type: 'entity', name: 'transport-belt'},
					to: {type: 'entity', name: 'fast-transport-belt'},
					count: 1,
				},
				{
					from: {type: 'entity', name: 'stone-furnace'},
					to: {type: 'entity', name: 'steel-furnace'},
					count: 1,
				},
			],
			result: {
				blueprint: {
					item: 'blueprint',
					version: 0,
					icons: [
						{index: 1, signal: {type: 'entity', name: 'fast-transport-belt'}},
						{index: 2, signal: {type: 'virtual', name: 'signal-each'}},
					],
					entities: [
						{entity_number: 100, name: 'fast-transport-belt', position: {x: 0, y: 0}},
						{entity_number: 200, name: 'steel-furnace', position: {x: 10, y: 0}},
						{entity_number: 300, name: 'bulk-inserter', position: {x: 20, y: 0}},
						{entity_number: 400, name: 'transport-belt', quality: 'rare', position: {x: 30, y: 0}},
					],
				},
			},
		});
	});

	test('applies configured entity, quality, and module mappings', () => {
		const input: BlueprintString = {
			blueprint: {
				item: 'blueprint',
				version: 0,
				entities: [
					{
						entity_number: 100,
						name: 'assembling-machine-1',
						quality: 'rare',
						position: {x: 0, y: 0},
						items: [
							{
								id: {name: 'speed-module'},
								items: {in_inventory: [{inventory: 1, stack: 0, count: 2}]},
							},
						],
					},
				],
			},
		};
		const rules = rulesFromUpgradePlanner(configuredPlanner);

		expect({candidates: analyzeUpgradeRules(input, rules), result: applyUpgradeRules(input, rules)}).toStrictEqual({
			candidates: [
				{
					from: {type: 'item', name: 'speed-module'},
					to: {type: 'item', name: 'speed-module-2'},
					count: 2,
				},
				{
					from: {type: 'entity', name: 'assembling-machine-1', quality: 'rare'},
					to: {type: 'entity', name: 'assembling-machine-2', quality: 'epic'},
					count: 1,
				},
			],
			result: {
				blueprint: {
					item: 'blueprint',
					version: 0,
					entities: [
						{
							entity_number: 100,
							name: 'assembling-machine-2',
							quality: 'epic',
							position: {x: 0, y: 0},
							items: [
								{
									id: {name: 'speed-module-2'},
									items: {in_inventory: [{inventory: 1, stack: 0, count: 2}]},
								},
							],
						},
					],
				},
			},
		});
	});

	test('parses encoded and JSON5 planners and treats a blank planner as suggested upgrades', () => {
		const encoded = serializeBlueprint({upgrade_planner: configuredPlanner});
		const json5 = `{
			upgrade_planner: {
				item: 'upgrade-planner',
				version: 0,
				settings: {mappers: []},
			},
		}`;
		const blankPlanner = parseUpgradePlanner(json5);

		expect({
			encoded: parseUpgradePlanner(encoded),
			json5: blankPlanner,
			blankRules: rulesFromUpgradePlanner(blankPlanner),
		}).toStrictEqual({
			encoded: configuredPlanner,
			json5: {item: 'upgrade-planner', version: 0, settings: {mappers: []}},
			blankRules: builtInUpgradeRules('upgrade'),
		});
	});

	test('rejects incomplete and ambiguous configured mappings', () => {
		const incomplete: UpgradePlanner = {
			item: 'upgrade-planner',
			version: 0,
			settings: {mappers: [{index: 100, from: {type: 'entity', name: 'transport-belt'}}]},
		};
		const ambiguous: UpgradePlanner = {
			item: 'upgrade-planner',
			version: 0,
			settings: {
				mappers: [
					{
						index: 100,
						from: {type: 'entity', name: 'transport-belt'},
						to: {type: 'entity', name: 'fast-transport-belt'},
					},
					{
						index: 200,
						from: {type: 'entity', name: 'transport-belt'},
						to: {type: 'entity', name: 'express-transport-belt'},
					},
				],
			},
		};

		expect(() => rulesFromUpgradePlanner(incomplete)).toThrow(
			new Error('Upgrade planner mapping 100 must define both from and to.'),
		);
		expect(() => rulesFromUpgradePlanner(ambiguous)).toThrow(
			new Error('Upgrade planner defines more than one target for transport-belt.'),
		);
	});

	test('finds labeled and nested upgrade planners with book-selection paths', () => {
		const root: BlueprintString = {
			blueprint_book: {
				item: 'blueprint-book',
				version: 0,
				blueprints: [
					{index: 100, upgrade_planner: configuredPlanner},
					{
						index: 200,
						blueprint_book: {
							item: 'blueprint-book',
							version: 0,
							blueprints: [
								{
									index: 300,
									upgrade_planner: {item: 'upgrade-planner', version: 0, settings: {mappers: []}},
								},
							],
						},
					},
				],
			},
		};

		expect(findUpgradePlanners(root)).toStrictEqual([
			{path: '1', label: "Alice's replacements", planner: configuredPlanner},
			{
				path: '2.1',
				label: 'Upgrade planner at 2.1',
				planner: {item: 'upgrade-planner', version: 0, settings: {mappers: []}},
			},
		]);
	});
});
