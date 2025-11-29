import {memo} from 'react';

import {BlueprintWrapper} from '../../../../parsing/BlueprintWrapper';
import type {BlueprintString, DeconstructionPlanner} from '../../../../parsing/types';
import {Panel} from '../../../ui';
import {Cell, Row, Spreadsheet} from '../../spreadsheet';

import FilterRowsDisplay from './FilterRowsDisplay';

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
						<Cell
							width="120px"
							grow={false}
						>
							Mode
						</Cell>
						<Cell grow>Only trees and rocks will be marked for deconstruction</Cell>
					</Row>
				)}
				{settings.entity_filter_mode !== undefined && (
					<Row>
						<Cell
							width="120px"
							grow={false}
						>
							Entity Filter Mode
						</Cell>
						<Cell grow>{getFilterModeText(settings.entity_filter_mode)}</Cell>
					</Row>
				)}

				{settings.entity_filters && (
					<FilterRowsDisplay
						filters={settings.entity_filters}
						type="entity"
						label="Entity Filters"
					/>
				)}

				<Row>
					<Cell
						width="120px"
						grow={false}
					>
						Tile Selection
					</Cell>
					<Cell grow>{getTileSelectionText(settings.tile_selection_mode)}</Cell>
				</Row>

				{settings.tile_filters && (
					<FilterRowsDisplay
						filters={settings.tile_filters}
						type="tile"
						label="Tile Filters"
					/>
				)}
			</Spreadsheet>
		</Panel>
	);
};

DeconstructionPlannerPanelComponent.displayName = 'DeconstructionPlannerPanel';
export const DeconstructionPlannerPanel = memo(DeconstructionPlannerPanelComponent);
