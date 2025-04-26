import React from 'react';

import type {DatabaseBlueprint} from '../../../storage/db';
import {HistoryBlueprintRow} from '../../HistoryBlueprintRow';

interface BlueprintHistoryTableProps {
	blueprints: DatabaseBlueprint[];
	selectedItems: Set<string>;
	toggleSelection: (sha: string) => void;
	formatDate: (timestamp: number) => string;
}

export function BlueprintHistoryTable({
	blueprints,
	selectedItems,
	toggleSelection,
	formatDate,
}: BlueprintHistoryTableProps) {
	return (
		<div className="history-grid">
			<div className="history-header"></div>
			<div className="history-header">Type</div>
			<div className="history-header">Version</div>
			<div className="history-header">Icons</div>
			<div className="history-header">Label</div>
			<div className="history-header">Source</div>
			<div className="history-header">Updated</div>
			<div className="history-header">Actions</div>

			{blueprints.map((blueprint: DatabaseBlueprint) => {
				const isSelected = selectedItems.has(blueprint.metadata.sha);
				return (
					<HistoryBlueprintRow
						key={blueprint.metadata.sha}
						blueprint={blueprint}
						isSelected={isSelected}
						onToggleSelection={toggleSelection}
						formatDate={formatDate}
					/>
				);
			})}
		</div>
	);
}
