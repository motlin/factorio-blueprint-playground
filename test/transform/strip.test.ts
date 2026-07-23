import {describe, expect, test} from 'vite-plus/test';

import {deserializeBlueprint, serializeBlueprint} from '../../src/parsing/blueprintParser';
import type {Blueprint, BlueprintString} from '../../src/parsing/types';
import {
	blueprintFilterCategories,
	stripEntities,
	stripModules,
	stripQuality,
	stripTiles,
	stripTrains,
} from '../../src/transform/strip';
import {removeEntities} from '../../src/transform/visit';
import {readFixtureFile} from '../fixtures/utils';

function deepFreeze(value: unknown): void {
	if (value !== null && typeof value === 'object') {
		Object.freeze(value);
		for (const nestedValue of Object.values(value)) {
			deepFreeze(nestedValue);
		}
	}
}

const nestedTrainBook: BlueprintString = {
	blueprint_book: {
		item: 'blueprint-book',
		label: "Alice's rail book",
		version: 0,
		blueprints: [
			{
				index: 100,
				blueprint_book: {
					item: 'blueprint-book',
					label: "Alice's rolling stock",
					version: 0,
					blueprints: [
						{
							index: 200,
							blueprint: {
								item: 'blueprint',
								label: 'All rolling stock',
								version: 0,
								entities: [
									{entity_number: 100, name: 'locomotive', position: {x: 0, y: 0}},
									{entity_number: 200, name: 'cargo-wagon', position: {x: 1, y: 0}},
									{entity_number: 300, name: 'fluid-wagon', position: {x: 2, y: 0}},
									{entity_number: 400, name: 'artillery-wagon', position: {x: 3, y: 0}},
									{entity_number: 500, name: 'train-stop', position: {x: 4, y: 0}},
								],
								schedules: [{locomotives: [100], schedule: {records: []}}],
								wires: [[100, 1, 500, 1]],
								tiles: [{name: 'landfill', position: {x: 0, y: 1}}],
							},
						},
					],
				},
			},
			{
				index: 300,
				blueprint: {
					item: 'blueprint',
					label: "Bob's factory",
					version: 0,
					entities: [{entity_number: 600, name: 'assembling-machine-1', position: {x: 0, y: 0}}],
				},
			},
		],
	},
};

