import {describe, expect, it} from 'vite-plus/test';

import {extractNames} from '../../../src/parsing/modDetection/nameExtractor';
import type {ExtractedName, NameKind} from '../../../src/parsing/modDetection/types';
import type {BlueprintString} from '../../../src/parsing/types';
import krastorioFixture from '../../fixtures/blueprints/json/krastorio.json';
import spaceAgeFixture from '../../fixtures/blueprints/json/space-age.json';
import unknownModFixture from '../../fixtures/blueprints/json/unknown-mod.json';
import vanillaFixture from '../../fixtures/blueprints/json/vanilla-2.0.json';

const FACTORIO_2_VERSION = 562949953421312;
const FIXTURES = {
	krastorio: krastorioFixture as BlueprintString,
	'space-age': spaceAgeFixture as BlueprintString,
	'unknown-mod': unknownModFixture as BlueprintString,
	'vanilla-2.0': vanillaFixture as BlueprintString,
};

function names(entries: [string, NameKind, number?][]): Map<string, ExtractedName> {
	return new Map(
		entries.map(([name, kind, count = 1]) => [
			name,
			{
				kinds: new Set([kind]),
				count,
			},
		]),
	);
}

function fixture(name: keyof typeof FIXTURES): BlueprintString {
	return FIXTURES[name];
}

