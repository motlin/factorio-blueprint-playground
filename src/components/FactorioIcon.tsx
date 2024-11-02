import React from 'react';

// Enhanced FactorioIcon component that can handle quality overlays
export const FactorioIcon = ({ icon, size = 32 }: {
    icon: {
        type?: string;
        name: string;
        quality?: string;
    };
    size?: number;
}) => {
    let type = icon.type || 'item';
    let urlType = icon.type || 'item';

    if (urlType === 'virtual') {
        urlType = 'virtual-signal';
    } else if (urlType === 'planet') {
        urlType = 'space-location';
    }

    // If we have a quality, render in a container with the quality overlay
    if (icon.quality) {
        return (
            <div className="richtext-icon" style={{ height: `${size}px` }}>
                <img
                    className="icon"
                    src={`https://www.factorio.school/icons/${urlType}/${icon.name}.png`}
                    alt={icon.name}
                    title={`${type}: ${icon.name}`}
                />
                <img
                    className="quality"
                    src={`https://www.factorio.school/icons/quality/${icon.quality}.png`}
                    alt={icon.quality}
                    title={`Quality: ${icon.quality}`}
                />
            </div>
        );
    }

    // Without quality, render just the icon
    return (
        <img
            src={`https://www.factorio.school/icons/${urlType}/${icon.name}.png`}
            alt={icon.name}
            title={`${type}: ${icon.name}`}
            className="factorio-icon mr2 vertical-align-middle"
            style={{ width: size, height: size }}
        />
    );
};
