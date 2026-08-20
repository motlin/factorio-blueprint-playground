import {useState} from 'react';

import type {ImportHistoryRecord} from '../../../storage/db';
import {HistoryBlueprintRow} from '../../HistoryBlueprintRow';

import type {SortDirection} from './SortIndicator';
import {TableHeader} from './TableHeader';

type SortColumn = 'label' | 'source' | 'type' | 'updated' | 'version';

/**
 * `gameVersion` holds Factorio's 64-bit packed version as decimal text, so
 * comparing it as a string orders 0.x releases after 2.x ones on digit count
 * alone.
 */
function packedGameVersion(gameVersion: string | undefined): number {
	const packed = Number(gameVersion ?? '');
	return Number.isFinite(packed) ? packed : 0;
}

const sortKeys: Record<SortColumn, (record: ImportHistoryRecord) => number | string> = {
	label: (record) => record.gameData.label ?? '',
	source: (record) => record.metadata.fetchMethod ?? '',
	type: (record) => record.gameData.type,
	updated: (record) => record.metadata.lastUpdatedOn,
	version: (record) => packedGameVersion(record.gameData.gameVersion),
};

function sortedBlueprints(
	blueprints: readonly ImportHistoryRecord[],
	column: SortColumn | undefined,
	direction: SortDirection,
): ImportHistoryRecord[] {
	if (column === undefined || direction === null) {
		return [...blueprints];
	}
	const key = sortKeys[column];
	const factor = direction === 'asc' ? 1 : -1;
	return [...blueprints].sort((left, right) => {
		const leftKey = key(left);
		const rightKey = key(right);
		if (leftKey < rightKey) {
			return -factor;
		}
		if (leftKey > rightKey) {
			return factor;
		}
		return 0;
	});
}

interface BlueprintHistoryTableProps {
	blueprints: ImportHistoryRecord[];
	selectedItems: Set<string>;
	toggleSelection: (id: string) => void;
}

/**
 * Factorio's shared `BlueprintsList` has three presentations of the same ordered
 * records:
 *
 * - List: one record per row with its icon, human label, and full description.
 * - Grid: large record slots with short labels.
 * - Slots: compact inventory-style slots without adjacent label text.
 *
 * View mode is player preference shared by the library and Upgrade Planner
 * selector; it never changes record identity, ordering, search, or activation.
 * This table currently supplies only a browser-specific list presentation.
 */
export function BlueprintHistoryTable({blueprints, selectedItems, toggleSelection}: BlueprintHistoryTableProps) {
	const [sortColumn, setSortColumn] = useState<SortColumn>();
	const [sortDirection, setSortDirection] = useState<SortDirection>(null);
	const toggleSort = (column: SortColumn) => {
		if (sortColumn !== column) {
			setSortColumn(column);
			setSortDirection('asc');
			return;
		}
		setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
	};
	const sortableHeader = (column: SortColumn, label: string) => (
		<TableHeader
			label={label}
			sortDirection={sortColumn === column ? sortDirection : null}
			onSort={() => {
				toggleSort(column);
			}}
		/>
	);
	return (
		<div className="history-grid">
			<TableHeader label="" />
			{sortableHeader('type', 'Type')}
			{sortableHeader('version', 'Version')}
			<TableHeader label="Icons" />
			{sortableHeader('label', 'Label')}
			{sortableHeader('source', 'Source')}
			{sortableHeader('updated', 'Updated')}
			<TableHeader label="Actions" />

			{sortedBlueprints(blueprints, sortColumn, sortDirection).map((blueprint) => {
				const isSelected = selectedItems.has(blueprint.id);
				return (
					<HistoryBlueprintRow
						key={blueprint.id}
						blueprint={blueprint}
						isSelected={isSelected}
						onToggleSelection={toggleSelection}
					/>
				);
			})}
		</div>
	);
}
