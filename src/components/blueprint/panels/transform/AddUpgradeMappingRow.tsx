import type {UpgradeSourceSignal} from '../../../../parsing/types';
import {SignalSlot} from './UpgradeMappingRow';
import {signalName} from './upgradePlannerSignals';

interface AddUpgradeMappingRowProps {
	onRemove: () => void;
	onSourceChoose: () => void;
	onTargetChoose: () => void;
	source?: UpgradeSourceSignal;
}

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
