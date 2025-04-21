import {memo} from 'react';

import {BlueprintString} from '../parsing/types';

import {ParametersList} from './blueprint/panels/parameters/ParametersList';
import {Panel} from './ui';

const ParametersPanelComponent = ({blueprintString}: {blueprintString?: BlueprintString}) => {
	if (!blueprintString?.blueprint?.parameters?.length) return null;

	return (
		<Panel title="Parameters">
			<ParametersList parameters={blueprintString.blueprint.parameters} />
		</Panel>
	);
};

ParametersPanelComponent.displayName = 'ParametersPanel';
export const ParametersPanel = memo(ParametersPanelComponent);
