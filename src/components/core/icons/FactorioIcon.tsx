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

const utilityIconUrls = new Map([['parametrise', '/assets/factorio/parametrise.png']]);

/**
 * Utility sprites ship with the game rather than the icon CDN, so only the
 * names bundled under `/assets/factorio` resolve. Blueprint descriptions can
 * name any utility sprite through rich text, so an unknown name renders blank
 * artwork instead of throwing out of render.
 */
function getIconUrl(type: SignalType, name: string): string | undefined {
	if (type === 'utility') {
		return utilityIconUrls.get(name);
	}

	return `https://factorio-icon-cdn.pages.dev/${getUrlType(type)}/${name}.webp`;
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

	const sizeClass = size === 'small' ? styles.smallSquare : styles.largeSquare;
	const parameterMatch = /^parameter-(\d+)$/.exec(icon.name);
	const iconUrl = getIconUrl(type, icon.name);

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
			{parameterMatch === null && iconUrl !== undefined ? (
				<img
					aria-hidden="true"
					data-testid="icon"
					loading="lazy"
					className={styles.artwork}
					src={iconUrl}
					alt=""
					title={decorative ? undefined : `${type}: ${icon.name}`}
				/>
			) : (
				<span
					aria-hidden="true"
					data-testid="icon"
					className={
						parameterMatch === null ? styles.artwork : `${styles.artwork} ${styles.parameterArtwork}`
					}
					title={decorative ? undefined : `${type}: ${icon.name}`}
				>
					{parameterMatch?.[1]}
				</span>
			)}
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
