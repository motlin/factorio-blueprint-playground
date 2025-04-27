import {Link} from '@tanstack/react-router';

import {getSourceLabel} from '../fetching/blueprintFetcher';
import {DatabaseBlueprint} from '../storage/db';

import {FactorioIcon} from './core/icons/FactorioIcon';
import {RichText} from './core/text/RichText';
import {Version} from './core/text/Version';
import {BlueprintTableCheckbox} from './history/table/BlueprintTableCheckbox';
import {ButtonGreen} from './ui';

interface HistoryBlueprintRowProps {
	blueprint: DatabaseBlueprint;
	isSelected: boolean;
	onToggleSelection: (sha: string) => void;
	formatDate: (timestamp: number) => string;
}

export function HistoryBlueprintRow({blueprint, isSelected, onToggleSelection, formatDate}: HistoryBlueprintRowProps) {
	return (
		<div
			key={blueprint.metadata.sha}
			className={`history-blueprint-item ${isSelected ? 'selected' : ''}`}
			onClick={() => onToggleSelection(blueprint.metadata.sha)}
			data-testid="blueprint-item"
		>
			{/* Checkbox column */}
			<BlueprintTableCheckbox
				isSelected={isSelected}
				onToggle={() => onToggleSelection(blueprint.metadata.sha)}
			/>

			{/* Type column */}
			<div className="history-type-container">
				<FactorioIcon icon={{type: 'item', name: blueprint.gameData.type.replace(/_/g, '-')}} size="small" />
			</div>

			{/* Version column */}
			<div className="history-version-container">
				{blueprint.gameData.gameVersion ? (
					<Version number={Number(blueprint.gameData.gameVersion)} />
				) : (
					<span>Unknown</span>
				)}
			</div>

			{/* Icons column */}
			<div className="history-icons-container">
				{blueprint.gameData.icons.map((icon, index) => (
					<FactorioIcon key={index} icon={{type: icon.type || 'item', name: icon.name}} size="small" />
				))}
				{blueprint.gameData.icons.length === 0 && <span style={{opacity: 0.5}}>No icon</span>}
			</div>

			{/* Label column */}
			<div className="history-label-container">
				{blueprint.gameData.label ? (
					<RichText text={blueprint.gameData.label} iconSize="small" />
				) : (
					<span style={{opacity: 0.5}}>No label</span>
				)}
			</div>

			{/* Source column */}
			<div className="history-source-container">
				<span title={`Source: ${getSourceLabel(blueprint.metadata.fetchMethod)}`}>
					{getSourceLabel(blueprint.metadata.fetchMethod)}
				</span>
			</div>

			{/* Updated column (with created hover text) */}
			<div className="history-dates">
				<span
					title={`Created: ${new Date(blueprint.metadata.createdOn).toLocaleString()}
Updated: ${new Date(blueprint.metadata.lastUpdatedOn).toLocaleString()}`}
				>
					{formatDate(blueprint.metadata.lastUpdatedOn)}
				</span>
			</div>

			{/* Actions column */}
			<div>
				<Link
					to="/"
					search={{
						pasted: blueprint.metadata.data,
						selection: blueprint.metadata.selection,
						focusTextarea: true,
					}}
				>
					<ButtonGreen data-testid="blueprint-open">Open</ButtonGreen>
				</Link>
			</div>
		</div>
	);
}
