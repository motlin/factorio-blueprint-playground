import {describe, expect, test} from 'vite-plus/test';

import type {BlueprintString} from '../../src/parsing/types';
import {applyBlueprintSnapGrid, blueprintSnapGrid, type BlueprintSnapGrid} from '../../src/transform/blueprintEditor';

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
