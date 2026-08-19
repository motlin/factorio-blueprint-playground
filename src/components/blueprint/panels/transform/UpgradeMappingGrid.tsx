import type {UpgradeSourceSignal} from '../../../../parsing/types';
import type {UpgradeCandidate, UpgradeRule} from '../../../../transform/upgradePlanner';
import {AddUpgradeMappingRow} from './AddUpgradeMappingRow';
import {UpgradeMappingRow} from './UpgradeMappingRow';
import {signalIdentity} from './upgradePlannerSignals';

export interface PositionedUpgradeCandidate extends UpgradeCandidate {
	slotIndex: number;
}

interface UpgradeMappingGridProps {
	candidates: readonly PositionedUpgradeCandidate[];
	draftSlotIndex?: number;
	draftSource?: UpgradeSourceSignal;
	excludedSources: ReadonlySet<string>;
	manualRules: readonly UpgradeRule[];
	onDraftRemove: () => void;
	onDraftSourceChoose: (slotIndex: number) => void;
	onDraftTargetChoose: () => void;
	onRemove: (candidate: PositionedUpgradeCandidate, manual: boolean) => void;
	onSourceChoose: (candidate: PositionedUpgradeCandidate) => void;
	onTargetChoose: (candidate: PositionedUpgradeCandidate) => void;
}

const mappingsPerRow = 4;
const minimumMappingSlots = 16;

/**
 * Ordered mapper-grid contract from Factorio 2.1.12 `UpgradeItemGui` and
 * `UpgradeData`:
 *
 * - The table repeats four fixed From/To pairs per visual row and shows at least
 *   four rows (16 pairs). It pads to a full row plus one spare row, up to 1,000
 *   mapper indexes; it does not collapse into a variable-width action list.
 * - A mapper index is record state. Empty indexes between populated or incomplete
 *   pairs remain holes, while empty trailing indexes may be trimmed. Serialized
 *   indexes and pasted zero-match mappings therefore survive display and save.
 * - A drag moves or swaps the complete From/To pair, including quality and
 *   module settings, with another populated or empty index. An accessible
 *   keyboard move command must call the same authoritative pair-swap operation.
 *   Rendering must never reorder by signal identity, match count, or completeness.
 *
 * `useUpgradePlannerDraft` supplies the ordered slots; this component only pads
 * and renders them. The current candidate projection is transitional and must not
 * be treated as the persistent model.
 */
function paddedSlotCount(candidates: readonly PositionedUpgradeCandidate[], draftSlotIndex?: number): number {
	const highestOccupiedSlot = Math.max(
		-1,
		draftSlotIndex ?? -1,
		...candidates.map((candidate) => candidate.slotIndex),
	);
	const occupiedSize = highestOccupiedSlot + 1;
	const nextPaddedRow = Math.ceil(occupiedSize / mappingsPerRow) * mappingsPerRow + mappingsPerRow;
	return Math.max(minimumMappingSlots, nextPaddedRow);
}

export function UpgradeMappingGrid({
	candidates,
	draftSlotIndex,
	draftSource,
	excludedSources,
	manualRules,
	onDraftRemove,
	onDraftSourceChoose,
	onDraftTargetChoose,
	onRemove,
	onSourceChoose,
	onTargetChoose,
}: UpgradeMappingGridProps) {
	const manualSourceKeys = new Set(manualRules.map((rule) => signalIdentity(rule.from)));
	const visibleCandidates = candidates.filter((candidate) => !excludedSources.has(signalIdentity(candidate.from)));
	const candidatesBySlot = new Map<number, PositionedUpgradeCandidate>();
	for (const candidate of visibleCandidates) {
		if (candidatesBySlot.has(candidate.slotIndex)) {
			throw new Error(`More than one upgrade mapping occupies slot ${candidate.slotIndex.toString()}.`);
		}
		candidatesBySlot.set(candidate.slotIndex, candidate);
	}
	const slotCount = paddedSlotCount(visibleCandidates, draftSlotIndex);

	return (
		<div className="upgrade-mapping-grid" role="group" aria-label="From and To mappings">
			<div className="upgrade-mapping-grid__table">
				<div className="upgrade-mapping-grid__headings">
					{Array.from({length: mappingsPerRow}, (_, index) => (
						<div key={index}>
							<span>From</span>
							<span>To</span>
						</div>
					))}
				</div>
				<ol className="upgrade-mapping-grid__slots">
					{Array.from({length: slotCount}, (_, slotIndex) => {
						const candidate = candidatesBySlot.get(slotIndex);
						if (candidate !== undefined) {
							const sourceKey = signalIdentity(candidate.from);
							return (
								<UpgradeMappingRow
									key={sourceKey}
									candidate={candidate}
									manual={manualSourceKeys.has(sourceKey)}
									onRemove={(_, manual) => {
										onRemove(candidate, manual);
									}}
									onSourceChoose={() => {
										onSourceChoose(candidate);
									}}
									onTargetChoose={() => {
										onTargetChoose(candidate);
									}}
									sourceKey={sourceKey}
								/>
							);
						}
						const isDraft = slotIndex === draftSlotIndex;
						return (
							<li key={`empty-${slotIndex.toString()}`} className="upgrade-mapping-grid__empty-slot">
								<AddUpgradeMappingRow
									source={isDraft ? draftSource : undefined}
									onRemove={onDraftRemove}
									onSourceChoose={() => {
										onDraftSourceChoose(slotIndex);
									}}
									onTargetChoose={onDraftTargetChoose}
								/>
							</li>
						);
					})}
				</ol>
			</div>
		</div>
	);
}
