import type { DatabaseBlueprintIcon } from '../storage/blueprints';

export interface FactorioIconProps {
    icon: DatabaseBlueprintIcon;
    size?: number;
}

export const FactorioIcon = ({ icon, size = 32 }: FactorioIconProps) => {
    let type = icon.type || 'item';
    let urlType = icon.type || 'item';

    // Remap 'virtual' type to 'virtual-signal' for URL
    if (urlType === 'virtual') {
        urlType = 'virtual-signal';
    }

    return (
        <img
            src={`https://www.factorio.school/icons/${urlType}/${icon.name}.png`}
            alt={icon.name}
            title={`${type}: ${icon.name}`}
            className="mr2 vertical-align-middle"
            style={{
                width: size,
                height: size,
                objectFit: 'contain'
            }}
        />
    );
};
