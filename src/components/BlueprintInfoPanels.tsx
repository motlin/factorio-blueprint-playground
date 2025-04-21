import {memo} from 'react';

import {BlueprintWrapper} from '../parsing/BlueprintWrapper';
import {BlueprintString, DeconstructionPlanner, UpgradePlanner} from '../parsing/types';

import {FactorioIcon} from './FactorioIcon';
import FilterRowsDisplay from './FilterRowsDisplay';
import {ItemPanel} from './blueprint/panels/contents/ItemPanel';
import {
	countItems,
	getEntityKey,
	getItemCount,
	getItemKey,
	getRecipeKey,
	getTileKey,
	processEntitiesItems,
} from './blueprint/panels/contents/countUtils';
import {Cell, Row, Spreadsheet} from './spreadsheet';
import {Panel} from './ui';

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
