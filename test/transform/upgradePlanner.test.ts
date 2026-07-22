import {describe, expect, test} from 'vite-plus/test';

import {serializeBlueprint} from '../../src/parsing/blueprintParser';
import type {BlueprintString, UpgradePlanner} from '../../src/parsing/types';
import {
	analyzeIconReplacements,
	analyzeMetadataIcons,
	analyzeMetadataSubstitution,
	applyIconReplacements,
	applyMetadataSubstitution,
} from '../../src/transform/metadataSubstitution';
import {
	analyzeUpgradeRules,
	applyUpgradeRules,
	builtInUpgradeRules,
	findUpgradePlanners,
	parseUpgradePlanner,
	rulesFromUpgradePlanner,
	type UpgradeRule,
} from '../../src/transform/upgradePlanner';

function preservingUpgrade(from: string, to: string): UpgradeRule {
	return {
		from: {type: 'entity', name: from},
		preserveQuality: true,
		to: {type: 'entity', name: to},
	};
}

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
			upgrade: builtInUpgradeRules('upgrade'),
			downgrade: builtInUpgradeRules('downgrade'),
		}).toStrictEqual({
			upgrade: [
				preservingUpgrade('assembling-machine-1', 'assembling-machine-2'),
				preservingUpgrade('assembling-machine-2', 'assembling-machine-3'),
				preservingUpgrade('inserter', 'fast-inserter'),
				preservingUpgrade('fast-inserter', 'bulk-inserter'),
				preservingUpgrade('splitter', 'fast-splitter'),
				preservingUpgrade('fast-splitter', 'express-splitter'),
				preservingUpgrade('express-splitter', 'turbo-splitter'),
				preservingUpgrade('stone-furnace', 'steel-furnace'),
				preservingUpgrade('transport-belt', 'fast-transport-belt'),
				preservingUpgrade('fast-transport-belt', 'express-transport-belt'),
				preservingUpgrade('express-transport-belt', 'turbo-transport-belt'),
				preservingUpgrade('underground-belt', 'fast-underground-belt'),
				preservingUpgrade('fast-underground-belt', 'express-underground-belt'),
				preservingUpgrade('express-underground-belt', 'turbo-underground-belt'),
			],
			downgrade: [
				preservingUpgrade('assembling-machine-2', 'assembling-machine-1'),
				preservingUpgrade('assembling-machine-3', 'assembling-machine-2'),
				preservingUpgrade('fast-inserter', 'inserter'),
				preservingUpgrade('bulk-inserter', 'fast-inserter'),
				preservingUpgrade('fast-splitter', 'splitter'),
				preservingUpgrade('express-splitter', 'fast-splitter'),
				preservingUpgrade('turbo-splitter', 'express-splitter'),
				preservingUpgrade('steel-furnace', 'stone-furnace'),
				preservingUpgrade('fast-transport-belt', 'transport-belt'),
				preservingUpgrade('express-transport-belt', 'fast-transport-belt'),
				preservingUpgrade('turbo-transport-belt', 'express-transport-belt'),
				preservingUpgrade('fast-underground-belt', 'underground-belt'),
				preservingUpgrade('express-underground-belt', 'fast-underground-belt'),
				preservingUpgrade('turbo-underground-belt', 'express-underground-belt'),
			],
		});
	});

	test('analyzes and applies suggested entity replacements without inventing a bulk inserter upgrade', () => {
		const input: BlueprintString = {
			blueprint: {
				item: 'blueprint',
				version: 0,
				icons: [
					{index: 1, signal: {type: 'entity', name: 'transport-belt'}},
					{index: 2, signal: {type: 'virtual', name: 'signal-each'}},
					{index: 3, signal: {type: 'item', name: 'fast-transport-belt'}},
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
					from: {type: 'entity', name: 'stone-furnace'},
					preserveQuality: true,
					to: {type: 'entity', name: 'steel-furnace'},
					count: 1,
				},
				{
					from: {type: 'entity', name: 'transport-belt'},
					preserveQuality: true,
					to: {type: 'entity', name: 'fast-transport-belt'},
					count: 2,
				},
			],
			result: {
				blueprint: {
					item: 'blueprint',
					version: 0,
					icons: [
						{index: 1, signal: {type: 'entity', name: 'fast-transport-belt'}},
						{index: 2, signal: {type: 'virtual', name: 'signal-each'}},
						{index: 3, signal: {type: 'item', name: 'express-transport-belt'}},
					],
					entities: [
						{entity_number: 100, name: 'fast-transport-belt', position: {x: 0, y: 0}},
						{entity_number: 200, name: 'steel-furnace', position: {x: 10, y: 0}},
						{entity_number: 300, name: 'bulk-inserter', position: {x: 20, y: 0}},
						{entity_number: 400, name: 'fast-transport-belt', quality: 'rare', position: {x: 30, y: 0}},
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
					preserveQuality: false,
					to: {type: 'item', name: 'speed-module-2'},
					count: 2,
				},
				{
					from: {type: 'entity', name: 'assembling-machine-1', quality: 'rare'},
					preserveQuality: false,
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

	test('substitutes labels, descriptions, and icon names throughout a book while preserving case', () => {
		const input: BlueprintString = {
			blueprint_book: {
				item: 'blueprint-book',
				label: "Alice's Red book",
				description: 'red RED Red',
				version: 0,
				icons: [{index: 1, signal: {type: 'virtual', name: 'signal-red'}}],
				blueprints: [
					{
						index: 100,
						blueprint: {
							item: 'blueprint',
							label: '[virtual-signal=signal-red] Red balancer',
							description: 'No match',
							version: 0,
							icons: [{index: 1, signal: {type: 'virtual', name: 'signal-green'}}],
						},
					},
					{
						index: 200,
						upgrade_planner: {
							item: 'upgrade-planner',
							label: 'Red planner',
							version: 0,
							settings: {
								description: 'Replace red',
								icons: [{index: 1, signal: {type: 'virtual', name: 'signal-red'}}],
								mappers: [],
							},
						},
					},
					{
						index: 300,
						deconstruction_planner: {
							item: 'deconstruction-planner',
							version: 0,
							settings: {
								description: 'RED only',
								icons: [{index: 1, signal: {type: 'virtual', name: 'signal-red'}}],
							},
						},
					},
				],
			},
		};
		const substitution = {find: 'red', replace: 'blue', matchCase: false};

		expect({
			count: analyzeMetadataSubstitution(input, substitution),
			result: applyMetadataSubstitution(input, substitution),
		}).toStrictEqual({
			count: 9,
			result: {
				blueprint_book: {
					item: 'blueprint-book',
					label: "Alice's Blue book",
					description: 'blue BLUE Blue',
					version: 0,
					icons: [{index: 1, signal: {type: 'virtual', name: 'signal-red'}}],
					blueprints: [
						{
							index: 100,
							blueprint: {
								item: 'blueprint',
								label: '[virtual-signal=signal-blue] Blue balancer',
								description: 'No match',
								version: 0,
								icons: [{index: 1, signal: {type: 'virtual', name: 'signal-green'}}],
							},
						},
						{
							index: 200,
							upgrade_planner: {
								item: 'upgrade-planner',
								label: 'Blue planner',
								version: 0,
								settings: {
									description: 'Replace blue',
									icons: [{index: 1, signal: {type: 'virtual', name: 'signal-red'}}],
									mappers: [],
								},
							},
						},
						{
							index: 300,
							deconstruction_planner: {
								item: 'deconstruction-planner',
								version: 0,
								settings: {
									description: 'BLUE only',
									icons: [{index: 1, signal: {type: 'virtual', name: 'signal-red'}}],
								},
							},
						},
					],
				},
			},
		});
	});

	test('discovers and replaces metadata icons by typed signal identity', () => {
		const input: BlueprintString = {
			blueprint_book: {
				item: 'blueprint-book',
				version: 0,
				icons: [{index: 1, signal: {type: 'virtual', name: 'signal-red'}}],
				blueprints: [
					{
						index: 100,
						blueprint: {
							item: 'blueprint',
							version: 0,
							icons: [
								{index: 1, signal: {type: 'virtual', name: 'signal-red'}},
								{index: 2, signal: {type: 'virtual', name: 'signal-green'}},
							],
						},
					},
				],
			},
		};
		const replacements = [
			{from: {type: 'virtual' as const, name: 'signal-red'}, to: {type: 'virtual' as const, name: 'signal-blue'}},
		];

		expect({
			candidates: analyzeMetadataIcons(input),
			count: analyzeIconReplacements(input, replacements),
			result: applyIconReplacements(input, replacements),
		}).toStrictEqual({
			candidates: [
				{count: 2, signal: {type: 'virtual', name: 'signal-red'}},
				{count: 1, signal: {type: 'virtual', name: 'signal-green'}},
			],
			count: 2,
			result: {
				blueprint_book: {
					item: 'blueprint-book',
					version: 0,
					icons: [{index: 1, signal: {type: 'virtual', name: 'signal-blue'}}],
					blueprints: [
						{
							index: 100,
							blueprint: {
								item: 'blueprint',
								version: 0,
								icons: [
									{index: 1, signal: {type: 'virtual', name: 'signal-blue'}},
									{index: 2, signal: {type: 'virtual', name: 'signal-green'}},
								],
							},
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
