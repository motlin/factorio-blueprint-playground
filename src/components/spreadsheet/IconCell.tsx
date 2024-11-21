import {SignalID} from '../../parsing/types.ts';
import {FactorioIcon} from '../FactorioIcon.tsx';

interface IconCellProps {
    icon: SignalID;
    size?: number;
    label?: string;
}

export const IconCell = ({ icon, label }: IconCellProps) => {
    return (
        <div className="spreadsheet-cell spreadsheet-cell-fixed">
            <div className="spreadsheet-icon-container">
                <FactorioIcon icon={icon} size={'large'} />
                {label && <span>{label}</span>}
            </div>
        </div>
    );
};
