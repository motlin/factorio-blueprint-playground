import {memo} from 'react';

import type {BlueprintString, DeconstructionPlanner} from '../../../../parsing/types';
import {Panel} from '../../../ui/Panel';
import {Cell} from '../../spreadsheet/Cell';
import {Row} from '../../spreadsheet/Row';
import {Spreadsheet} from '../../spreadsheet/Spreadsheet';

import FilterRowsDisplay from './FilterRowsDisplay';

function getFilterModeText(mode?: number): string {
	if (mode === 1) return 'Banned list: Remove only filtered items';
	return 'Allowed list: Remove everything except filtered items';
}

const DeconstructionPlannerPanelComponent = ({blueprint}: {blueprint: BlueprintString}) => {
	const planner: DeconstructionPlanner | undefined = blueprint.deconstruction_planner;
	if (!planner) return null;

	const {settings} = planner;

	const getTileSelectionText = (mode?: 1 | 2 | 3): string => {
		if (mode === 2) return 'Never deconstruct tiles';
		if (mode === 3) return 'Always deconstruct tiles';
		return 'Default tile behavior';
	};

	return (
		<Panel title="Deconstruction Settings">
			<Spreadsheet>
				{settings.trees_and_rocks_only === true ? (
					<Row>
						<Cell width="120px" grow={false}>
							Mode
						</Cell>
						<Cell grow>Only trees and rocks will be marked for deconstruction</Cell>
					</Row>
				) : null}
				{settings.entity_filter_mode === undefined ? null : (
					<Row>
						<Cell width="120px" grow={false}>
							Entity Filter Mode
						</Cell>
						<Cell grow>{getFilterModeText(settings.entity_filter_mode)}</Cell>
					</Row>
				)}

				{settings.entity_filters ? (
					<FilterRowsDisplay filters={settings.entity_filters} type="entity" label="Entity Filters" />
				) : null}

				<Row>
					<Cell width="120px" grow={false}>
						Tile Selection
					</Cell>
					<Cell grow>{getTileSelectionText(settings.tile_selection_mode)}</Cell>
				</Row>

				{settings.tile_filters ? (
					<FilterRowsDisplay filters={settings.tile_filters} type="tile" label="Tile Filters" />
				) : null}
			</Spreadsheet>
		</Panel>
	);
};

DeconstructionPlannerPanelComponent.displayName = 'DeconstructionPlannerPanel';
export const DeconstructionPlannerPanel = memo(DeconstructionPlannerPanelComponent);
