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

function isUpgradeQualitySelection(value: string): value is UpgradeQualitySelection {
	return value === 'any' || value === 'preserve' || upgradeQualities.some((quality) => quality === value);
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
	);
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
				<select
					aria-label={`${modeLabel} quality selection`}
					value={qualitySelection}
					onChange={(event) => {
						if (!isUpgradeQualitySelection(event.currentTarget.value)) {
							throw new Error(`Unknown quality selection: ${event.currentTarget.value}`);
						}
						onQualityChange(event.currentTarget.value);
					}}
				>
					<option value={sentinel}>{sentinelLabel}</option>
					{upgradeQualities.map((quality) => (
						<option key={quality} value={quality}>
							{signalName({name: quality})}
						</option>
					))}
				</select>
				{mode === 'source' ? (
					<QualityComparatorSelect
						disabled={qualitySelection === 'any'}
						onComparatorChange={comparatorChanged}
						qualityComparator={qualityComparator}
					/>
				) : null}
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
			{upgradeQualities.map((quality) => (
				<button
					type="button"
					key={quality}
					aria-label={`${signalName({name: quality})} quality`}
					aria-pressed={qualitySelection === quality}
					title={`${signalName({name: quality})} quality`}
					onClick={() => {
						onQualityChange(quality);
					}}
				>
					<FactorioIcon icon={{type: 'quality', name: quality}} size="small" />
				</button>
			))}
		</div>
	);
}
