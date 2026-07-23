import {describe, expect, test} from 'vite-plus/test';

import {serializeBlueprint} from '../../src/parsing/blueprintParser';
import type {BlueprintString, Entity, UpgradePlanner} from '../../src/parsing/types';
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

const qualityComparisonEntities: Entity[] = [
	{entity_number: 100, name: 'transport-belt', position: {x: 0, y: 0}},
	{entity_number: 200, name: 'transport-belt', quality: 'uncommon', position: {x: 1, y: 0}},
	{entity_number: 300, name: 'transport-belt', quality: 'rare', position: {x: 2, y: 0}},
	{entity_number: 400, name: 'transport-belt', quality: 'epic', position: {x: 3, y: 0}},
	{entity_number: 500, name: 'transport-belt', quality: 'legendary', position: {x: 4, y: 0}},
];

const qualityComparisonBlueprint: BlueprintString = {
	blueprint: {
		item: 'blueprint',
		version: 0,
		entities: qualityComparisonEntities,
	},
};

function expectedQualityComparisonBlueprint(matchingEntityNumbers: readonly number[]): BlueprintString {
	const matching = new Set(matchingEntityNumbers);
	return {
		blueprint: {
			item: 'blueprint',
			version: 0,
			entities: qualityComparisonEntities.map((entity) =>
				matching.has(entity.entity_number)
					? {...entity, name: 'express-transport-belt', quality: 'legendary'}
					: entity,
			),
		},
	};
}

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
					preserveQuality: true,
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

	test('reverses every configured mapping when downgrading', () => {
		expect(rulesFromUpgradePlanner(configuredPlanner, 'downgrade')).toStrictEqual([
			{
				from: {type: 'item', name: 'speed-module-2'},
				preserveQuality: true,
				to: {type: 'item', name: 'speed-module'},
			},
			{
				from: {type: 'entity', name: 'assembling-machine-2', quality: 'epic'},
				preserveQuality: false,
				to: {type: 'entity', name: 'assembling-machine-1', quality: 'rare'},
			},
		]);
	});

	test('applies configured mappings in forward and reverse directions', () => {
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
					},
				],
			},
		};
		const upgraded: BlueprintString = {
			blueprint: {
				item: 'blueprint',
				version: 0,
				entities: [
					{
						entity_number: 100,
						name: 'assembling-machine-2',
						quality: 'epic',
						position: {x: 0, y: 0},
					},
				],
			},
		};

		expect({
			downgraded: applyUpgradeRules(upgraded, rulesFromUpgradePlanner(configuredPlanner, 'downgrade')),
			upgraded: applyUpgradeRules(input, rulesFromUpgradePlanner(configuredPlanner, 'upgrade')),
		}).toStrictEqual({
			downgraded: input,
			upgraded,
		});
	});

	test('keeps pasted mappings available when the current blueprint has zero matches', () => {
		const input: BlueprintString = {
			blueprint: {
				item: 'blueprint',
				version: 0,
				entities: [{entity_number: 100, name: 'stone-furnace', position: {x: 0, y: 0}}],
			},
		};
		const planner: UpgradePlanner = {
			item: 'upgrade-planner',
			label: "Alice's pasted planner",
			version: 0,
			settings: {
				mappers: [
					{
						index: 100,
						from: {type: 'entity', name: 'transport-belt'},
						to: {type: 'entity', name: 'fast-transport-belt'},
					},
				],
			},
		};
		const parsed = parseUpgradePlanner(serializeBlueprint({upgrade_planner: planner}));
		const rules = rulesFromUpgradePlanner(parsed);

		expect({
			candidates: analyzeUpgradeRules(input, rules),
			parsed,
			result: applyUpgradeRules(input, rules),
			rules,
		}).toStrictEqual({
			candidates: [],
			parsed: planner,
			result: input,
			rules: [
				{
					from: {type: 'entity', name: 'transport-belt'},
					preserveQuality: true,
					to: {type: 'entity', name: 'fast-transport-belt'},
				},
			],
		});
	});

	test.each([
		{comparator: '=', matchingEntityNumbers: [300]},
		{comparator: '≠', matchingEntityNumbers: [100, 200, 400, 500]},
		{comparator: '<', matchingEntityNumbers: [100, 200]},
		{comparator: '≤', matchingEntityNumbers: [100, 200, 300]},
		{comparator: '>', matchingEntityNumbers: [400, 500]},
		{comparator: '≥', matchingEntityNumbers: [300, 400, 500]},
	] as const)('applies the $comparator source quality comparator', ({comparator, matchingEntityNumbers}) => {
		const rule: UpgradeRule = {
			from: {type: 'entity', name: 'transport-belt', quality: 'rare', comparator},
			preserveQuality: false,
			to: {type: 'entity', name: 'express-transport-belt', quality: 'legendary'},
		};

		expect({
			candidates: analyzeUpgradeRules(qualityComparisonBlueprint, [rule]),
			result: applyUpgradeRules(qualityComparisonBlueprint, [rule]),
		}).toStrictEqual({
			candidates: [{...rule, count: matchingEntityNumbers.length}],
			result: expectedQualityComparisonBlueprint(matchingEntityNumbers),
		});
	});

	test.each([
		{
			description: 'preserves the source quality',
			from: {type: 'entity', name: 'transport-belt'},
			preserveQuality: true,
			to: {type: 'entity', name: 'fast-transport-belt'},
			expected: {
				blueprint: {
					item: 'blueprint',
					version: 0,
					entities: [
						{
							entity_number: 100,
							name: 'fast-transport-belt',
							quality: 'rare',
							position: {x: 0, y: 0},
						},
					],
				},
			},
		},
		{
			description: 'sets an explicit target quality',
			from: {
				type: 'entity',
				name: 'transport-belt',
				quality: 'rare',
				comparator: '=',
			},
			preserveQuality: false,
			to: {type: 'entity', name: 'fast-transport-belt', quality: 'legendary'},
			expected: {
				blueprint: {
					item: 'blueprint',
					version: 0,
					entities: [
						{
							entity_number: 100,
							name: 'fast-transport-belt',
							quality: 'legendary',
							position: {x: 0, y: 0},
						},
					],
				},
			},
		},
		{
			description: 'changes quality without changing the prototype',
			from: {
				type: 'entity',
				name: 'transport-belt',
				quality: 'rare',
				comparator: '=',
			},
			preserveQuality: false,
			to: {type: 'entity', name: 'transport-belt', quality: 'legendary'},
			expected: {
				blueprint: {
					item: 'blueprint',
					version: 0,
					entities: [
						{
							entity_number: 100,
							name: 'transport-belt',
							quality: 'legendary',
							position: {x: 0, y: 0},
						},
					],
				},
			},
		},
	] as const)('$description', ({expected, from, preserveQuality, to}) => {
		const input: BlueprintString = {
			blueprint: {
				item: 'blueprint',
				version: 0,
				entities: [
					{
						entity_number: 100,
						name: 'transport-belt',
						quality: 'rare',
						position: {x: 0, y: 0},
					},
				],
			},
		};
		const planner: UpgradePlanner = {
			item: 'upgrade-planner',
			version: 0,
			settings: {mappers: [{from, index: 100, to}]},
		};
		const rules = rulesFromUpgradePlanner(planner);

		expect({
			candidates: analyzeUpgradeRules(input, rules),
			result: applyUpgradeRules(input, rules),
			rules,
		}).toStrictEqual({
			candidates: [{from, preserveQuality, to, count: 1}],
			result: expected,
			rules: [{from, preserveQuality, to}],
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

	test('preserves source quality comparators when parsing upgrade planners', () => {
		const planner: BlueprintString = {
			upgrade_planner: {
				item: 'upgrade-planner',
				version: 0,
				settings: {
					mappers: [
						{
							index: 1,
							from: {type: 'entity', name: 'transport-belt', quality: 'rare', comparator: '>'},
							to: {type: 'entity', name: 'fast-transport-belt'},
						},
					],
				},
			},
		};
		const parsed = parseUpgradePlanner(serializeBlueprint(planner));

		expect({parsed, rules: rulesFromUpgradePlanner(parsed)}).toStrictEqual({
			parsed: planner.upgrade_planner,
			rules: [
				{
					from: {type: 'entity', name: 'transport-belt', quality: 'rare', comparator: '>'},
					preserveQuality: true,
					to: {type: 'entity', name: 'fast-transport-belt'},
				},
			],
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
