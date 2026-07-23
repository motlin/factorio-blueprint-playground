import {expect, test} from 'vite-plus/test';

import type {BlueprintString} from '../../src/parsing/types';
import {blueprintComponentRemovalKey, removeBlueprintComponents} from '../../src/transform/componentRemoval';

const sourceBlueprint: BlueprintString = {
	blueprint: {
		item: 'blueprint',
		version: 0,
		entities: [
			{entity_number: 100, name: 'transport-belt', position: {x: 0, y: 0}},
			{
				entity_number: 200,
				name: 'assembling-machine-1',
				position: {x: 1, y: 0},
				items: [
					{
						id: {name: 'speed-module', quality: 'rare'},
						items: {in_inventory: [{inventory: 4, stack: 0, count: 2}]},
					},
					{
						id: {name: 'speed-module'},
						items: {in_inventory: [{inventory: 4, stack: 1, count: 1}]},
					},
					{
						id: {name: 'coal'},
						items: {in_inventory: [{inventory: 1, stack: 0, count: 10}]},
					},
					{
						id: {name: 'transport-belt'},
						items: {in_inventory: [{inventory: 1, stack: 1, count: 1}]},
					},
				],
			},
			{entity_number: 300, name: 'locomotive', position: {x: 2, y: 0}},
		],
		tiles: [
			{name: 'refined-concrete', position: {x: 0, y: 1}},
			{name: 'concrete', position: {x: 1, y: 1}},
		],
		wires: [
			[100, 1, 200, 1],
			[200, 1, 300, 1],
		],
		schedules: [{locomotives: [300], schedule: {records: []}}],
	},
};

test('removes component categories without mutating the immutable source', () => {
	const originalSource = structuredClone(sourceBlueprint);
	const removedComponents = new Set([
		blueprintComponentRemovalKey({name: 'transport-belt', type: 'entity'}),
		blueprintComponentRemovalKey({name: 'speed-module', type: 'item'}),
		blueprintComponentRemovalKey({name: 'refined-concrete', type: 'tile'}),
	]);

	expect({
		result: removeBlueprintComponents(sourceBlueprint, removedComponents),
		source: sourceBlueprint,
	}).toStrictEqual({
		result: {
			blueprint: {
				item: 'blueprint',
				version: 0,
				entities: [
					{
						entity_number: 200,
						name: 'assembling-machine-1',
						position: {x: 1, y: 0},
						items: [
							{
								id: {name: 'coal'},
								items: {in_inventory: [{inventory: 1, stack: 0, count: 10}]},
							},
							{
								id: {name: 'transport-belt'},
								items: {in_inventory: [{inventory: 1, stack: 1, count: 1}]},
							},
						],
					},
					{entity_number: 300, name: 'locomotive', position: {x: 2, y: 0}},
				],
				tiles: [{name: 'concrete', position: {x: 1, y: 1}}],
				wires: [[200, 1, 300, 1]],
				schedules: [{locomotives: [300], schedule: {records: []}}],
			},
		},
		source: originalSource,
	});
});

test('restores components by deriving a new result from the immutable source', () => {
	const removedComponents = new Set([blueprintComponentRemovalKey({name: 'transport-belt', type: 'entity'})]);
	removedComponents.delete(blueprintComponentRemovalKey({name: 'transport-belt', type: 'entity'}));

	expect(removeBlueprintComponents(sourceBlueprint, removedComponents)).toStrictEqual(sourceBlueprint);
});
