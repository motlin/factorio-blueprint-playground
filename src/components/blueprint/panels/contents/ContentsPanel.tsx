import {memo} from 'react';

import type {BlueprintString} from '../../../../parsing/types';
import {
	countItems,
	getEntityKey,
	getItemCount,
	getItemKey,
	getRecipeKey,
	getTileKey,
	processEntitiesItems,
} from './countUtils';
import {ItemPanel} from './ItemPanel';

interface PanelProps {
	blueprint: BlueprintString;
}

const ContentsPanelComponent = ({blueprint}: PanelProps) => {
	const blueprintContent = blueprint.blueprint;

	if (!blueprintContent) return null;

	if (!blueprintContent.entities?.length && !blueprintContent.tiles?.length) return null;

	const entityCounts = countItems(getEntityKey, blueprintContent.entities);
	const tileCounts = countItems(getTileKey, blueprintContent.tiles);
	const recipeCounts = countItems(getRecipeKey, blueprintContent.entities);

	const {moduleItems, inventoryItems} = processEntitiesItems(blueprintContent.entities);
	const itemCounts = countItems(getItemKey, moduleItems, getItemCount);
	const inventoryCounts = countItems(getItemKey, inventoryItems, getItemCount);

	return (
		<>
			<ItemPanel
				title="Entities"
				items={entityCounts}
				type={'entity'}
			/>
			<ItemPanel
				title="Recipes"
				items={recipeCounts}
				type={'recipe'}
			/>
			<ItemPanel
				title="Tiles"
				items={tileCounts}
				type={'tile'}
			/>
			<ItemPanel
				title="Items"
				items={itemCounts}
				type={'item'}
			/>
			<ItemPanel
				title="Inventory"
				items={inventoryCounts}
				type={'item'}
			/>
		</>
	);
};

ContentsPanelComponent.displayName = 'ContentsPanel';
export const ContentsPanel = memo(ContentsPanelComponent);
