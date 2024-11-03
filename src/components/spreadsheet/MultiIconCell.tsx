import {FactorioIcon} from "../FactorioIcon.tsx";

interface MultiIconCellProps {
    icons: any[];
    size?: number;
}

export const MultiIconCell = ({ icons, size = 32 }: MultiIconCellProps) => {
    return (
        <div className="spreadsheet-cell">
            <div className="spreadsheet-multi-icon">
                {icons.map((icon, index) => (
                    <FactorioIcon key={index} icon={icon} size={size} />
                ))}
            </div>
        </div>
    );
};
