import {useState} from 'react';

import type {QualityComparator} from '../../../../parsing/types';
import {FactorioIcon} from '../../../core/icons/FactorioIcon';
import {
	upgradeQualities,
	upgradeQualityComparators,
	type UpgradeQualityMode,
	type UpgradeQualitySelection,
} from './upgradeQuality';
import {signalName} from './upgradePlannerSignals';

interface UpgradeQualityControlsProps {
	mode: UpgradeQualityMode;
	onComparatorChange?: (comparator: QualityComparator) => void;
	onQualityChange: (selection: UpgradeQualitySelection) => void;
	qualityComparator: QualityComparator;
	qualitySelection: UpgradeQualitySelection;
}

function AnyQualityIcon() {
	return (
		<span className="upgrade-quality-controls__any-icon" aria-hidden="true">
			{upgradeQualities.slice(1).map((quality) => (
				<img key={quality} src={`https://factorio-icon-cdn.pages.dev/quality/${quality}.webp`} alt="" />
			))}
		</span>
	);
}

function QualityComparatorControl({
	onComparatorChange,
	onQualityChange,
	qualityComparator,
	qualitySelection,
}: {
	onComparatorChange: (comparator: QualityComparator) => void;
	onQualityChange: (selection: UpgradeQualitySelection) => void;
	qualityComparator: QualityComparator;
	qualitySelection: UpgradeQualitySelection;
}) {
	const [menuOpen, setMenuOpen] = useState(false);

	return (
		<div className="upgrade-quality-controls__condition">
			<button
				type="button"
				className="upgrade-quality-controls__any"
				aria-label="Any quality"
				aria-pressed={qualitySelection === 'any'}
				title="Any quality"
				onClick={() => {
					onQualityChange('any');
				}}
			>
				<AnyQualityIcon />
			</button>
			<button
				type="button"
				className="upgrade-quality-controls__comparator-toggle"
				aria-label={`Quality comparison: ${qualityComparator}`}
				aria-expanded={menuOpen}
				aria-haspopup="menu"
				title={`Quality comparison: ${qualityComparator}`}
				onClick={() => {
					setMenuOpen((current) => !current);
				}}
			>
				<span aria-hidden="true">▾</span>
			</button>
			{menuOpen ? (
				<div className="upgrade-quality-controls__comparator-menu" role="menu" aria-label="Quality comparison">
					{upgradeQualityComparators.map((comparator) => (
						<button
							type="button"
							key={comparator}
							role="menuitemradio"
							aria-checked={qualityComparator === comparator}
							onClick={() => {
								onComparatorChange(comparator);
								setMenuOpen(false);
							}}
						>
							{comparator}
						</button>
					))}
				</div>
			) : null}
		</div>
	);
}

function QualityButtons({
	onQualityChange,
	qualitySelection,
}: {
	onQualityChange: (selection: UpgradeQualitySelection) => void;
	qualitySelection: UpgradeQualitySelection;
}) {
	return upgradeQualities.map((quality) => {
		const label = `${signalName({name: quality})} quality`;
		return (
			<button
				type="button"
				className="upgrade-quality-controls__quality"
				key={quality}
				aria-label={label}
				aria-pressed={qualitySelection === quality}
				title={label}
				onClick={() => {
					onQualityChange(quality);
				}}
			>
				<FactorioIcon icon={{type: 'quality', name: quality}} size="small" />
			</button>
		);
	});
}

/**
 * Quality footer profile for `SignalPickerDialog`.
 *
 * Source mode represents Factorio's `QualityConditionGui`: Any plus an ordered
 * comparator menu and the shared quality selector. Target mode, also used by
 * local blueprint icons, represents `QualityGui`: one exact quality. A generated
 * quality count may switch the selector from buttons to a dropdown, but must not
 * introduce another quality state or picker.
 */
export function UpgradeQualityControls({
	mode,
	onComparatorChange,
	onQualityChange,
	qualityComparator,
	qualitySelection,
}: UpgradeQualityControlsProps) {
	const modeLabel = signalName({name: mode});
	const comparatorChanged = (comparator: QualityComparator) => {
		if (onComparatorChange === undefined) {
			throw new Error('Source quality controls require a comparator change handler.');
		}
		onComparatorChange(comparator);
	};

	return (
		<div
			className="upgrade-quality-controls upgrade-quality-controls--picker"
			role="group"
			aria-label={`${modeLabel} quality`}
		>
			{mode === 'source' ? (
				<QualityComparatorControl
					onComparatorChange={comparatorChanged}
					onQualityChange={onQualityChange}
					qualityComparator={qualityComparator}
					qualitySelection={qualitySelection}
				/>
			) : null}
			<QualityButtons onQualityChange={onQualityChange} qualitySelection={qualitySelection} />
		</div>
	);
}
