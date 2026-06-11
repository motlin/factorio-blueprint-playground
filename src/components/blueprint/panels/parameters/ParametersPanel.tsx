import {memo} from 'react';

import type {BlueprintString} from '../../../../parsing/types';
import {Panel} from '../../../ui/Panel';

import {ParametersList} from './ParametersList';

const ParametersPanelComponent = ({blueprintString}: {blueprintString?: BlueprintString}) => {
	const parameters = blueprintString?.blueprint?.parameters;
	if (parameters == null || parameters.length === 0) return null;

	return (
		<Panel title="Parameters">
			<ParametersList parameters={parameters} />
		</Panel>
	);
};

ParametersPanelComponent.displayName = 'ParametersPanel';
export const ParametersPanel = memo(ParametersPanelComponent);
