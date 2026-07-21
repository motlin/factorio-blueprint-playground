import {describe, expect, test} from 'vite-plus/test';

import type {BlueprintString} from '../../src/parsing/types';
import {addLandfillUnderlay} from '../../src/transform/landfill';

function blueprintWithEntity(name: string, position: {x: number; y: number}, direction?: number): BlueprintString {
	return {
		blueprint: {
			item: 'blueprint',
			version: 0,
			entities: [{entity_number: 1, name, position, ...(direction === undefined ? {} : {direction})}],
		},
	};
}

describe('addLandfillUnderlay', () => {
	test('adds one landfill tile for an unknown 1x1 entity', () => {
		const input = blueprintWithEntity('test-entity', {x: 0.5, y: 0.5});

		expect(addLandfillUnderlay(input)).toStrictEqual({
			blueprint: {
				item: 'blueprint',
				version: 0,
				entities: [{entity_number: 1, name: 'test-entity', position: {x: 0.5, y: 0.5}}],
				tiles: [{name: 'landfill', position: {x: 0, y: 0}}],
			},
		});
	});

	test('covers the full 3x3 footprint of an assembling machine', () => {
		const input = blueprintWithEntity('assembling-machine-3', {x: 1.5, y: 1.5});

		expect(addLandfillUnderlay(input)).toStrictEqual({
			blueprint: {
				item: 'blueprint',
				version: 0,
				entities: [{entity_number: 1, name: 'assembling-machine-3', position: {x: 1.5, y: 1.5}}],
				tiles: [
					{name: 'landfill', position: {x: 0, y: 0}},
					{name: 'landfill', position: {x: 0, y: 1}},
					{name: 'landfill', position: {x: 0, y: 2}},
					{name: 'landfill', position: {x: 1, y: 0}},
					{name: 'landfill', position: {x: 1, y: 1}},
					{name: 'landfill', position: {x: 1, y: 2}},
					{name: 'landfill', position: {x: 2, y: 0}},
					{name: 'landfill', position: {x: 2, y: 1}},
					{name: 'landfill', position: {x: 2, y: 2}},
				],
			},
		});
	});

	test('uses tile-corner centers for even-width entities', () => {
		const input = blueprintWithEntity('stone-furnace', {x: 2, y: 3});

		expect(addLandfillUnderlay(input)).toStrictEqual({
			blueprint: {
				item: 'blueprint',
				version: 0,
				entities: [{entity_number: 1, name: 'stone-furnace', position: {x: 2, y: 3}}],
				tiles: [
					{name: 'landfill', position: {x: 1, y: 2}},
					{name: 'landfill', position: {x: 1, y: 3}},
					{name: 'landfill', position: {x: 2, y: 2}},
					{name: 'landfill', position: {x: 2, y: 3}},
				],
			},
		});
	});

	test('swaps rectangular footprint dimensions for east-facing entities', () => {
		const input = blueprintWithEntity('boiler', {x: 4, y: 4.5}, 2);

		expect(addLandfillUnderlay(input)).toStrictEqual({
			blueprint: {
				item: 'blueprint',
				version: 0,
				entities: [{entity_number: 1, name: 'boiler', position: {x: 4, y: 4.5}, direction: 2}],
				tiles: [
					{name: 'landfill', position: {x: 3, y: 3}},
					{name: 'landfill', position: {x: 3, y: 4}},
					{name: 'landfill', position: {x: 3, y: 5}},
					{name: 'landfill', position: {x: 4, y: 3}},
					{name: 'landfill', position: {x: 4, y: 4}},
					{name: 'landfill', position: {x: 4, y: 5}},
				],
			},
		});
	});

	test('preserves existing tiles and deduplicates covered positions without mutating the input', () => {
		const input: BlueprintString = {
			blueprint: {
				item: 'blueprint',
				version: 0,
				entities: [
					{entity_number: 1, name: 'assembling-machine-1', position: {x: 1.5, y: 1.5}},
					{entity_number: 2, name: 'assembling-machine-2', position: {x: 2.5, y: 1.5}},
					{entity_number: 3, name: 'straight-rail', position: {x: 10, y: 10}},
					{entity_number: 4, name: 'locomotive', position: {x: 20, y: 20}},
				],
				tiles: [
					{name: 'concrete', position: {x: 1, y: 1}},
					{name: 'stone-path', position: {x: 10, y: 10}},
				],
			},
		};
		const expectedInput = structuredClone(input);
		Object.freeze(input.blueprint?.tiles);
		Object.freeze(input.blueprint);
		Object.freeze(input);

		expect(addLandfillUnderlay(input)).toStrictEqual({
			blueprint: {
				item: 'blueprint',
				version: 0,
				entities: [
					{entity_number: 1, name: 'assembling-machine-1', position: {x: 1.5, y: 1.5}},
					{entity_number: 2, name: 'assembling-machine-2', position: {x: 2.5, y: 1.5}},
					{entity_number: 3, name: 'straight-rail', position: {x: 10, y: 10}},
					{entity_number: 4, name: 'locomotive', position: {x: 20, y: 20}},
				],
				tiles: [
					{name: 'concrete', position: {x: 1, y: 1}},
					{name: 'stone-path', position: {x: 10, y: 10}},
					{name: 'landfill', position: {x: 0, y: 0}},
					{name: 'landfill', position: {x: 0, y: 1}},
					{name: 'landfill', position: {x: 0, y: 2}},
					{name: 'landfill', position: {x: 1, y: 0}},
					{name: 'landfill', position: {x: 1, y: 2}},
					{name: 'landfill', position: {x: 2, y: 0}},
					{name: 'landfill', position: {x: 2, y: 1}},
					{name: 'landfill', position: {x: 2, y: 2}},
					{name: 'landfill', position: {x: 3, y: 0}},
					{name: 'landfill', position: {x: 3, y: 1}},
					{name: 'landfill', position: {x: 3, y: 2}},
				],
			},
		});
		expect(input).toStrictEqual(expectedInput);
	});
});
