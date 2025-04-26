import React from 'react';

import type {DatabaseBlueprint} from '../../../storage/db';
import {HistoryBlueprintRow} from '../../HistoryBlueprintRow';

import {TableHeader} from './TableHeader';

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
			<TableHeader label="" />
			<TableHeader label="Type" />
			<TableHeader label="Version" />
			<TableHeader label="Icons" />
			<TableHeader label="Label" />
			<TableHeader label="Source" />
			<TableHeader label="Updated" />
			<TableHeader label="Actions" />

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
