import type {UpgradeSourceSignal} from '../../../../parsing/types';
import {SignalSlot} from './UpgradeMappingRow';
import {signalName} from './upgradePlannerSignals';

interface AddUpgradeMappingRowProps {
	onRemove: () => void;
	onSourceChoose: () => void;
	onTargetChoose: () => void;
	source?: UpgradeSourceSignal;
}

/**
 * Empty/incomplete mapper contract:
 *
 * - Both fixed endpoint slots exist even when empty, and either endpoint may be
 *   chosen first. From confirmation requires a prototype; a quality condition
 *   cannot exist without that prototype. To is either empty or an exact
 *   prototype-and-quality destination.
 * - A source-only or target-only pair is valid editor state and retains its
 *   mapper index. Clearing its remaining endpoint returns that index to an empty
 *   hole; it does not compact later mappings.
 * - Confirming From closes only its picker. To remains an explicit activation,
 *   with choices immediately constrained by the confirmed From.
 *
 * The present source-only prop shape is transitional; later row work should
 * represent both optional endpoints rather than disabling To on an empty From.
 */
export function AddUpgradeMappingRow({onRemove, onSourceChoose, onTargetChoose, source}: AddUpgradeMappingRowProps) {
	const sourceName = source === undefined ? undefined : signalName(source);

	return (
		<div
			className="upgrade-mapping-grid__pair upgrade-mapping-grid__pair--empty"
			role="group"
			aria-label={sourceName === undefined ? 'Add mapping' : `Incomplete mapping from ${sourceName}`}
			onKeyDown={(event) => {
				if (source !== undefined && (event.key === 'Delete' || event.key === 'Backspace')) {
					event.preventDefault();
					onRemove();
				}
			}}
		>
			<SignalSlot
				label={
					sourceName === undefined
						? 'Choose source for new mapping'
						: `Choose source, currently ${sourceName}`
				}
				signal={source}
				onClick={onSourceChoose}
				onContextMenu={source === undefined ? undefined : onRemove}
			/>
			<SignalSlot
				label={
					sourceName === undefined
						? 'Choose a source before choosing a target'
						: `Choose target for ${sourceName}`
				}
				onClick={source === undefined ? undefined : onTargetChoose}
				onContextMenu={source === undefined ? undefined : onRemove}
			/>
		</div>
	);
}
