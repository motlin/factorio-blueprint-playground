import {memo} from 'react';

import type {BlueprintString, UpgradePlanner} from '../../../../parsing/types';
import {FactorioIcon} from '../../../core/icons/FactorioIcon';
import {Panel} from '../../../ui/Panel';
import {Cell} from '../../spreadsheet/Cell';
import {Row} from '../../spreadsheet/Row';
import {Spreadsheet} from '../../spreadsheet/Spreadsheet';

const UpgradePlannerPanelComponent = ({blueprint}: {blueprint: BlueprintString}) => {
	const planner: UpgradePlanner | undefined = blueprint.upgrade_planner;
	if (!planner) return null;

	const {settings} = planner;
	if (settings.mappers.length === 0) return null;

	return (
		<Panel title="Upgrade Mappings">
			<Spreadsheet>
				{settings.mappers
					.sort((a, b) => a.index - b.index)
					.map((mapping) => (
						<Row key={mapping.index}>
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
