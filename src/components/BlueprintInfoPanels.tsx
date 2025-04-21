import {memo} from 'react';

import {BlueprintWrapper} from '../parsing/BlueprintWrapper';
import {
	BlueprintString,
	DeconstructionPlanner,
	Entity,
	ItemStack,
	Quality,
	SignalType,
	Tile,
	UpgradePlanner,
} from '../parsing/types';

import {FactorioIcon} from './FactorioIcon';
import FilterRowsDisplay from './FilterRowsDisplay';
import {Cell, IconCell, Row, Spreadsheet, TextCell} from './spreadsheet';
import {Panel} from './ui';

function countItems<T>(
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

function mapToSortedArray(counts: Map<string, number>): {name: string; quality: Quality; count: number}[] {
	const parsedArray = Array.from(counts.entries()).map(([key, count]) => {
		const parsed = JSON.parse(key) as {name: string; quality: Quality};
		return {...parsed, count};
	});
	// Sort by count in descending order
	return parsedArray.sort((a, b) => b.count - a.count);
}

// Multi-column list component for showing icon, name, count
function ItemPanel({title, items, type}: {title: string; items: Map<string, number>; type: SignalType}) {
	if (!items.size) return null;

	const sortedItems: {name: string; quality: Quality; count: number}[] = mapToSortedArray(items);

	return (
		<Panel title={title}>
			<Spreadsheet>
				{sortedItems.map(({name, quality, count}) => (
					<Row key={JSON.stringify({type, name, quality})}>
						<IconCell icon={{type, name, quality}} />
						<TextCell grow>{name}</TextCell>
						<TextCell width="80px" align="right" grow={false}>
							{count}
						</TextCell>
					</Row>
				))}
			</Spreadsheet>
		</Panel>
	);
}

interface PanelProps {
	blueprint: BlueprintString;
}

const ContentsPanelComponent = ({blueprint}: PanelProps) => {
	const blueprintContent = blueprint.blueprint;

	if (!blueprintContent) return null;

	if (!blueprintContent.entities?.length && !blueprintContent.tiles?.length) return null;

	const getEntityKey = (entity: Entity) => ({name: entity.name, quality: entity.quality});

	const getTileKey = (tile: Tile) => ({
		name: tile.name,
		quality: undefined,
	});

	const getRecipeKey = (entity: Entity) => {
		if (!entity.recipe) {
			return undefined;
		}
		return {
			name: entity.recipe,
			quality: entity.recipe_quality,
		};
	};

	const getItemKey = (item: ItemStack) => {
		return {
			name: item.id.name,
			quality: item.id.quality,
		};
	};

	const getItemCount = (item: ItemStack): number => {
		let total = 0;
		for (const location of item.items.in_inventory) {
			total += location.count || 1;
		}
		return total;
	};

	// Separate modules items (like productivity/speed modules in machines) from inventory items (like fuel, ammo)
	const processEntitiesItems = (entities?: Entity[]): {moduleItems: ItemStack[]; inventoryItems: ItemStack[]} => {
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

	const entityCounts = countItems(getEntityKey, blueprintContent.entities);
	const tileCounts = countItems(getTileKey, blueprintContent.tiles);
	const recipeCounts = countItems(getRecipeKey, blueprintContent.entities);

	const {moduleItems, inventoryItems} = processEntitiesItems(blueprintContent.entities);
	const itemCounts = countItems(getItemKey, moduleItems, getItemCount);
	const inventoryCounts = countItems(getItemKey, inventoryItems, getItemCount);

	return (
		<>
			<ItemPanel title="Entities" items={entityCounts} type={'entity'} />
			<ItemPanel title="Recipes" items={recipeCounts} type={'recipe'} />
			<ItemPanel title="Tiles" items={tileCounts} type={'tile'} />
			<ItemPanel title="Items" items={itemCounts} type={'item'} />
			<ItemPanel title="Inventory" items={inventoryCounts} type={'item'} />
		</>
	);
};

const UpgradePlannerPanelComponent = ({blueprint}: {blueprint: BlueprintString}) => {
	const wrapper = new BlueprintWrapper(blueprint);
	const {content} = wrapper.getInfo();

	if (!('upgrade_planner' in blueprint)) return null;

	const {settings} = content as UpgradePlanner;
	if (!settings.mappers.length) return null;

	return (
		<Panel title="Upgrade Mappings">
			<Spreadsheet>
				{settings.mappers
					.sort((a, b) => a.index - b.index)
					.map((mapping, index) => (
						<Row key={index}>
							<Cell grow>
								<div style={{margin: 'auto'}}>
									<FactorioIcon icon={mapping.from} size={'large'} />
								</div>
							</Cell>
							<Cell width="40px" align="center">
								→
							</Cell>
							<Cell grow>
								<div style={{margin: 'auto'}}>
									<FactorioIcon icon={mapping.to} size={'large'} />
								</div>
							</Cell>
						</Row>
					))}
			</Spreadsheet>
		</Panel>
	);
};

UpgradePlannerPanelComponent.displayName = 'UpgradePlannerPanel';
export const UpgradePlannerPanel = memo(UpgradePlannerPanelComponent);

function getFilterModeText(mode?: number): string {
	if (mode === 1) return 'Banned list: Remove only filtered items';
	return 'Allowed list: Remove everything except filtered items';
}

const DeconstructionPlannerPanelComponent = ({blueprint}: {blueprint: BlueprintString}) => {
	const wrapper = new BlueprintWrapper(blueprint);
	const {content} = wrapper.getInfo();

	if (!('deconstruction_planner' in blueprint)) return null;

	const {settings} = content as DeconstructionPlanner;

	const getTileSelectionText = (mode?: number) => {
		switch (mode) {
			case 1:
				return 'Default tile behavior';
			case 2:
				return 'Never deconstruct tiles';
			case 3:
				return 'Always deconstruct tiles';
			default:
				return 'Default tile behavior';
		}
	};

	return (
		<Panel title="Deconstruction Settings">
			<Spreadsheet>
				{settings.trees_and_rocks_only && (
					<Row>
						<Cell width="120px" grow={false}>
							Mode
						</Cell>
						<Cell grow>Only trees and rocks will be marked for deconstruction</Cell>
					</Row>
				)}
				{settings.entity_filter_mode !== undefined && (
					<Row>
						<Cell width="120px" grow={false}>
							Entity Filter Mode
						</Cell>
						<Cell grow>{getFilterModeText(settings.entity_filter_mode)}</Cell>
					</Row>
				)}

				{settings.entity_filters && (
					<FilterRowsDisplay filters={settings.entity_filters} type="entity" label="Entity Filters" />
				)}

				<Row>
					<Cell width="120px" grow={false}>
						Tile Selection
					</Cell>
					<Cell grow>{getTileSelectionText(settings.tile_selection_mode)}</Cell>
				</Row>

				{settings.tile_filters && (
					<FilterRowsDisplay filters={settings.tile_filters} type="tile" label="Tile Filters" />
				)}
			</Spreadsheet>
		</Panel>
	);
};

const BlueprintInfoPanelsComponent = ({blueprint}: {blueprint?: BlueprintString}) => {
	if (!blueprint) return null;
	return (
		<>
			{/* Show type-specific panels */}
			{blueprint.blueprint && <ContentsPanel blueprint={blueprint} />}
			{blueprint.upgrade_planner && <UpgradePlannerPanel blueprint={blueprint} />}
			{blueprint.deconstruction_planner && <DeconstructionPlannerPanel blueprint={blueprint} />}
		</>
	);
};

ContentsPanelComponent.displayName = 'ContentsPanel';
export const ContentsPanel = memo(ContentsPanelComponent);

DeconstructionPlannerPanelComponent.displayName = 'DeconstructionPlannerPanel';
export const DeconstructionPlannerPanel = memo(DeconstructionPlannerPanelComponent);

BlueprintInfoPanelsComponent.displayName = 'BlueprintInfoPanels';
export const BlueprintInfoPanels = memo(BlueprintInfoPanelsComponent);