describe('extractNames', () => {
	it('extracts nothing from an empty wrapper', () => {
		expect(extractNames({})).toStrictEqual({
			names: new Map(),
			flags: {
				hasNonNormalQuality: false,
				hasPlanetSignals: false,
				hasSpaceLocationSignals: false,
			},
			version: undefined,
		});
	});

	it('extracts icons, entities, recipes, filters, item stacks, and tiles', () => {
		const blueprint: BlueprintString = {
			blueprint: {
				item: 'blueprint',
				version: FACTORIO_2_VERSION,
				icons: [{signal: {type: 'item', name: 'icon-item'}, index: 1}],
				entities: [
					{
						entity_number: 1,
						name: 'test-assembler',
						quality: 'epic',
						position: {x: 0, y: 0},
						recipe: 'test-recipe',
						recipe_quality: 'uncommon',
						filters: [{index: 1, name: 'filtered-item', quality: 'rare'}],
						request_filters: {
							sections: [{index: 1, filters: [{index: 1, name: 'requested-item'}]}],
						},
						items: [
							{
								id: {name: 'stacked-item', quality: 'legendary'},
								items: {in_inventory: [{inventory: 1, stack: 0, count: 1}]},
							},
						],
						icon: {type: 'entity', name: 'entity-icon', quality: 'rare'},
					},
				],
				tiles: [{position: {x: 0, y: 1}, name: 'test-tile'}],
			},
		};

		expect(extractNames(blueprint)).toStrictEqual({
			names: names([
				['icon-item', 'signal'],
				['test-assembler', 'entity'],
				['test-recipe', 'recipe'],
				['filtered-item', 'item'],
				['requested-item', 'item'],
				['stacked-item', 'item'],
				['entity-icon', 'signal'],
				['test-tile', 'tile'],
			]),
			flags: {
				hasNonNormalQuality: true,
				hasPlanetSignals: false,
				hasSpaceLocationSignals: false,
			},
			version: '2.0.0.0',
		});
	});

	it('merges repeated names across kinds and counts every occurrence', () => {
		const blueprint: BlueprintString = {
			blueprint: {
				item: 'blueprint',
				version: FACTORIO_2_VERSION,
				icons: [{signal: {type: 'item', name: 'shared-name'}, index: 1}],
				entities: [
					{
						entity_number: 1,
						name: 'shared-name',
						position: {x: 0, y: 0},
						recipe: 'shared-name',
					},
				],
			},
		};

		expect(extractNames(blueprint)).toStrictEqual({
			names: new Map([
				[
					'shared-name',
					{
						kinds: new Set(['signal', 'entity', 'recipe']),
						count: 3,
					},
				],
			]),
			flags: {
				hasNonNormalQuality: false,
				hasPlanetSignals: false,
				hasSpaceLocationSignals: false,
			},
			version: '2.0.0.0',
		});
	});

	it('recognizes non-normal quality signals', () => {
		const blueprint: BlueprintString = {
			blueprint: {
				item: 'blueprint',
				version: FACTORIO_2_VERSION,
				icons: [{signal: {type: 'quality', name: 'legendary'}, index: 1}],
			},
		};

		expect(extractNames(blueprint)).toStrictEqual({
			names: names([['legendary', 'signal']]),
			flags: {
				hasNonNormalQuality: true,
				hasPlanetSignals: false,
				hasSpaceLocationSignals: false,
			},
			version: '2.0.0.0',
		});
	});

	it('extracts every control behavior signal and section filter', () => {
		const blueprint: BlueprintString = {
			blueprint: {
				item: 'blueprint',
				version: FACTORIO_2_VERSION,
				entities: [
					{
						entity_number: 1,
						name: 'test-combinator',
						position: {x: 0, y: 0},
						control_behavior: {
							circuit_condition: {
								first_signal: {type: 'planet', name: 'test-planet'},
								second_signal: {type: 'virtual', name: 'circuit-second'},
							},
							logistic_condition: {
								first_signal: {type: 'space-location', name: 'test-orbit'},
								second_signal: {type: 'item', name: 'logistic-second'},
							},
							decider_conditions: {
								conditions: [
									{
										first_signal: {type: 'item', name: 'decider-first'},
										second_signal: {type: 'fluid', name: 'decider-second'},
									},
								],
								outputs: [{signal: {type: 'virtual', name: 'decider-output'}}],
							},
							arithmetic_conditions: {
								first_signal: {type: 'item', name: 'arithmetic-first'},
								second_signal: {type: 'item', name: 'arithmetic-second'},
								operation: '+',
								output_signal: {type: 'virtual', name: 'arithmetic-output'},
							},
							train_stopped_signal: {type: 'virtual', name: 'train-stopped'},
							red_signal: {type: 'virtual', name: 'red-channel'},
							green_signal: {type: 'virtual', name: 'green-channel'},
							blue_signal: {type: 'virtual', name: 'blue-channel'},
							parameters: [
								{
									condition: {
										first_signal: {type: 'item', name: 'display-condition'},
										constant: 0,
										comparator: '=',
									},
									icon: {type: 'virtual', name: 'display-icon'},
								},
							],
							sections: {
								sections: [
									{
										index: 1,
										filters: [{index: 1, name: 'section-filter', quality: 'uncommon'}],
									},
								],
							},
						},
					},
				],
			},
		};

		expect(extractNames(blueprint)).toStrictEqual({
			names: names([
				['test-combinator', 'entity'],
				['test-planet', 'signal'],
				['circuit-second', 'signal'],
				['test-orbit', 'signal'],
				['logistic-second', 'signal'],
				['decider-first', 'signal'],
				['decider-second', 'signal'],
				['decider-output', 'signal'],
				['arithmetic-first', 'signal'],
				['arithmetic-second', 'signal'],
				['arithmetic-output', 'signal'],
				['train-stopped', 'signal'],
				['red-channel', 'signal'],
				['green-channel', 'signal'],
				['blue-channel', 'signal'],
				['display-condition', 'signal'],
				['display-icon', 'signal'],
				['section-filter', 'item'],
			]),
			flags: {
				hasNonNormalQuality: true,
				hasPlanetSignals: true,
				hasSpaceLocationSignals: true,
			},
			version: '2.0.0.0',
		});
	});

	it('recurses through books and extracts schedule conditions without leaking free text', () => {
		const book: BlueprintString = {
			blueprint_book: {
				item: 'blueprint-book',
				version: FACTORIO_2_VERSION,
				label: 'made-up-book-label',
				description: 'made-up-book-description',
				icons: [{signal: {type: 'item', name: 'book-icon'}, index: 1}],
				blueprints: [
					{
						index: 1,
						blueprint: {
							item: 'blueprint',
							version: 281479271677952,
							label: 'made-up-blueprint-label',
							description: 'made-up-blueprint-description',
							entities: [
								{
									entity_number: 1,
									name: 'test-locomotive',
									position: {x: 0, y: 0},
									station: 'made-up-entity-station',
									text: 'made-up-display-text',
									control_behavior: {
										sections: {
											sections: [{index: 1, group: 'made-up-section-group'}],
										},
									},
								},
							],
							schedules: [
								{
									locomotives: [1],
									schedule: {
										records: [
											{
												station: 'made-up-schedule-station',
												wait_conditions: [
													{
														compare_type: 'and',
														type: 'circuit',
														condition: {
															first_signal: {type: 'item', name: 'schedule-first'},
															second_signal: {type: 'item', name: 'schedule-second'},
														},
													},
												],
											},
										],
									},
								},
							],
						},
					},
				],
			},
		};

		expect(extractNames(book)).toStrictEqual({
			names: names([
				['book-icon', 'signal'],
				['test-locomotive', 'entity'],
				['schedule-first', 'signal'],
				['schedule-second', 'signal'],
			]),
			flags: {
				hasNonNormalQuality: false,
				hasPlanetSignals: false,
				hasSpaceLocationSignals: false,
			},
			version: '2.0.0.0',
		});
	});

	it('extracts upgrade planner mappers and icons', () => {
		const planner: BlueprintString = {
			upgrade_planner: {
				item: 'upgrade-planner',
				version: FACTORIO_2_VERSION,
				settings: {
					icons: [{signal: {type: 'item', name: 'upgrade-icon'}, index: 1}],
					mappers: [
						{
							index: 0,
							from: {type: 'entity', name: 'upgrade-from'},
							to: {type: 'entity', name: 'upgrade-to', quality: 'rare'},
						},
					],
				},
			},
		};

		expect(extractNames(planner)).toStrictEqual({
			names: names([
				['upgrade-icon', 'signal'],
				['upgrade-from', 'signal'],
				['upgrade-to', 'signal'],
			]),
			flags: {
				hasNonNormalQuality: true,
				hasPlanetSignals: false,
				hasSpaceLocationSignals: false,
			},
			version: '2.0.0.0',
		});
	});

	it('extracts deconstruction planner filters and icons', () => {
		const planner: BlueprintString = {
			deconstruction_planner: {
				item: 'deconstruction-planner',
				version: FACTORIO_2_VERSION,
				settings: {
					icons: [{signal: {type: 'item', name: 'deconstruction-icon'}, index: 1}],
					entity_filters: [{index: 1, name: 'deconstructed-entity'}],
					tile_filters: [{index: 1, name: 'deconstructed-tile', quality: 'uncommon'}],
				},
			},
		};

		expect(extractNames(planner)).toStrictEqual({
			names: names([
				['deconstruction-icon', 'signal'],
				['deconstructed-entity', 'entity'],
				['deconstructed-tile', 'tile'],
			]),
			flags: {
				hasNonNormalQuality: true,
				hasPlanetSignals: false,
				hasSpaceLocationSignals: false,
			},
			version: '2.0.0.0',
		});
	});

	it('extracts identifier and ingredient parameters', () => {
		const blueprint: BlueprintString = {
			blueprint: {
				item: 'blueprint',
				version: FACTORIO_2_VERSION,
				parameters: [
					{
						type: 'id',
						name: 'made-up-parameter-name',
						id: 'parameter-item',
						'quality-condition': {quality: 'legendary', comparator: '='},
					},
					{
						type: 'number',
						name: 'made-up-number-name',
						'ingredient-of': 'parameter-recipe',
					},
				],
			},
		};

		expect(extractNames(blueprint)).toStrictEqual({
			names: names([
				['parameter-item', 'any'],
				['parameter-recipe', 'any'],
			]),
			flags: {
				hasNonNormalQuality: true,
				hasPlanetSignals: false,
				hasSpaceLocationSignals: false,
			},
			version: '2.0.0.0',
		});
	});

	it.each([
		[
			'vanilla-2.0',
			[
				['transport-belt', 'signal'],
				['straight-rail', 'entity'],
				['decider-combinator', 'entity'],
				['signal-each', 'signal'],
				['signal-A', 'signal'],
				['signal-green', 'signal'],
				['stone-path', 'tile'],
			],
			false,
			false,
		],
		[
			'space-age',
			[
				['vulcanus', 'signal'],
				['quality-module-3', 'signal'],
				['foundry', 'entity'],
				['rail-ramp', 'entity'],
			],
			true,
			true,
		],
		[
			'krastorio',
			[
				['kr-imersite-crystal', 'signal'],
				['kr-advanced-assembling-machine', 'entity'],
				['kr-imersite-gear-wheel', 'recipe'],
				['kr-huge-storage-tank', 'entity'],
			],
			false,
			false,
		],
		[
			'unknown-mod',
			[
				['made-up-crystal', 'signal'],
				['invented-assembler', 'entity'],
				['se-imaginary-recipe', 'recipe'],
				['fictional-loader', 'entity'],
			],
			false,
			false,
		],
	] as const)('extracts the %s fixture', (fixtureName, expectedEntries, hasNonNormalQuality, hasPlanetSignals) => {
		expect(extractNames(fixture(fixtureName))).toStrictEqual({
			names: names(expectedEntries.map(([name, kind]) => [name, kind])),
			flags: {
				hasNonNormalQuality,
				hasPlanetSignals,
				hasSpaceLocationSignals: false,
			},
			version: '2.0.0.0',
		});
	});
});
