import type {Entity, ItemStack} from './types';

// Older formats don't record inventories, so modules are assumed to sit in the module slots.
const MODULE_INVENTORY = 4;
const MAIN_INVENTORY = 1;

function legacyItemStack(name: string, count: number): ItemStack {
	const inventory = name.includes('module') ? MODULE_INVENTORY : MAIN_INVENTORY;
	return {id: {name}, items: {in_inventory: [{inventory, stack: 0, count}]}};
}

export function normalizeItemStacks(items: Entity['items']): ItemStack[] {
	if (items === undefined) {
		return [];
	}
	if (!Array.isArray(items)) {
		return Object.entries(items).map(([name, count]) => legacyItemStack(name, count));
	}
	return items.map((itemStack) => ('id' in itemStack ? itemStack : legacyItemStack(itemStack.item, itemStack.count)));
}
