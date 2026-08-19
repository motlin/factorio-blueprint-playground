import {SignalSlot} from './UpgradeMappingRow';

interface AddUpgradeMappingRowProps {
	onSourceChoose: () => void;
	onTargetChoose: () => void;
	slotIndex: number;
}

/**
 * A hole is still a fixed From/To pair. Either endpoint can start a mapper; no
 * source is guessed and no endpoint is disabled because its partner is empty.
 */
export function AddUpgradeMappingRow({onSourceChoose, onTargetChoose, slotIndex}: AddUpgradeMappingRowProps) {
	return (
		<div
			className="upgrade-mapping-grid__pair upgrade-mapping-grid__pair--empty"
			role="group"
			aria-label={`Empty mapping slot ${(slotIndex + 1).toString()}`}
		>
			<SignalSlot label="Choose source for new mapping" onChoose={onSourceChoose} />
			<SignalSlot label="Choose target for new mapping" onChoose={onTargetChoose} />
		</div>
	);
}
