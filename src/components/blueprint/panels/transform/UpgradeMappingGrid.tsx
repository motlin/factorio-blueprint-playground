import type {UpgradeCandidate, UpgradeRule} from '../../../../transform/upgradePlanner';
import {UpgradeMappingRow} from './UpgradeMappingRow';
import {signalIdentity} from './upgradePlannerSignals';

interface UpgradeMappingGridProps {
	candidates: readonly UpgradeCandidate[];
	excludedSources: ReadonlySet<string>;
	manualRules: readonly UpgradeRule[];
	onRemove: (candidate: UpgradeCandidate, manual: boolean) => void;
	onSourceChoose: (candidate: UpgradeCandidate) => void;
	onTargetChoose: (candidate: UpgradeCandidate) => void;
	showEmptyState: boolean;
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
								<UpgradeMappingRow
									key={sourceKey}
									candidate={candidate}
									manual={manualSourceKeys.has(sourceKey)}
									onRemove={onRemove}
									onSourceChoose={onSourceChoose}
									onTargetChoose={onTargetChoose}
									sourceKey={sourceKey}
								/>
							);
						})}
					</ol>
				</>
			)}
		</div>
	);
}
