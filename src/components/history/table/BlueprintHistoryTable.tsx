import type {ImportHistoryRecord} from '../../../storage/db';
import {HistoryBlueprintRow} from '../../HistoryBlueprintRow';

import {TableHeader} from './TableHeader';

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
	return (
		<div className="history-grid">
			<TableHeader label="" />
			<TableHeader label="Type" />
			<TableHeader label="Version" />
			<TableHeader label="Icons" />
			<TableHeader label="Label" />
			<TableHeader label="Source" />
			<TableHeader label="Updated" />
			<TableHeader label="Actions" />

			{blueprints.map((blueprint) => {
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
