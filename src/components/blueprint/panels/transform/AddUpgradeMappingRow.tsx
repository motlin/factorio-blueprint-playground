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
			className="upgrade-mapping-grid__row upgrade-mapping-grid__row--incomplete"
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
			/>
			<span className="upgrade-mapping-grid__arrow" aria-hidden="true">
				→
			</span>
			<SignalSlot
				label={
					sourceName === undefined
						? 'Choose a source before choosing a target'
						: `Choose target for ${sourceName}`
				}
				onClick={source === undefined ? undefined : onTargetChoose}
			/>
			<span className="upgrade-mapping-grid__count upgrade-mapping-grid__count--draft">
				<strong>—</strong>
				<small>draft</small>
			</span>
			{sourceName === undefined ? (
				<span className="upgrade-mapping-grid__remove-placeholder" />
			) : (
				<button
					type="button"
					className="upgrade-mapping-grid__remove"
					aria-label={`Remove incomplete mapping from ${sourceName}`}
					aria-keyshortcuts="Delete Backspace"
					title={`Remove incomplete mapping from ${sourceName}`}
					onClick={() => {
						onRemove();
					}}
				>
					×
				</button>
			)}
		</div>
	);
}
