import {SignalID, SignalType} from '../parsing/types';

import styles from './FactorioIcon.module.css';

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
    size: 'small' | 'large',
}

function getQualityNode(icon: SignalID) {
    if (!icon.quality) {
        return null;
    }

    return <img
        loading="lazy"
        className={styles.iconQuality}
        src={`/icons/quality/${icon.quality}.webp`}
        alt={icon.quality}
        title={`Quality: ${icon.quality}`}
        data-testid="quality"
    />;
}

export const FactorioIcon = ({id, icon, size}: FactorioIconProps) => {
    if (!icon) {
        return null;
    }

    const type = icon.type ?? 'item';

    const urlType = getUrlType(type);

    const sizeClass = size === 'small' ? styles.smallSquare : styles.largeSquare;

    const qualityNode = getQualityNode(icon);

    return (
        <div
            data-testid="iconParent"
            className={`${styles.iconParent} ${sizeClass}`}
            id={id}
        >
            <img
                data-testid="icon"
                loading="lazy"
                className={styles.icon}
                src={`/icons/${urlType}/${icon.name}.webp`}
                alt={icon.name}
                title={`${type}: ${icon.name}`}
            />
            {qualityNode}
        </div>
    );
};

interface PlaceholderProps {
    size: string,
}

export const Placeholder = ({ size}: PlaceholderProps) => {
    const sizeClass = size === 'small' ? styles.smallSquare : styles.largeSquare;

    return (
        <div className={`${styles.iconParent} ${sizeClass}`}>
            <div
                className={styles.icon}
            />
        </div>
    );
};
