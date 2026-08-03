import {useId} from 'react';

import type {SignalID, UpgradeSourceSignal} from '../../../../parsing/types';
import {FactorioIcon} from '../../../core/icons/FactorioIcon';
import {FactorioInventorySlot} from '../../../ui/FactorioUi';
import {signalName, signalTitle} from './upgradePlannerSignals';

interface SignalSlotProps {
	descriptionId?: string;
	label: string;
	onChoose?: () => void;
	onClear?: () => void;
	signal?: UpgradeSourceSignal;
}

interface UpgradeMappingRowProps {
	count: number;
	dragging?: boolean;
	dropTarget?: boolean;
	from?: UpgradeSourceSignal;
	mappingId: string;
	onChooseSource: () => void;
	onChooseTarget: () => void;
	onClearSource: () => void;
	onClearTarget: () => void;
	slotIndex: number;
	to?: SignalID;
}

export function SignalSlot({descriptionId, label, onChoose, onClear, signal}: SignalSlotProps) {
	return (
		<FactorioInventorySlot
			className={`transform-signal-slot${signal === undefined ? ' transform-signal-slot--empty' : ''}${
				signal?.comparator === undefined ? '' : ' transform-signal-slot--condition'
			}`}
			aria-describedby={descriptionId}
			aria-keyshortcuts={
				descriptionId === undefined
					? undefined
					: 'Control+ArrowLeft Control+ArrowRight Control+ArrowUp Control+ArrowDown Delete Backspace'
			}
			aria-label={label}
			disabled={onChoose === undefined}
			title={signal === undefined ? label : signalTitle(signal)}
			onClick={() => {
				onChoose?.();
			}}
			onContextMenu={(event) => {
				if (onClear !== undefined) {
					event.preventDefault();
					onClear();
				}
			}}
			onKeyDown={(event) => {
				if (onClear !== undefined && (event.key === 'Delete' || event.key === 'Backspace')) {
					event.preventDefault();
					event.stopPropagation();
					onClear();
				}
			}}
		>
			{signal === undefined ? null : <FactorioIcon decorative icon={signal} size="large" />}
			{signal?.comparator === undefined ? null : (
				<span className="transform-signal-slot__comparator" aria-hidden="true">
					{signal.comparator}
				</span>
			)}
		</FactorioInventorySlot>
	);
}

function mappingLabel(from: UpgradeSourceSignal | undefined, to: SignalID | undefined): string {
	if (from !== undefined && to !== undefined) {
		return `Mapping from ${signalName(from)} to ${signalName(to)}`;
	}
	if (from !== undefined) {
		return `Incomplete mapping from ${signalName(from)}`;
	}
	if (to !== undefined) {
		return `Incomplete mapping to ${signalName(to)}`;
	}
	throw new Error('An upgrade mapping row must contain at least one endpoint.');
}

/**
 * One mapper record occupies a fixed From/To pair. Its two inventory slots stay
 * independently editable, and clearing either endpoint preserves the other.
 */
export function UpgradeMappingRow({
	count,
	dragging = false,
	dropTarget = false,
	from,
	mappingId,
	onChooseSource,
	onChooseTarget,
	onClearSource,
	onClearTarget,
	slotIndex,
	to,
}: UpgradeMappingRowProps) {
	const instructionsId = useId();
	const incomplete = from === undefined || to === undefined;
	const label = mappingLabel(from, to);
	const sourceName = from === undefined ? undefined : signalName(from);
	const targetName = to === undefined ? undefined : signalName(to);

	return (
		<li
			className={`upgrade-mapping-grid__pair upgrade-mapping-grid__pair--${incomplete ? 'incomplete' : 'complete'}`}
			aria-describedby={instructionsId}
			data-mapping-key={mappingId}
			data-mapping-state={incomplete ? 'incomplete' : 'complete'}
			data-dragging={dragging || undefined}
			data-drop-target={dropTarget || undefined}
			data-factorio-source="UpgradeItemGui::addEmptyMapper"
			data-upgrade-mapping-slot={slotIndex}
			draggable
			aria-label={label}
			title={incomplete ? label : `${sourceName} → ${targetName}`}
		>
			<SignalSlot
				descriptionId={instructionsId}
				label={
					sourceName === undefined ? 'Choose source for mapping' : `Choose source, currently ${sourceName}`
				}
				signal={from}
				onChoose={onChooseSource}
				onClear={from === undefined ? undefined : onClearSource}
			/>
			<SignalSlot
				descriptionId={instructionsId}
				label={
					targetName === undefined
						? sourceName === undefined
							? 'Choose target for mapping'
							: `Choose target for ${sourceName}`
						: sourceName === undefined
							? `Choose target, currently ${targetName}`
							: `Choose target for ${sourceName}`
				}
				signal={to}
				onChoose={onChooseTarget}
				onClear={to === undefined ? undefined : onClearTarget}
			/>
			<span id={instructionsId} className="transform-visually-hidden">
				{count.toString()} {count === 1 ? 'match' : 'matches'}. Drag this From and To pair to move it, or focus
				either endpoint and press Control plus an arrow key. Press Delete to clear the focused endpoint.
			</span>
		</li>
	);
}
