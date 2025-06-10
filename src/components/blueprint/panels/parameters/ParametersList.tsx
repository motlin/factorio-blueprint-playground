import {Parameter} from '../../../../parsing/types';
import {InsetDark} from '../../../ui';

import {ParameterRow} from './ParameterRow';

interface ParametersListProps {
	parameters: Parameter[];
}

export const ParametersList = ({parameters}: ParametersListProps) => {
	if (!parameters.length) return null;

	return (
		<InsetDark>
			{parameters.map((param, index) => (
				<ParameterRow
					key={index}
					param={param}
					parameters={parameters}
				/>
			))}
		</InsetDark>
	);
};
