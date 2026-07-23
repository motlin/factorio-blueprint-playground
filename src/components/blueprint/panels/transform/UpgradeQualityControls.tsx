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
	layout: 'mapping' | 'picker';
	mode: UpgradeQualityMode;
	onComparatorChange?: (comparator: QualityComparator) => void;
	onQualityChange: (selection: UpgradeQualitySelection) => void;
	qualityComparator: QualityComparator;
	qualitySelection: UpgradeQualitySelection;
}

function isUpgradeQualityComparator(value: string): value is QualityComparator {
	return upgradeQualityComparators.some((comparator) => comparator === value);
}

function QualityComparatorSelect({
	disabled,
	onComparatorChange,
	qualityComparator,
}: {
	disabled: boolean;
	onComparatorChange: (comparator: QualityComparator) => void;
	qualityComparator: QualityComparator;
}) {
	return (
		<label>
			<span className="transform-visually-hidden">Quality comparison</span>
			<select
				aria-label="Quality comparison"
				value={qualityComparator}
				disabled={disabled}
				onChange={(event) => {
					if (!isUpgradeQualityComparator(event.currentTarget.value)) {
						throw new Error(`Unknown quality comparator: ${event.currentTarget.value}`);
					}
					onComparatorChange(event.currentTarget.value);
				}}
			>
				{upgradeQualityComparators.map((comparator) => (
					<option key={comparator} value={comparator}>
						{comparator}
					</option>
				))}
			</select>
		</label>
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

export function UpgradeQualityControls({
	layout,
	mode,
	onComparatorChange,
	onQualityChange,
	qualityComparator,
	qualitySelection,
}: UpgradeQualityControlsProps) {
	const sentinel = mode === 'source' ? 'any' : 'preserve';
	const sentinelLabel = mode === 'source' ? 'Any quality' : 'Set as source';
	const modeLabel = signalName({name: mode});
	const comparatorChanged = (comparator: QualityComparator) => {
		if (onComparatorChange === undefined) {
			throw new Error('Source quality controls require a comparator change handler.');
		}
		onComparatorChange(comparator);
	};

	if (layout === 'mapping') {
		return (
			<div
				className="upgrade-quality-controls upgrade-quality-controls--mapping"
				role="group"
				aria-label={`${modeLabel} quality`}
			>
				<button
					type="button"
					className="upgrade-quality-controls__sentinel"
					aria-label={sentinelLabel}
					aria-pressed={qualitySelection === sentinel}
					title={sentinelLabel}
					onClick={() => {
						onQualityChange(sentinel);
					}}
				>
					{sentinelLabel}
				</button>
				{mode === 'source' ? (
					<QualityComparatorSelect
						disabled={qualitySelection === 'any'}
						onComparatorChange={comparatorChanged}
						qualityComparator={qualityComparator}
					/>
				) : null}
				<QualityButtons onQualityChange={onQualityChange} qualitySelection={qualitySelection} />
			</div>
		);
	}

	return (
		<div
			className="upgrade-quality-controls upgrade-quality-controls--picker"
			role="group"
			aria-label={`${modeLabel} quality`}
		>
			<button
				type="button"
				aria-label={sentinelLabel}
				aria-pressed={qualitySelection === sentinel}
				onClick={() => {
					onQualityChange(sentinel);
				}}
			>
				{sentinelLabel}
			</button>
			{mode === 'source' ? (
				<QualityComparatorSelect
					disabled={qualitySelection === 'any'}
					onComparatorChange={comparatorChanged}
					qualityComparator={qualityComparator}
				/>
			) : null}
			<QualityButtons onQualityChange={onQualityChange} qualitySelection={qualitySelection} />
		</div>
	);
}
