import type {SignalID} from '../../../../parsing/types';
import {FactorioIcon} from '../../../core/icons/FactorioIcon';
import {FactorioInventorySlot} from '../../../ui/FactorioUi';

interface BlueprintLabelIconsProps {
	icons: readonly (SignalID | undefined)[];
	itemName: 'blueprint' | 'blueprint-book' | 'upgrade-planner';
	labelPrefix?: string;
	onChange: (icons: Array<SignalID | undefined>) => void;
	onChoose: (index: number) => void;
	signalTitle: (signal: SignalID) => string;
}

const labelIconIndexes = [0, 1, 2, 3] as const;

/**
 * Local blueprint icon slots are invokers of the canonical
 * `SignalPickerDialog`. They retain no independent quality-control state; the
 * confirmed SignalID, including its quality badge, replaces one local slot.
 */
export function BlueprintLabelIcons({
	icons,
	itemName,
	labelPrefix = 'icon',
	onChange,
	onChoose,
	signalTitle,
}: BlueprintLabelIconsProps) {
	const slots = labelIconIndexes.map((index) => icons.at(index));
	const previewIcons = slots.filter((icon): icon is SignalID => icon !== undefined);
	const recordType = itemName.replace('-', '_');
	const recordLabel =
		itemName === 'blueprint-book'
			? 'Blueprint book'
			: itemName === 'upgrade-planner'
				? 'Upgrade planner'
				: 'Blueprint';

	const clearIcon = (index: number) => {
		const nextIcons = [...slots];
		nextIcons[index] = undefined;
		onChange(nextIcons);
	};

	return (
		<div className="blueprint-label-icons" data-factorio-source="BlueprintSettingsGui::makePreviewIconFrame">
			<span
				className="blueprint-label-icons__preview blueprint-record-item__icons"
				aria-label={`${recordLabel} icon preview`}
				data-factorio-source="PreviewIcons::drawWithItemIcon"
				data-factorio-style="blueprint_icon_preview"
				data-preview-icon-count={previewIcons.length}
				data-record-type={recordType}
				role="img"
			>
				<span className="blueprint-record-item__icon-composition">
					<span className="blueprint-record-item__type-icon">
						<FactorioIcon decorative icon={{type: 'item', name: itemName}} size="large" />
					</span>
					<span className="blueprint-record-item__preview-icons">
						{previewIcons.map((icon, index) => (
							<span
								key={`${icon.type ?? 'item'}:${icon.name}:${icon.quality ?? 'normal'}:${index.toString()}`}
								className="blueprint-record-item__preview-icon"
								data-preview-icon-index={index}
							>
								<FactorioIcon decorative icon={icon} size="large" />
							</span>
						))}
					</span>
				</span>
			</span>
			<div
				className="blueprint-label-icons__slots"
				aria-label={`${recordLabel} preview icon slots`}
				data-factorio-source="BlueprintSettingsGui::makePreviewTable"
				data-factorio-style="slot_table"
				role="group"
			>
				{slots.map((icon, index) => {
					const label = `${icon === undefined ? 'Choose' : 'Edit'} ${labelPrefix} ${(index + 1).toString()}`;
					return (
						<FactorioInventorySlot
							key={index}
							className={`blueprint-label-icons__slot transform-signal-slot${
								icon === undefined ? ' transform-signal-slot--empty' : ''
							}`}
							aria-label={label}
							aria-keyshortcuts={icon === undefined ? undefined : 'Delete Backspace'}
							data-icon-slot-index={index + 1}
							title={icon === undefined ? label : signalTitle(icon)}
							onClick={() => {
								onChoose(index);
							}}
							onContextMenu={(event) => {
								if (icon === undefined) {
									return;
								}
								event.preventDefault();
								clearIcon(index);
							}}
							onKeyDown={(event) => {
								if (icon === undefined || (event.key !== 'Delete' && event.key !== 'Backspace')) {
									return;
								}
								event.preventDefault();
								clearIcon(index);
							}}
						>
							{icon === undefined ? (
								<span aria-hidden="true">+</span>
							) : (
								<FactorioIcon decorative icon={icon} size="large" />
							)}
						</FactorioInventorySlot>
					);
				})}
			</div>
		</div>
	);
}
