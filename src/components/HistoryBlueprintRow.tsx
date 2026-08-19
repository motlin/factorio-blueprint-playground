import {Link} from '@tanstack/react-router';

import {getSourceLabel} from '../fetching/blueprintFetcher';
import type {SignalType} from '../parsing/types';
import type {ImportHistoryRecord} from '../storage/db';
import {BLUEPRINT_RECORD_TYPE_LABELS} from './library/blueprintRecordModel';

const SIGNAL_TYPES = new Set<string>([
	'item',
	'fluid',
	'virtual',
	'entity',
	'technology',
	'recipe',
	'item-group',
	'tile',
	'virtual-signal',
	'achievement',
	'equipment',
	'planet',
	'quality',
	'utility',
	'space-location',
]);

function toSignalType(type: string | undefined): SignalType | undefined {
	if (type != null && SIGNAL_TYPES.has(type)) {
		// oxlint-disable-next-line typescript/no-unsafe-type-assertion -- membership checked against SIGNAL_TYPES set above
		return type as SignalType;
	}
	return undefined;
}

import {FactorioIcon} from './core/icons/FactorioIcon';
import {RichText} from './core/text/RichText';
import {Version} from './core/text/Version';
import {BlueprintTableCheckbox} from './history/table/BlueprintTableCheckbox';
import {formatDate} from './history/utils/dateUtils';
import {ButtonGreen} from './ui/ButtonGreen';

interface HistoryBlueprintRowProps {
	blueprint: ImportHistoryRecord;
	isSelected: boolean;
	onToggleSelection: (id: string) => void;
}

/**
 * One row is one chronological import event. Type, label, description, and icons
 * preview the imported bytes; source, selection, and timestamps describe how the
 * browser obtained and reopened them. Saving to the Blueprint Library is a
 * separate explicit operation.
 */
export function HistoryBlueprintRow({blueprint, isSelected, onToggleSelection}: HistoryBlueprintRowProps) {
	const label = blueprint.gameData.label?.trim();
	const typeLabel = BLUEPRINT_RECORD_TYPE_LABELS[blueprint.gameData.type];
	const rowName = label === undefined || label === '' ? `Untitled ${typeLabel.toLowerCase()}` : label;

	return (
		<div
			key={blueprint.id}
			className={`history-blueprint-item ${isSelected ? 'selected' : ''}`}
			onClick={() => {
				onToggleSelection(blueprint.id);
			}}
			data-testid="blueprint-item"
		>
			{/* Checkbox column owns the row's accessible selection control */}
			<BlueprintTableCheckbox
				isSelected={isSelected}
				label={`Select ${rowName}`}
				onToggle={() => {
					onToggleSelection(blueprint.id);
				}}
			/>

			{/* Type column */}
			<div className="history-type-container">
				<FactorioIcon
					decorative
					icon={{type: 'item', name: blueprint.gameData.type.replace(/_/g, '-')}}
					size="small"
				/>
				<span>{typeLabel}</span>
			</div>

			{/* Version column */}
			<div className="history-version-container">
				{blueprint.gameData.gameVersion != null && blueprint.gameData.gameVersion !== '' ? (
					<Version number={Number(blueprint.gameData.gameVersion)} />
				) : (
					<span>Unknown</span>
				)}
			</div>

			{/* Icons column */}
			<div className="history-icons-container">
				{blueprint.gameData.icons.map((icon) => (
					<FactorioIcon
						key={`${icon.type ?? 'item'}-${icon.name}`}
						icon={{type: toSignalType(icon.type), name: icon.name}}
						size="small"
					/>
				))}
				{blueprint.gameData.icons.length === 0 && <span style={{opacity: 0.5}}>No icon</span>}
			</div>

			{/* Label column */}
			<div className="history-label-container">
				{blueprint.gameData.label != null && blueprint.gameData.label !== '' ? (
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
					data-testid="blueprint-open"
					search={{
						pasted: blueprint.metadata.data,
						selection: blueprint.metadata.selection,
						focusTextarea: true,
					}}
				>
					<ButtonGreen onClick={() => undefined}>Open</ButtonGreen>
				</Link>
			</div>
		</div>
	);
}
