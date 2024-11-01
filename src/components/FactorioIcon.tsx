import type { DatabaseBlueprintIcon } from '../storage/blueprints';

export interface FactorioIconProps {
    icon: DatabaseBlueprintIcon;
    size?: number;
}

export const FactorioIcon = ({ icon, size = 32 }: FactorioIconProps) => {
    // Default to item type if not specified
    const type = icon.type || 'item';

    return (
        <img
            src={`https://www.factorio.school/icons/${type}/${icon.name}.png`}
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

export const IconsList = ({ icons }: { icons: DatabaseBlueprintIcon[] }) => (
    <div className="flex flex-items-center">
        {icons.map((icon, index) => (
            <FactorioIcon key={index} icon={icon} />
        ))}
    </div>
);