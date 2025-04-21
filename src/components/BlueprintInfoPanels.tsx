import {memo} from 'react';

import {BlueprintString} from '../parsing/types';

import {ContentsPanel} from './blueprint/panels/contents/ContentsPanel';
import {DeconstructionPlannerPanel} from './blueprint/panels/deconstruction/DeconstructionPlannerPanel';
import {UpgradePlannerPanel} from './blueprint/panels/upgrade/UpgradePlannerPanel';

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

BlueprintInfoPanelsComponent.displayName = 'BlueprintInfoPanels';
export const BlueprintInfoPanels = memo(BlueprintInfoPanelsComponent);