describe('strip transforms', () => {
	test('empty: returns empty and planner roots unchanged', () => {
		const empty: BlueprintString = {};
		const planner: BlueprintString = {
			upgrade_planner: {item: 'upgrade-planner', version: 0, settings: {mappers: []}},
		};

		expect({
			entities: stripEntities(empty),
			modules: stripModules(planner),
			quality: stripQuality(empty),
			trains: stripTrains(planner),
			tiles: stripTiles(planner),
		}).toStrictEqual({
			entities: empty,
			modules: planner,
			quality: empty,
			trains: planner,
			tiles: planner,
		});
	});

	test('valid: entity and module filters remove their matching blueprint content', () => {
		const input: BlueprintString = {
			blueprint: {
				item: 'blueprint',
				version: 0,
				entities: [
					{
						entity_number: 10,
						name: 'assembling-machine-3',
						position: {x: 0, y: 0},
						items: [
							{
								id: {name: 'speed-module-3'},
								items: {in_inventory: [{inventory: 1, stack: 0, count: 2}]},
							},
						],
					},
				],
				wires: [[10, 1, 10, 2]],
			},
		};

		expect({entities: stripEntities(input), modules: stripModules(input)}).toStrictEqual({
			entities: {blueprint: {item: 'blueprint', version: 0, entities: [], wires: []}},
			modules: {
				blueprint: {
					item: 'blueprint',
					version: 0,
					entities: [
						{
							entity_number: 10,
							name: 'assembling-machine-3',
							position: {x: 0, y: 0},
						},
					],
					wires: [[10, 1, 10, 2]],
				},
			},
		});
	});

	test('valid: treats trains and ordinary entities as independent filters in a mixed blueprint', () => {
		const input: BlueprintString = {
			blueprint: {
				item: 'blueprint',
				version: 0,
				entities: [
					{entity_number: 1, name: 'locomotive', position: {x: 0, y: 0}},
					{entity_number: 2, name: 'cargo-wagon', position: {x: 1, y: 0}},
					{entity_number: 10, name: 'train-stop', position: {x: 1, y: 0}},
					{entity_number: 20, name: 'assembling-machine-3', position: {x: 2, y: 0}},
				],
				schedules: [
					{
						locomotives: [1],
						schedule: {records: [{station: 'Test stop', wait_conditions: []}]},
					},
				],
				wires: [
					[1, 1, 2, 1],
					[10, 2, 20, 1],
				],
				tiles: [{name: 'landfill', position: {x: 0, y: 0}}],
			},
		};

		expect({
			categories: blueprintFilterCategories(input),
			withoutEntities: stripEntities(input),
			withoutTrains: stripTrains(input),
		}).toStrictEqual({
			categories: {entities: true, modules: false, tiles: true, trains: true},
			withoutEntities: {
				blueprint: {
					item: 'blueprint',
					version: 0,
					entities: [
						{entity_number: 1, name: 'locomotive', position: {x: 0, y: 0}},
						{entity_number: 2, name: 'cargo-wagon', position: {x: 1, y: 0}},
					],
					schedules: [
						{
							locomotives: [1],
							schedule: {records: [{station: 'Test stop', wait_conditions: []}]},
						},
					],
					wires: [[1, 1, 2, 1]],
					tiles: [{name: 'landfill', position: {x: 0, y: 0}}],
				},
			},
			withoutTrains: {
				blueprint: {
					item: 'blueprint',
					version: 0,
					entities: [
						{entity_number: 10, name: 'train-stop', position: {x: 1, y: 0}},
						{entity_number: 20, name: 'assembling-machine-3', position: {x: 2, y: 0}},
					],
					wires: [[10, 2, 20, 1]],
					tiles: [{name: 'landfill', position: {x: 0, y: 0}}],
				},
			},
		});
	});

	test('valid: train filters recurse through books and recognize every rolling-stock prototype', () => {
		expect({
			categories: blueprintFilterCategories(nestedTrainBook),
			withoutTrains: stripTrains(nestedTrainBook),
		}).toStrictEqual({
			categories: {entities: true, modules: false, tiles: true, trains: true},
			withoutTrains: {
				blueprint_book: {
					item: 'blueprint-book',
					label: "Alice's rail book",
					version: 0,
					blueprints: [
						{
							index: 100,
							blueprint_book: {
								item: 'blueprint-book',
								label: "Alice's rolling stock",
								version: 0,
								blueprints: [
									{
										index: 200,
										blueprint: {
											item: 'blueprint',
											label: 'All rolling stock',
											version: 0,
											entities: [
												{
													entity_number: 500,
													name: 'train-stop',
													position: {x: 4, y: 0},
												},
											],
											wires: [],
											tiles: [{name: 'landfill', position: {x: 0, y: 1}}],
										},
									},
								],
							},
						},
						{
							index: 300,
							blueprint: {
								item: 'blueprint',
								label: "Bob's factory",
								version: 0,
								entities: [
									{
										entity_number: 600,
										name: 'assembling-machine-1',
										position: {x: 0, y: 0},
									},
								],
							},
						},
					],
				},
			},
		});
	});

	test('valid: quality fixture round trips and removes keyed quality metadata', () => {
		const fixtureString = readFixtureFile('txt/quality-entities.txt');
		const input = deserializeBlueprint(fixtureString);
		const fixtureJson = JSON.parse(readFixtureFile('json/quality-entities.json'));
		expect(input).toStrictEqual(fixtureJson);
		expect(serializeBlueprint(input)).toBe(fixtureString);
		deepFreeze(input);

		expect(stripQuality(input)).toStrictEqual({
			blueprint: {
				item: 'blueprint',
				label: 'Quality metadata test',
				version: 0,
				icons: [{index: 1, signal: {type: 'quality', name: 'quality'}}],
				entities: [
					{
						entity_number: 1,
						name: 'assembling-machine-3',
						position: {x: 0, y: 0},
						recipe: 'electronic-circuit',
						items: [
							{
								id: {name: 'speed-module-3'},
								items: {in_inventory: [{inventory: 1, stack: 0, count: 2}]},
							},
						],
						filters: [{index: 1, name: 'iron-plate', comparator: '='}],
					},
					{
						entity_number: 2,
						name: 'logistic-chest-requester',
						position: {x: 1, y: 0},
						request_filters: {
							sections: [
								{
									index: 1,
									filters: [{index: 1, name: 'copper-plate', count: 100}],
								},
							],
						},
					},
					{
						entity_number: 3,
						name: 'constant-combinator',
						position: {x: 2, y: 0},
						control_behavior: {
							sections: {
								sections: [
									{
										index: 1,
										filters: [{index: 1, type: 'quality', name: 'quality', count: 1}],
									},
								],
							},
						},
					},
				],
			},
		});
		expect(input).toStrictEqual(fixtureJson);
	});

	test('valid: train fixture removes rolling stock, schedules, and orphaned wires without renumbering', () => {
		const fixtureString = readFixtureFile('txt/train-with-wires.txt');
		const input = deserializeBlueprint(fixtureString);
		const fixtureJson = JSON.parse(readFixtureFile('json/train-with-wires.json'));
		expect(input).toStrictEqual(fixtureJson);
		expect(serializeBlueprint(input)).toBe(fixtureString);
		deepFreeze(input);

		expect(stripTrains(input)).toStrictEqual({
			blueprint: {
				item: 'blueprint',
				label: 'Train wire test',
				version: 0,
				entities: [
					{entity_number: 10, name: 'train-stop', position: {x: 3, y: 0}},
					{entity_number: 20, name: 'small-lamp', position: {x: 5, y: 0}},
				],
				wires: [[10, 2, 20, 1]],
				tiles: [
					{name: 'landfill', position: {x: 0, y: 0}},
					{name: 'landfill', position: {x: 1, y: 0}},
				],
			},
		});
		expect(input).toStrictEqual(fixtureJson);
	});

	test('valid: tile filter removes only blueprint tiles', () => {
		const input: BlueprintString = {
			blueprint: {
				item: 'blueprint',
				version: 0,
				entities: [
					{entity_number: 10, name: 'constant-combinator', position: {x: 0, y: 0}},
					{entity_number: 20, name: 'small-lamp', position: {x: 1, y: 0}},
				],
				wires: [[10, 1, 20, 1]],
				tiles: [{name: 'landfill', position: {x: 0, y: 0}}],
			},
		};

		expect(stripTiles(input)).toStrictEqual({
			blueprint: {
				item: 'blueprint',
				version: 0,
				entities: [
					{entity_number: 10, name: 'constant-combinator', position: {x: 0, y: 0}},
					{entity_number: 20, name: 'small-lamp', position: {x: 1, y: 0}},
				],
				wires: [[10, 1, 20, 1]],
			},
		});
	});

	test('edge: removeEntities cleans wire and schedule references while keeping surviving schedules', () => {
		const input: Blueprint = {
			item: 'blueprint',
			version: 0,
			entities: [
				{entity_number: 10, name: 'locomotive', position: {x: 0, y: 0}},
				{entity_number: 20, name: 'locomotive', position: {x: 0, y: 7}},
			],
			wires: [[10, 1, 20, 1]],
			schedules: [
				{
					locomotives: [10, 20],
					schedule: {records: [{station: 'Test stop', wait_conditions: []}]},
				},
			],
		};

		expect(removeEntities(input, (entity) => entity.entity_number === 10)).toStrictEqual({
			item: 'blueprint',
			version: 0,
			entities: [{entity_number: 20, name: 'locomotive', position: {x: 0, y: 7}}],
			wires: [],
			schedules: [
				{
					locomotives: [20],
					schedule: {records: [{station: 'Test stop', wait_conditions: []}]},
				},
			],
		});
	});

	test('error: removeEntities propagates predicate failures', () => {
		const input: Blueprint = {
			item: 'blueprint',
			version: 0,
			entities: [{entity_number: 1, name: 'stone-furnace', position: {x: 0, y: 0}}],
		};

		expect(() =>
			removeEntities(input, () => {
				throw new TypeError('Test predicate failure');
			}),
		).toThrow(new TypeError('Test predicate failure'));
	});
});
