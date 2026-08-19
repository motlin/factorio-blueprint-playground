import {useRef, useState} from 'react';
import {createPortal} from 'react-dom';

import type {QualityComparator} from '../../../../parsing/types';
import {FactorioInventorySlot, FactorioQualityBadge} from '../../../ui/FactorioUi';
import {
	anyQualityLabel,
	explicitQuality,
	qualitySelectorUsesDropdown,
	upgradeQualities,
	upgradeQualityComparators,
	upgradeQualityLabel,
	type ExplicitQuality,
	type UpgradeQualityMode,
	type UpgradeQualitySelection,
} from './upgradeQuality';
import {signalName} from './upgradePlannerSignals';
import {useDialogFocus} from './useDialogFocus';

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
				<FactorioQualityBadge key={quality} quality={quality} />
			))}
		</span>
	);
}

interface QualityComparatorMenuProps {
	anchorBottom: number;
	anchorLeft: number;
	onAnyChoose: () => void;
	onCancel: () => void;
	onComparatorChoose: (comparator: QualityComparator) => void;
	qualityComparator: QualityComparator;
	qualitySelection: UpgradeQualitySelection;
}

function QualityComparatorMenu({
	anchorBottom,
	anchorLeft,
	onAnyChoose,
	onCancel,
	onComparatorChoose,
	qualityComparator,
	qualitySelection,
}: QualityComparatorMenuProps) {
	const dialogReference = useDialogFocus<HTMLElement>({
		initialFocusSelector: '[role="menuitemradio"]',
		onClose: onCancel,
	});

	return createPortal(
		<div
			className="upgrade-quality-controls__menu-layer"
			onMouseDown={(event) => {
				if (event.target === event.currentTarget) {
					onCancel();
				}
			}}
		>
			<section
				ref={dialogReference}
				className="factorio-frame factorio-frame--shallow upgrade-quality-controls__menu-dialog"
				role="dialog"
				aria-modal="true"
				aria-label="Quality comparison"
				style={{bottom: anchorBottom, left: anchorLeft}}
			>
				<div className="upgrade-quality-controls__comparator-menu" role="menu" aria-label="Quality comparison">
					<button
						type="button"
						role="menuitemradio"
						aria-checked={qualitySelection === 'any'}
						onClick={onAnyChoose}
					>
						<AnyQualityIcon />
						<span>{anyQualityLabel}</span>
					</button>
					{upgradeQualityComparators.map((comparator) => (
						<button
							type="button"
							key={comparator}
							role="menuitemradio"
							aria-checked={qualitySelection !== 'any' && qualityComparator === comparator}
							onClick={() => {
								onComparatorChoose(comparator);
							}}
						>
							{comparator}
						</button>
					))}
				</div>
			</section>
		</div>,
		document.body,
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
	const [menuAnchor, setMenuAnchor] = useState({bottom: 0, left: 0});
	const toggleReference = useRef<HTMLButtonElement>(null);
	const comparisonLabel = qualitySelection === 'any' ? anyQualityLabel : `Quality comparison: ${qualityComparator}`;

	return (
		<div className="upgrade-quality-controls__condition">
			<FactorioInventorySlot
				ref={toggleReference}
				className="upgrade-quality-controls__comparator-toggle"
				aria-label={comparisonLabel}
				aria-expanded={menuOpen}
				aria-haspopup="dialog"
				selected={qualitySelection === 'any'}
				title={comparisonLabel}
				onClick={() => {
					const bounds = toggleReference.current?.getBoundingClientRect();
					if (bounds !== undefined) {
						setMenuAnchor({
							bottom: window.innerHeight - bounds.top + 3,
							left: bounds.left,
						});
					}
					setMenuOpen(true);
				}}
			>
				{qualitySelection === 'any' ? <AnyQualityIcon /> : <span aria-hidden="true">{qualityComparator}</span>}
				<span className="upgrade-quality-controls__dropdown-arrow" aria-hidden="true">
					▾
				</span>
			</FactorioInventorySlot>
			{menuOpen ? (
				<QualityComparatorMenu
					anchorBottom={menuAnchor.bottom}
					anchorLeft={menuAnchor.left}
					onAnyChoose={() => {
						onQualityChange('any');
						setMenuOpen(false);
					}}
					onCancel={() => {
						setMenuOpen(false);
					}}
					onComparatorChoose={(comparator) => {
						onComparatorChange(comparator);
						if (qualitySelection === 'any') {
							onQualityChange('normal');
						}
						setMenuOpen(false);
					}}
					qualityComparator={qualityComparator}
					qualitySelection={qualitySelection}
				/>
			) : null}
		</div>
	);
}

function qualityLabel(quality: ExplicitQuality): string {
	return `${upgradeQualityLabel(quality)} quality`;
}

function QualitySelector({
	onQualityChange,
	qualitySelection,
}: {
	onQualityChange: (selection: UpgradeQualitySelection) => void;
	qualitySelection: UpgradeQualitySelection;
}) {
	const exactQuality = qualitySelection === 'any' ? 'normal' : qualitySelection;
	if (qualitySelectorUsesDropdown(upgradeQualities.length)) {
		return (
			<label className="upgrade-quality-controls__quality-dropdown">
				<span>Quality</span>
				<FactorioQualityBadge quality={exactQuality} aria-hidden="true" />
				<select
					aria-label="Quality"
					value={exactQuality}
					onChange={(event) => {
						onQualityChange(explicitQuality(event.currentTarget.value));
					}}
				>
					{upgradeQualities.map((quality) => (
						<option key={quality} value={quality}>
							{upgradeQualityLabel(quality)}
						</option>
					))}
				</select>
			</label>
		);
	}

	return upgradeQualities.map((quality) => {
		const label = qualityLabel(quality);
		return (
			<FactorioInventorySlot
				className="upgrade-quality-controls__quality"
				key={quality}
				aria-label={label}
				selected={qualitySelection === quality}
				title={label}
				onClick={() => {
					onQualityChange(quality);
				}}
			>
				<FactorioQualityBadge quality={quality} aria-hidden="true" />
			</FactorioInventorySlot>
		);
	});
}

/**
 * The single quality footer used by `SignalPickerDialog`.
 *
 * Source mode models `QualityConditionGui`: an Any sentinel or ordered
 * comparator plus the shared exact selector. Target mode models `QualityGui`.
 * The exact selector uses registered visible qualities and switches to the
 * configured dropdown representation at the generated threshold.
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
			<QualitySelector onQualityChange={onQualityChange} qualitySelection={qualitySelection} />
		</div>
	);
}
