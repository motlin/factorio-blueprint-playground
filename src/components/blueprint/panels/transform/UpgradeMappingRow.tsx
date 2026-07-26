import type {UpgradeSourceSignal} from '../../../../parsing/types';
import type {UpgradeCandidate} from '../../../../transform/upgradePlanner';
import {FactorioIcon} from '../../../core/icons/FactorioIcon';
import {signalName, signalTitle} from './upgradePlannerSignals';

interface SignalSlotProps {
	label: string;
	onClick?: () => void;
	onContextMenu?: () => void;
	signal?: UpgradeSourceSignal;
}

interface UpgradeMappingRowProps {
	candidate: UpgradeCandidate;
	manual: boolean;
	onRemove: (candidate: UpgradeCandidate, manual: boolean) => void;
	onSourceChoose: (candidate: UpgradeCandidate) => void;
	onTargetChoose: (candidate: UpgradeCandidate) => void;
	sourceKey: string;
}

/**
 * Shared planner endpoint presentation for the canonical picker contract.
 * Source and target slots invoke `SignalPickerDialog`; they render its confirmed
 * signal/quality condition and never own a separate quality selector.
 */
export function SignalSlot({label, onClick, onContextMenu, signal}: SignalSlotProps) {
	return (
		<button
			type="button"
			className={`transform-signal-slot${signal === undefined ? ' transform-signal-slot--empty' : ''}${
				signal?.comparator === undefined ? '' : ' transform-signal-slot--condition'
			}`}
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
			{signal === undefined ? null : <FactorioIcon icon={signal} size="large" />}
			{signal?.comparator === undefined ? null : (
				<span className="transform-signal-slot__comparator" aria-hidden="true">
					{signal.comparator}
				</span>
			)}
		</button>
	);
}

export function UpgradeMappingRow({
	candidate,
	manual,
	onRemove,
	onSourceChoose,
	onTargetChoose,
	sourceKey,
}: UpgradeMappingRowProps) {
	const sourceName = signalName(candidate.from);
	const targetName = signalName(candidate.to);
	const remove = () => {
		onRemove(candidate, manual);
	};

	return (
		<li
			className="upgrade-mapping-grid__pair"
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
			<SignalSlot
				label={`Choose source, currently ${sourceName}`}
				signal={candidate.from}
				onClick={() => {
					onSourceChoose(candidate);
				}}
				onContextMenu={remove}
			/>
			<SignalSlot
				label={`Choose target for ${sourceName}`}
				signal={candidate.to}
				onClick={() => {
					onTargetChoose(candidate);
				}}
				onContextMenu={remove}
			/>
			<span className="transform-visually-hidden">
				{candidate.count.toString()} {candidate.count === 1 ? 'match' : 'matches'}. Right-click or press Delete
				to clear.
			</span>
		</li>
	);
}
