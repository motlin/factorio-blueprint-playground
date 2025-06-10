import {memo} from 'react';

import type {BlueprintString} from '../../../../parsing/types';

interface BlueprintInfoPanelsProps {
	blueprint?: BlueprintString;
	selectedPath?: string;
}

const BlueprintInfoPanelsMock = ({blueprint, selectedPath}: BlueprintInfoPanelsProps) => {
	return (
		<div data-testid="blueprint-info-panels-mock">
			<div>Blueprint: {blueprint ? 'Present' : 'Not present'}</div>
			<div>Selected Path: {selectedPath || 'None'}</div>
		</div>
	);
};

BlueprintInfoPanelsMock.displayName = 'BlueprintInfoPanelsMock';
export const BlueprintInfoPanels = memo(BlueprintInfoPanelsMock);
