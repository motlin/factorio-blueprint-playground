import {FactorioIcon} from "../FactorioIcon.tsx";

interface IconCellProps {
    icon: any;
    size?: number;
    label?: string;
}

export const IconCell = ({ icon, size = 32, label }: IconCellProps) => {
    return (
        <div className="spreadsheet-cell spreadsheet-cell-fixed">
            <div className="spreadsheet-icon-container">
                <FactorioIcon icon={icon} size={size} />
                {label && <span>{label}</span>}
            </div>
        </div>
    );
};

