import {describe, expect, test} from 'vite-plus/test';

import {getItemCount, processEntitiesItems} from '../../src/components/blueprint/panels/contents/countUtils';
import type {Entity} from '../../src/parsing/types';

describe('countUtils', () => {
	test('counts equipment grid items, which have no inventory positions', () => {
		const spidertron: Entity = {
			entity_number: 1,
			name: 'spidertron',
			position: {x: 0, y: 0},
			items: [
				{id: {name: 'solar-panel-equipment'}, items: {grid_count: 36}},
				{id: {name: 'rocket'}, items: {in_inventory: [{inventory: 3, stack: 0, count: 50}]}},
			],
		};

		const {moduleItems, inventoryItems} = processEntitiesItems([spidertron]);

		expect({
			moduleItems,
			inventoryCounts: inventoryItems.map((item) => [item.id.name, getItemCount(item)]),
		}).toStrictEqual({
			moduleItems: [],
			inventoryCounts: [
				['solar-panel-equipment', 36],
				['rocket', 50],
			],
		});
	});
});
