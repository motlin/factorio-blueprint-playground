import {useState} from 'react';

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
	onMove: (mappingId: string, targetSlotIndex: number) => void;
}

const mappingsPerRow = 4;
const minimumMappingSlots = 16;
const mappingDragDataType = 'application/x-factorio-upgrade-mapping';

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
	onMove,
}: UpgradeMappingGridProps) {
	const [draggedMappingId, setDraggedMappingId] = useState<string>();
	const [dropTargetSlotIndex, setDropTargetSlotIndex] = useState<number>();
	const mappingsBySlot = new Map<number, PositionedUpgradeMapping>();
	for (const mapping of mappings) {
		if (mappingsBySlot.has(mapping.slotIndex)) {
			throw new Error(`More than one upgrade mapping occupies slot ${mapping.slotIndex.toString()}.`);
		}
		mappingsBySlot.set(mapping.slotIndex, mapping);
	}
	const slotCount = paddedSlotCount(mappings);
	const slotIndexFromTarget = (target: EventTarget): number | undefined => {
		if (!(target instanceof Element)) {
			return undefined;
		}
		const slot = target.closest<HTMLElement>('[data-upgrade-mapping-slot]');
		if (slot === null) {
			return undefined;
		}
		const slotIndex = Number(slot.dataset.upgradeMappingSlot);
		if (!Number.isInteger(slotIndex) || slotIndex < 0 || slotIndex >= slotCount) {
			throw new Error(`Invalid upgrade mapping slot ${slot.dataset.upgradeMappingSlot ?? ''}.`);
		}
		return slotIndex;
	};
	const clearDragState = () => {
		setDraggedMappingId(undefined);
		setDropTargetSlotIndex(undefined);
	};

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
				<ol
					className="upgrade-mapping-grid__slots"
					onDragStart={(event) => {
						if (!(event.target instanceof Element)) {
							return;
						}
						const pair = event.target.closest<HTMLElement>('[data-mapping-key]');
						const mappingId = pair?.dataset.mappingKey;
						if (mappingId === undefined || !mappings.some((mapping) => mapping.mappingId === mappingId)) {
							throw new Error('Only an upgrade mapping pair can be dragged.');
						}
						event.dataTransfer.setData(mappingDragDataType, mappingId);
						event.dataTransfer.effectAllowed = 'move';
						setDraggedMappingId(mappingId);
					}}
					onDragEnter={(event) => {
						if (draggedMappingId === undefined) {
							return;
						}
						const slotIndex = slotIndexFromTarget(event.target);
						if (slotIndex !== undefined) {
							setDropTargetSlotIndex(slotIndex);
						}
					}}
					onDragOver={(event) => {
						if (draggedMappingId === undefined) {
							return;
						}
						const slotIndex = slotIndexFromTarget(event.target);
						if (slotIndex !== undefined) {
							event.preventDefault();
							event.dataTransfer.dropEffect = 'move';
						}
					}}
					onDragEnd={clearDragState}
					onDrop={(event) => {
						const slotIndex = slotIndexFromTarget(event.target);
						const mappingId = event.dataTransfer.getData(mappingDragDataType);
						clearDragState();
						if (slotIndex === undefined || mappingId === '') {
							return;
						}
						if (!mappings.some((mapping) => mapping.mappingId === mappingId)) {
							throw new Error(`Upgrade mapping ${mappingId} is unavailable.`);
						}
						event.preventDefault();
						const currentMapping = mappings.find((mapping) => mapping.mappingId === mappingId);
						if (currentMapping === undefined) {
							throw new Error(`Upgrade mapping ${mappingId} is unavailable.`);
						}
						if (currentMapping.slotIndex !== slotIndex) {
							onMove(mappingId, slotIndex);
						}
					}}
					onKeyDown={(event) => {
						if (!event.ctrlKey || event.altKey || event.metaKey || event.shiftKey) {
							return;
						}
						const offset =
							event.key === 'ArrowLeft'
								? -1
								: event.key === 'ArrowRight'
									? 1
									: event.key === 'ArrowUp'
										? -mappingsPerRow
										: event.key === 'ArrowDown'
											? mappingsPerRow
											: undefined;
						if (offset === undefined || !(event.target instanceof Element)) {
							return;
						}
						const pair = event.target.closest<HTMLElement>('[data-mapping-key]');
						const mappingId = pair?.dataset.mappingKey;
						const slotIndex = pair === null ? undefined : slotIndexFromTarget(pair);
						if (mappingId === undefined || slotIndex === undefined) {
							return;
						}
						const targetSlotIndex = slotIndex + offset;
						if (targetSlotIndex < 0 || targetSlotIndex >= slotCount) {
							return;
						}
						event.preventDefault();
						onMove(mappingId, targetSlotIndex);
					}}
				>
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
									dropTarget={dropTargetSlotIndex === slotIndex}
								/>
							);
						}
						return (
							<li
								key={`empty-${slotIndex.toString()}`}
								className="upgrade-mapping-grid__empty-slot"
								data-drop-target={dropTargetSlotIndex === slotIndex || undefined}
								data-upgrade-mapping-slot={slotIndex}
							>
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
