import {SignalID, SignalType} from '../parsing/types.ts';

function getUrlType(type: SignalType) {
    if (type === 'virtual') {
        return 'virtual-signal';
    } else if (type === 'planet') {
        return 'space-location';
    }
    return type;
}

interface FactorioIconProps {
    id?: string,
    icon?: SignalID,
}

export const FactorioIcon = ({id, icon}: FactorioIconProps) => {
    if (!icon) {
        return null;
    }

    const type = icon.type ?? 'item';

    const urlType = getUrlType(type);

    // If we have a quality, render in a div that itself is a factorio-icon
    if (icon.quality) {
        return (
            <div className="factorio-icon-group" id={id}>
                <img
                    className="factorio-icon"
                    src={`/icons/${urlType}/${icon.name}.png`}
                    alt={icon.name}
                    title={`${type}: ${icon.name}`}
                />
                <img
                    className="quality"
                    src={`/icons/quality/${icon.quality}.png`}
                    alt={icon.quality}
                    title={`Quality: ${icon.quality}`}
                />
            </div>
        );
    }

    // Without quality, render just the icon
    return (
        <img
            className="factorio-icon"
            src={`/icons/${urlType}/${icon.name}.png`}
            alt={icon.name}
            title={`${type}: ${icon.name}`}
        />
    );
};
