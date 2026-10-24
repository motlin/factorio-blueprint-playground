import {describe, expect, it} from 'vite-plus/test';

import {normalizeItemStacks} from '../../src/parsing/itemStacks';

describe('normalizeItemStacks', () => {
	it('returns nothing for missing items', () => {
		expect(normalizeItemStacks(undefined)).toStrictEqual([]);
	});

	it('keeps Factorio 2.0 item stacks', () => {
		const stack = {
			id: {name: 'iron-plate', quality: 'rare' as const},
			items: {in_inventory: [{inventory: 1, stack: 0, count: 5}]},
		};

		expect(normalizeItemStacks([stack])).toStrictEqual([stack]);
	});

	it('converts Factorio 1.1 item maps, placing modules in the module inventory', () => {
		expect(normalizeItemStacks({'speed-module-3': 2, coal: 50})).toStrictEqual([
			{id: {name: 'speed-module-3'}, items: {in_inventory: [{inventory: 4, stack: 0, count: 2}]}},
			{id: {name: 'coal'}, items: {in_inventory: [{inventory: 1, stack: 0, count: 50}]}},
		]);
	});

	it('converts Factorio 0.x item stacks', () => {
		expect(normalizeItemStacks([{item: 'effectivity-module', count: 2}])).toStrictEqual([
			{id: {name: 'effectivity-module'}, items: {in_inventory: [{inventory: 4, stack: 0, count: 2}]}},
		]);
	});
});
