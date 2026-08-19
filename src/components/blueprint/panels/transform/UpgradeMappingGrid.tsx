import type {SignalID, UpgradeSourceSignal} from '../../../../parsing/types';
import {AddUpgradeMappingRow} from './AddUpgradeMappingRow';
import {UpgradeMappingRow} from './UpgradeMappingRow';

export interface PositionedUpgradeMapping {
	count: number;
	from?: UpgradeSourceSignal;
	mappingId: string;
	slotIndex: number;
	to?: SignalID;
}

interface UpgradeMappingGridProps {
	mappings: readonly PositionedUpgradeMapping[];
	onChooseSource: (mappingId: string | undefined, slotIndex: number) => void;
	onChooseTarget: (mappingId: string | undefined, slotIndex: number) => void;
	onClearEndpoint: (mappingId: string, endpoint: 'from' | 'to') => void;
}

const mappingsPerRow = 4;
const minimumMappingSlots = 16;

function paddedSlotCount(mappings: readonly PositionedUpgradeMapping[]): number {
	const highestOccupiedSlot = Math.max(-1, ...mappings.map((mapping) => mapping.slotIndex));
	const occupiedSize = highestOccupiedSlot + 1;
	const nextPaddedRow = Math.ceil(occupiedSize / mappingsPerRow) * mappingsPerRow + mappingsPerRow;
	return Math.max(minimumMappingSlots, nextPaddedRow);
}

/**
 * Factorio's mapper definition is one ordered grid of fixed From/To pairs. The
 * rows supplied here are planner records, never a filtered match report.
 */
export function UpgradeMappingGrid({
	mappings,
	onChooseSource,
	onChooseTarget,
	onClearEndpoint,
}: UpgradeMappingGridProps) {
	const mappingsBySlot = new Map<number, PositionedUpgradeMapping>();
	for (const mapping of mappings) {
		if (mappingsBySlot.has(mapping.slotIndex)) {
			throw new Error(`More than one upgrade mapping occupies slot ${mapping.slotIndex.toString()}.`);
		}
		mappingsBySlot.set(mapping.slotIndex, mapping);
	}
	const slotCount = paddedSlotCount(mappings);

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
						const mapping = mappingsBySlot.get(slotIndex);
						if (mapping !== undefined) {
							return (
								<UpgradeMappingRow
									key={mapping.mappingId}
									{...mapping}
									onChooseSource={() => {
										onChooseSource(mapping.mappingId, slotIndex);
									}}
									onChooseTarget={() => {
										onChooseTarget(mapping.mappingId, slotIndex);
									}}
									onClearSource={() => {
										onClearEndpoint(mapping.mappingId, 'from');
									}}
									onClearTarget={() => {
										onClearEndpoint(mapping.mappingId, 'to');
									}}
								/>
							);
						}
						return (
							<li key={`empty-${slotIndex.toString()}`} className="upgrade-mapping-grid__empty-slot">
								<AddUpgradeMappingRow
									slotIndex={slotIndex}
									onSourceChoose={() => {
										onChooseSource(undefined, slotIndex);
									}}
									onTargetChoose={() => {
										onChooseTarget(undefined, slotIndex);
									}}
								/>
							</li>
						);
					})}
				</ol>
			</div>
		</div>
	);
}
