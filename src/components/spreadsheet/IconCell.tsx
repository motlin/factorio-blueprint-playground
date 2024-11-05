import {FactorioIcon} from '../FactorioIcon.tsx';

interface IconCellProps {
    icon: any;
    size?: number;
    label?: string;
}

export const IconCell = ({ icon, label }: IconCellProps) => {
    return (
        <div className="spreadsheet-cell spreadsheet-cell-fixed">
            <div className="spreadsheet-icon-container">
                <FactorioIcon type={icon.type} name={icon.name} quality={icon.quality} />
                {label && <span>{label}</span>}
            </div>
        </div>
    );
};

