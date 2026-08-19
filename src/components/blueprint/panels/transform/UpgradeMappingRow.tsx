import type {SignalID, UpgradeSourceSignal} from '../../../../parsing/types';
import {FactorioIcon} from '../../../core/icons/FactorioIcon';
import {FactorioInventorySlot} from '../../../ui/FactorioUi';
import {signalName, signalTitle} from './upgradePlannerSignals';

interface SignalSlotProps {
	label: string;
	onChoose?: () => void;
	onClear?: () => void;
	signal?: UpgradeSourceSignal;
}

interface UpgradeMappingRowProps {
	count: number;
	from?: UpgradeSourceSignal;
	mappingId: string;
	onChooseSource: () => void;
	onChooseTarget: () => void;
	onClearSource: () => void;
	onClearTarget: () => void;
	to?: SignalID;
}

export function SignalSlot({label, onChoose, onClear, signal}: SignalSlotProps) {
	return (
		<FactorioInventorySlot
			className={`transform-signal-slot${signal === undefined ? ' transform-signal-slot--empty' : ''}${
				signal?.comparator === undefined ? '' : ' transform-signal-slot--condition'
			}`}
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
			{signal === undefined ? null : <FactorioIcon icon={signal} size="large" />}
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
	from,
	mappingId,
	onChooseSource,
	onChooseTarget,
	onClearSource,
	onClearTarget,
	to,
}: UpgradeMappingRowProps) {
	const label = mappingLabel(from, to);
	const sourceName = from === undefined ? undefined : signalName(from);
	const targetName = to === undefined ? undefined : signalName(to);

	return (
		<li
			className={`upgrade-mapping-grid__pair${
				from === undefined || to === undefined ? ' upgrade-mapping-grid__pair--incomplete' : ''
			}`}
			data-mapping-key={mappingId}
			aria-label={label}
			title={from === undefined || to === undefined ? label : `${sourceName} → ${targetName}`}
		>
			<SignalSlot
				label={
					sourceName === undefined ? 'Choose source for mapping' : `Choose source, currently ${sourceName}`
				}
				signal={from}
				onChoose={onChooseSource}
				onClear={from === undefined ? undefined : onClearSource}
			/>
			<SignalSlot
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
			<span className="transform-visually-hidden">
				{count.toString()} {count === 1 ? 'match' : 'matches'}. Focus an endpoint and press Delete to clear that
				endpoint.
			</span>
		</li>
	);
}
