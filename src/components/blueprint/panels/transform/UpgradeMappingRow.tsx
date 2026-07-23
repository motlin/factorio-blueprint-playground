import type {SignalID, UpgradeSourceSignal} from '../../../../parsing/types';
import type {UpgradeCandidate} from '../../../../transform/upgradePlanner';
import {FactorioIcon} from '../../../core/icons/FactorioIcon';
import {signalWithUpgradeQuality} from './upgradeQuality';
import {UpgradeQualityControls} from './UpgradeQualityControls';
import {signalName, signalTitle} from './upgradePlannerSignals';

interface SignalSlotProps {
	label: string;
	onClick?: () => void;
	onContextMenu?: () => void;
	signal?: SignalID;
}

interface UpgradeMappingRowProps {
	candidate: UpgradeCandidate;
	manual: boolean;
	onRemove: (candidate: UpgradeCandidate, manual: boolean) => void;
	onSourceChoose: (candidate: UpgradeCandidate) => void;
	onSourceQualityChange: (candidate: UpgradeCandidate, source: UpgradeSourceSignal) => void;
	onTargetChoose: (candidate: UpgradeCandidate) => void;
	onTargetQualityChange: (candidate: UpgradeCandidate, target: SignalID, preserveQuality: boolean) => void;
	sourceKey: string;
}

export function SignalSlot({label, onClick, onContextMenu, signal}: SignalSlotProps) {
	return (
		<button
			type="button"
			className={`transform-signal-slot${signal === undefined ? ' transform-signal-slot--empty' : ''}`}
			aria-label={label}
			aria-disabled={onClick === undefined}
			title={signal === undefined ? label : signalTitle(signal)}
			onClick={() => {
				onClick?.();
			}}
			onContextMenu={(event) => {
				if (onContextMenu !== undefined) {
					event.preventDefault();
					onContextMenu();
				}
			}}
		>
			{signal === undefined ? <span aria-hidden="true">+</span> : <FactorioIcon icon={signal} size="large" />}
		</button>
	);
}

export function UpgradeMappingRow({
	candidate,
	manual,
	onRemove,
	onSourceChoose,
	onSourceQualityChange,
	onTargetChoose,
	onTargetQualityChange,
	sourceKey,
}: UpgradeMappingRowProps) {
	const sourceName = signalName(candidate.from);
	const targetName = signalName(candidate.to);
	const remove = () => {
		onRemove(candidate, manual);
	};

	return (
		<li
			className="upgrade-mapping-grid__row"
			data-mapping-key={sourceKey}
			aria-label={`Mapping from ${sourceName} to ${targetName}`}
			title={`${sourceName} → ${targetName}`}
			onKeyDown={(event) => {
				if (event.key === 'Delete' || event.key === 'Backspace') {
					event.preventDefault();
					remove();
				}
			}}
		>
			<div className="upgrade-mapping-grid__endpoint">
				<SignalSlot
					label={`Choose source, currently ${sourceName}`}
					signal={candidate.from}
					onClick={() => {
						onSourceChoose(candidate);
					}}
				/>
				<UpgradeQualityControls
					layout="mapping"
					mode="source"
					qualityComparator={candidate.from.comparator ?? '='}
					qualitySelection={candidate.from.quality ?? 'any'}
					onComparatorChange={(comparator) => {
						onSourceQualityChange(
							candidate,
							signalWithUpgradeQuality(
								candidate.from,
								'source',
								candidate.from.quality ?? 'normal',
								comparator,
							),
						);
					}}
					onQualityChange={(quality) => {
						onSourceQualityChange(
							candidate,
							signalWithUpgradeQuality(
								candidate.from,
								'source',
								quality,
								candidate.from.comparator ?? '=',
							),
						);
					}}
				/>
			</div>
			<span className="upgrade-mapping-grid__arrow" aria-hidden="true">
				→
			</span>
			<div className="upgrade-mapping-grid__endpoint">
				<SignalSlot
					label={`Choose target for ${sourceName}`}
					signal={candidate.to}
					onClick={() => {
						onTargetChoose(candidate);
					}}
				/>
				<UpgradeQualityControls
					layout="mapping"
					mode="target"
					qualityComparator="="
					qualitySelection={candidate.preserveQuality ? 'preserve' : (candidate.to.quality ?? 'normal')}
					onQualityChange={(quality) => {
						onTargetQualityChange(
							candidate,
							signalWithUpgradeQuality(candidate.to, 'target', quality, '='),
							quality === 'preserve',
						);
					}}
				/>
			</div>
			<span
				className="upgrade-mapping-grid__count"
				title={`${candidate.count.toString()} ${candidate.count === 1 ? 'match' : 'matches'}`}
			>
				<strong>{candidate.count}</strong>
				<small>{candidate.count === 1 ? 'match' : 'matches'}</small>
			</span>
			<button
				type="button"
				className="upgrade-mapping-grid__remove"
				aria-label={`Remove mapping from ${sourceName}`}
				aria-keyshortcuts="Delete Backspace"
				title={`Remove mapping from ${sourceName}`}
				onClick={remove}
			>
				×
			</button>
		</li>
	);
}
