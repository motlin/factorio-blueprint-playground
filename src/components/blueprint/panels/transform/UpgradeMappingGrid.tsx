import type {SignalID} from '../../../../parsing/types';
import type {UpgradeCandidate, UpgradeRule} from '../../../../transform/upgradePlanner';
import {FactorioIcon} from '../../../core/icons/FactorioIcon';
import {signalIdentity, signalName, signalTitle} from './upgradePlannerSignals';

interface SignalSlotProps {
	label: string;
	onClick?: () => void;
	onContextMenu?: () => void;
	signal?: SignalID;
}

interface UpgradeMappingGridProps {
	candidates: readonly UpgradeCandidate[];
	excludedSources: ReadonlySet<string>;
	manualRules: readonly UpgradeRule[];
	onRemove: (candidate: UpgradeCandidate, manual: boolean) => void;
	onSourceChoose: (candidate: UpgradeCandidate) => void;
	onTargetChoose: (candidate: UpgradeCandidate) => void;
	showEmptyState: boolean;
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

export function UpgradeMappingGrid({
	candidates,
	excludedSources,
	manualRules,
	onRemove,
	onSourceChoose,
	onTargetChoose,
	showEmptyState,
}: UpgradeMappingGridProps) {
	const manualSourceKeys = new Set(manualRules.map((rule) => signalIdentity(rule.from)));
	const visibleCandidates = candidates.filter((candidate) => !excludedSources.has(signalIdentity(candidate.from)));

	return (
		<div className="upgrade-mapping-grid" role="group" aria-label="From and To mappings">
			{visibleCandidates.length === 0 && showEmptyState ? (
				<p className="upgrade-mapping-grid__empty">No matching entities or modules in this scope.</p>
			) : (
				<>
					<div className="upgrade-mapping-grid__headings" aria-hidden="true">
						<span>From</span>
						<span />
						<span>To</span>
						<span>Matches</span>
						<span />
					</div>
					<ol className="upgrade-mapping-grid__rows">
						{visibleCandidates.map((candidate) => {
							const sourceKey = signalIdentity(candidate.from);
							return (
								<li key={sourceKey} className="upgrade-mapping-grid__row" data-mapping-key={sourceKey}>
									<SignalSlot
										label={`Choose source, currently ${signalName(candidate.from)}`}
										signal={candidate.from}
										onClick={() => {
											onSourceChoose(candidate);
										}}
									/>
									<span className="upgrade-mapping-grid__arrow" aria-hidden="true">
										→
									</span>
									<SignalSlot
										label={`Choose target for ${signalName(candidate.from)}`}
										signal={candidate.to}
										onClick={() => {
											onTargetChoose(candidate);
										}}
									/>
									<span
										className="upgrade-mapping-grid__count"
										title={`${candidate.count.toString()} ${
											candidate.count === 1 ? 'match' : 'matches'
										}`}
									>
										<strong>{candidate.count}</strong>
										<small>{candidate.count === 1 ? 'match' : 'matches'}</small>
									</span>
									<button
										type="button"
										className="upgrade-mapping-grid__remove"
										aria-label={`Remove mapping from ${signalName(candidate.from)}`}
										onClick={() => {
											onRemove(candidate, manualSourceKeys.has(sourceKey));
										}}
									>
										×
									</button>
								</li>
							);
						})}
					</ol>
				</>
			)}
		</div>
	);
}
