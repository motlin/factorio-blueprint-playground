import {memo} from 'react';

import type {BlueprintString} from '../../../parsing/types';

import {ContentsPanel} from './contents/ContentsPanel';
import {DeconstructionPlannerPanel} from './deconstruction/DeconstructionPlannerPanel';
import {LintPanel} from './lint/LintPanel';
import {ModDetectionPanel} from './mod-detection/ModDetectionPanel';
import {UpgradePlannerPanel} from './upgrade/UpgradePlannerPanel';

interface BlueprintInfoPanelsProps {
	blueprint?: BlueprintString;
	selectedPath?: string;
	onSelect?: (path: string) => void;
}

const BlueprintInfoPanelsComponent = ({blueprint, selectedPath, onSelect}: BlueprintInfoPanelsProps) => {
	if (!blueprint) return null;
	return (
		<>
			{blueprint.blueprint ? <ContentsPanel blueprint={blueprint} /> : null}
			{blueprint.blueprint || blueprint.blueprint_book ? (
				<LintPanel blueprint={blueprint} selectedPath={selectedPath} onSelect={onSelect} />
			) : null}
			{blueprint.upgrade_planner ? <UpgradePlannerPanel blueprint={blueprint} /> : null}
			{blueprint.deconstruction_planner ? <DeconstructionPlannerPanel blueprint={blueprint} /> : null}
			<ModDetectionPanel blueprint={blueprint} />
		</>
	);
};

BlueprintInfoPanelsComponent.displayName = 'BlueprintInfoPanels';
export const BlueprintInfoPanels = memo(BlueprintInfoPanelsComponent);
