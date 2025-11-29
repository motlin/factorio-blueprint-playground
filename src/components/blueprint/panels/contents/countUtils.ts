import type {Entity, ItemStack, Quality, Tile} from '../../../../parsing/types';

export function countItems<T>(
	getKey: (item: T) => {name: string; quality?: string} | undefined,
	items?: T[],
	getCount?: (item: T) => number,
) {
	const counts = new Map<string, number>();
	if (!items) return counts;

	for (const item of items) {
		const keyObj = getKey(item);
		if (!keyObj) continue;

		const key = JSON.stringify(keyObj);
		const count = getCount ? getCount(item) : 1;
		counts.set(key, (counts.get(key) ?? 0) + count);
	}
	return counts;
}

export function mapToSortedArray(counts: Map<string, number>): {name: string; quality: Quality; count: number}[] {
	const parsedArray = Array.from(counts.entries()).map(([key, count]) => {
		const parsed = JSON.parse(key) as {name: string; quality: Quality};
		return {...parsed, count};
	});
	// Sort by count in descending order
	return parsedArray.sort((a, b) => b.count - a.count);
}

export const getEntityKey = (entity: Entity) => ({name: entity.name, quality: entity.quality});

export const getTileKey = (tile: Tile) => ({
	name: tile.name,
	quality: undefined,
});

export const getRecipeKey = (entity: Entity) => {
	if (!entity.recipe) {
		return undefined;
	}
	return {
		name: entity.recipe,
		quality: entity.recipe_quality,
	};
};

export const getItemKey = (item: ItemStack) => {
	return {
		name: item.id.name,
		quality: item.id.quality,
	};
};

export const getItemCount = (item: ItemStack): number => {
	let total = 0;
	for (const location of item.items.in_inventory) {
		total += location.count || 1;
	}
	return total;
};

/**
 * Separates modules items (like productivity/speed modules in machines) from inventory items (like fuel, ammo)
 */
export const processEntitiesItems = (entities?: Entity[]): {moduleItems: ItemStack[]; inventoryItems: ItemStack[]} => {
	if (!entities) return {moduleItems: [], inventoryItems: []};

	const moduleItems: ItemStack[] = [];
	const inventoryItems: ItemStack[] = [];

	for (const entity of entities) {
		if (entity.items && entity.items.length > 0) {
			for (const item of entity.items) {
				// Check if the item is in a module slot (inventory type 4 is typically modules)
				// Other slots: fuel, ammo, etc. are considered inventory items
				const isModuleItem = item.items.in_inventory.some((loc) => loc.inventory === 4);

				if (isModuleItem) {
					moduleItems.push(item);
				} else {
					inventoryItems.push(item);
				}
			}
		}
	}

	return {moduleItems, inventoryItems};
};
