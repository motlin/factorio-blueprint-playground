import {memo} from 'react';

import {BlueprintWrapper} from '../../../../parsing/BlueprintWrapper';
import {BlueprintString, UpgradePlanner} from '../../../../parsing/types';
import {FactorioIcon} from '../../../core/icons/FactorioIcon';
import {Panel} from '../../../ui';
import {Cell, Row, Spreadsheet} from '../../spreadsheet';

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
					.map((mapping) => (
						<Row key={mapping.index}>
							<Cell grow>
								<div style={{margin: 'auto'}}>
									<FactorioIcon
										icon={mapping.from}
										size={'large'}
									/>
								</div>
							</Cell>
							<Cell
								width="40px"
								align="center"
							>
								→
							</Cell>
							<Cell grow>
								<div style={{margin: 'auto'}}>
									<FactorioIcon
										icon={mapping.to}
										size={'large'}
									/>
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
