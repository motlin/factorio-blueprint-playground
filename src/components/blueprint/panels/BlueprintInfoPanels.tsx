import {memo} from 'react';

import type {BlueprintString} from '../../../parsing/types';

import {ContentsPanel} from './contents/ContentsPanel';
import {DeconstructionPlannerPanel} from './deconstruction/DeconstructionPlannerPanel';
import {LintPanel} from './lint/LintPanel';
import {UpgradePlannerPanel} from './upgrade/UpgradePlannerPanel';

const BlueprintInfoPanelsComponent = ({blueprint}: {blueprint?: BlueprintString}) => {
	if (!blueprint) return null;
	return (
		<>
			{blueprint.blueprint ? <ContentsPanel blueprint={blueprint} /> : null}
			{blueprint.blueprint ? <LintPanel blueprint={blueprint} /> : null}
			{blueprint.upgrade_planner ? <UpgradePlannerPanel blueprint={blueprint} /> : null}
			{blueprint.deconstruction_planner ? <DeconstructionPlannerPanel blueprint={blueprint} /> : null}
		</>
	);
};

BlueprintInfoPanelsComponent.displayName = 'BlueprintInfoPanels';
export const BlueprintInfoPanels = memo(BlueprintInfoPanelsComponent);
