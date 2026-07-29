import type {SignalID, SignalType} from '../../../parsing/types';
import {FactorioQualityBadge, factorioQualityLabel} from '../../ui/FactorioUi';

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
	decorative?: boolean;
	id?: string;
	icon?: SignalID;
	size: 'small' | 'large';
}

/**
 * Shared signal presentation for the canonical picker contract. This component
 * renders the prototype and its quality badge only; picker slots own
 * selected/disabled state and `SignalPickerDialog` owns quality selection.
 */
function getQualityNode(icon: SignalID) {
	if (icon.quality === undefined || icon.quality === 'normal') {
		return null;
	}

	return (
		<FactorioQualityBadge
			aria-hidden="true"
			loading="lazy"
			className={styles.iconQuality}
			quality={icon.quality}
			data-testid="quality"
		/>
	);
}

export const FactorioIcon = ({decorative = false, id, icon, size}: FactorioIconProps) => {
	if (!icon) {
		return null;
	}

	const type = icon.type ?? 'item';

	const urlType = getUrlType(type);

	const sizeClass = size === 'small' ? styles.smallSquare : styles.largeSquare;

	const qualityNode = getQualityNode(icon);
	const accessibleName =
		icon.quality === undefined || icon.quality === 'normal'
			? `${type}: ${icon.name}`
			: `${type}: ${icon.name}, ${factorioQualityLabel(icon.quality)}`;

	return (
		<div
			data-testid="iconParent"
			data-factorio-icon-size={size}
			className={`${styles.iconParent} ${sizeClass}`}
			id={id}
			aria-hidden={decorative || undefined}
			aria-label={decorative ? undefined : accessibleName}
			role={decorative ? undefined : 'img'}
		>
			<img
				aria-hidden="true"
				data-testid="icon"
				loading="lazy"
				className={styles.artwork}
				src={`https://factorio-icon-cdn.pages.dev/${urlType}/${icon.name}.webp`}
				alt=""
				title={decorative ? undefined : `${type}: ${icon.name}`}
			/>
			{qualityNode}
		</div>
	);
};

interface PlaceholderProps {
	size: string;
}

export const Placeholder = ({size}: PlaceholderProps) => {
	const sizeClass = size === 'small' ? styles.smallSquare : styles.largeSquare;

	return (
		<div
			className={`${styles.iconParent} ${sizeClass}`}
			data-factorio-icon-size={size === 'small' ? 'small' : 'large'}
			aria-hidden="true"
		>
			<span className={styles.artwork} />
		</div>
	);
};
