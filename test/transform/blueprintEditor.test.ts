import {describe, expect, test} from 'vite-plus/test';

import type {BlueprintString, Parameter} from '../../src/parsing/types';
import {
	applyBlueprintParameters,
	applyBlueprintSnapGrid,
	blueprintParameters,
	blueprintSnapGrid,
	type BlueprintSnapGrid,
} from '../../src/transform/blueprintEditor';

const blueprint: BlueprintString = {
	blueprint: {
		item: 'blueprint',
		version: 0,
		'snap-to-grid': {x: 32, y: 64},
		'absolute-snapping': true,
		'position-relative-to-grid': {x: 0, y: -16},
		entities: [{entity_number: 100, name: 'transport-belt', position: {x: 0, y: 0}}],
	},
};

describe('blueprint snap-to-grid settings', () => {
	test('reads concrete absolute grid metadata including zero and negative positions', () => {
		expect(blueprintSnapGrid(blueprint)).toStrictEqual({
			absolute: true,
			enabled: true,
			height: 64,
			positionX: 0,
			positionY: -16,
			width: 32,
		});
	});

	test('provides editable defaults when grid snapping is absent', () => {
		expect(
			blueprintSnapGrid({
				blueprint: {
					item: 'blueprint',
					version: 0,
				},
			}),
		).toStrictEqual({
			absolute: true,
			enabled: false,
			height: 1,
			positionX: 0,
			positionY: 0,
			width: 1,
		});
	});

	test('writes absolute grid metadata without changing entities', () => {
		const settings: BlueprintSnapGrid = {
			absolute: true,
			enabled: true,
			height: 16,
			positionX: -8,
			positionY: 0,
			width: 8,
		};

		expect(applyBlueprintSnapGrid(blueprint, settings)).toStrictEqual({
			blueprint: {
				item: 'blueprint',
				version: 0,
				'snap-to-grid': {x: 8, y: 16},
				'absolute-snapping': true,
				'position-relative-to-grid': {x: -8, y: 0},
				entities: [{entity_number: 100, name: 'transport-belt', position: {x: 0, y: 0}}],
			},
		});
	});

	test('writes relative placement without an absolute grid position', () => {
		const settings: BlueprintSnapGrid = {
			absolute: false,
			enabled: true,
			height: 16,
			positionX: -8,
			positionY: 0,
			width: 8,
		};

		expect(applyBlueprintSnapGrid(blueprint, settings)).toStrictEqual({
			blueprint: {
				item: 'blueprint',
				version: 0,
				'snap-to-grid': {x: 8, y: 16},
				'absolute-snapping': false,
				entities: [{entity_number: 100, name: 'transport-belt', position: {x: 0, y: 0}}],
			},
		});
	});

	test('omits all snap fields when grid snapping is disabled', () => {
		const settings: BlueprintSnapGrid = {
			absolute: true,
			enabled: false,
			height: 16,
			positionX: -8,
			positionY: 0,
			width: 8,
		};

		expect(applyBlueprintSnapGrid(blueprint, settings)).toStrictEqual({
			blueprint: {
				item: 'blueprint',
				version: 0,
				entities: [{entity_number: 100, name: 'transport-belt', position: {x: 0, y: 0}}],
			},
		});
	});
});

describe('blueprint parameters', () => {
	const parameters: Parameter[] = [
		{
			type: 'id',
			id: 'iron-plate',
			name: 'Plate',
			'quality-condition': {quality: 'rare', comparator: '≥'},
		},
		{
			type: 'id',
			id: 'iron-gear-wheel',
			name: 'Gear',
			'item-ingredient-of': 'iron-plate',
		},
		{
			type: 'number',
			name: 'Crafting count',
			number: '12',
			variable: 'N',
			dependent: true,
			formula: 'N * 2',
			'not-parametrised': true,
		},
	];
	const parameterizedBlueprint: BlueprintString = {
		blueprint: {
			item: 'blueprint',
			version: 0,
			label: 'Parameterized factory',
			parameters,
		},
	};

	test('reads cloned parameters without exposing nested source data', () => {
		const result = blueprintParameters(parameterizedBlueprint);
		const qualityCondition = result[0]?.['quality-condition'];
		if (qualityCondition === undefined) {
			throw new Error('Expected the first parameter to have a quality condition.');
		}
		qualityCondition.quality = 'legendary';

		expect({
			result,
			source: parameterizedBlueprint.blueprint?.parameters,
		}).toStrictEqual({
			result: [
				{
					type: 'id',
					id: 'iron-plate',
					name: 'Plate',
					'quality-condition': {quality: 'legendary', comparator: '≥'},
				},
				parameters[1],
				parameters[2],
			],
			source: parameters,
		});
	});

	test('writes edited ID parameters while preserving unsupported number parameters losslessly', () => {
		const edited = blueprintParameters(parameterizedBlueprint);
		edited[0] = {...edited[0], name: 'Any plate'};

		expect(applyBlueprintParameters(parameterizedBlueprint, edited)).toStrictEqual({
			blueprint: {
				item: 'blueprint',
				version: 0,
				label: 'Parameterized factory',
				parameters: [
					{
						type: 'id',
						id: 'iron-plate',
						name: 'Any plate',
						'quality-condition': {quality: 'rare', comparator: '≥'},
					},
					parameters[1],
					parameters[2],
				],
			},
		});
	});

	test('removes the field for an empty parameter list and rejects unsupported roots', () => {
		expect(applyBlueprintParameters(parameterizedBlueprint, [])).toStrictEqual({
			blueprint: {
				item: 'blueprint',
				version: 0,
				label: 'Parameterized factory',
			},
		});
		expect(() =>
			blueprintParameters({
				blueprint_book: {item: 'blueprint-book', version: 0, blueprints: []},
			}),
		).toThrow('Blueprint parametrisation requires a blueprint.');
	});
});
