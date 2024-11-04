import {SignalID} from "../parsing/types.ts";

export const FactorioIcon = (icon: SignalID) => {
    let type = icon.type || 'item';
    let urlType = icon.type || 'item';

    if (urlType === 'virtual') {
        urlType = 'virtual-signal';
    } else if (urlType === 'planet') {
        urlType = 'space-location';
    }

    // If we have a quality, render in a div that itself is a factorio-icon
    if (icon.quality) {
        return (
            <div className="factorio-icon-group">
                <img
                    className='factorio-icon'
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
