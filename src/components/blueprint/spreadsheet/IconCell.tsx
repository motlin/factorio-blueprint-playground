import type {SignalID} from '../../../parsing/types';
import {FactorioIcon} from '../../core/icons/FactorioIcon';

interface IconCellProps {
	icon: SignalID;
	size?: number;
	label?: string;
}

export const IconCell = ({icon, label}: IconCellProps) => {
	return (
		<div className="spreadsheet-cell spreadsheet-cell-fixed">
			<div className="spreadsheet-icon-container">
				<FactorioIcon
					icon={icon}
					size={'large'}
				/>
				{label ? <span>{label}</span> : null}
			</div>
		</div>
	);
};
