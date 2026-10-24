import {ClipboardPaste, FilePlus2} from 'lucide-react';

import type {SignalID, UpgradePlanner} from '../../../../parsing/types';
import type {LibraryRecord} from '../../../../storage/db';
import {FactorioIcon} from '../../../core/icons/FactorioIcon';

export interface UpgradePlannerChoice {
	label: string;
	libraryRecord?: LibraryRecord;
	planner?: UpgradePlanner;
	source: string;
}

interface UpgradePlannerSelectorItemProps {
	active: boolean;
	buttonRef: (button: HTMLButtonElement | null) => void;
	choice: UpgradePlannerChoice;
	choiceCount: number;
	index: number;
	instructionsId: string;
	onChoose: () => void;
	onFocus: () => void;
	onMoveFocus: (index: number) => void;
	selected: boolean;
}

enum UpgradePlannerSelectorChoiceKind {
	Default = 'default',
	Empty = 'empty',
	Paste = 'paste',
	Saved = 'saved',
}

function choiceKind(choice: UpgradePlannerChoice): UpgradePlannerSelectorChoiceKind {
	if (choice.source === 'suggested') {
		return UpgradePlannerSelectorChoiceKind.Default;
	}
	if (choice.source === 'custom') {
		return UpgradePlannerSelectorChoiceKind.Empty;
	}
	if (choice.source === 'pasted') {
		return UpgradePlannerSelectorChoiceKind.Paste;
	}
	return UpgradePlannerSelectorChoiceKind.Saved;
}

function plannerPreviewIcons(choice: UpgradePlannerChoice): SignalID[] {
	const libraryIcons = choice.libraryRecord?.gameData.icons ?? [];
	if (libraryIcons.length > 0) {
		return libraryIcons.slice(0, 4);
	}
	return [...(choice.planner?.settings.icons ?? [])]
		.sort((left, right) => left.index - right.index)
		.slice(0, 4)
		.map((icon) => icon.signal);
}

function PlannerRecordIcon({choice}: {choice: UpgradePlannerChoice}) {
	const previewIcons = plannerPreviewIcons(choice);
	return (
		<span
			className="blueprint-record-item__icons upgrade-planner-selector__record-icon"
			aria-hidden="true"
			data-factorio-source="PreviewIcons::drawWithItemIcon"
			data-factorio-style="blueprint_record_selection_button"
			data-preview-icon-count={previewIcons.length}
		>
			<span className="blueprint-record-item__icon-composition">
				<span className="blueprint-record-item__type-icon">
					<FactorioIcon decorative icon={{type: 'item', name: 'upgrade-planner'}} size="large" />
				</span>
				<span className="blueprint-record-item__preview-icons">
					{previewIcons.map((icon, previewIconIndex) => (
						<span
							key={`${icon.type ?? 'item'}:${icon.name}:${icon.quality ?? 'normal'}:${previewIconIndex.toString()}`}
							className="blueprint-record-item__preview-icon"
							data-preview-icon-index={previewIconIndex}
						>
							<FactorioIcon decorative icon={icon} size="large" />
						</span>
					))}
				</span>
			</span>
		</span>
	);
}

function WebsiteExtensionIcon({kind}: {kind: UpgradePlannerSelectorChoiceKind}) {
	const Icon = kind === UpgradePlannerSelectorChoiceKind.Empty ? FilePlus2 : ClipboardPaste;
	return (
		<span
			className="blueprint-record-item__icons upgrade-planner-selector__record-icon upgrade-planner-selector__record-icon--website"
			aria-hidden="true"
			data-factorio-style="blueprint_record_selection_button"
		>
			<Icon className="upgrade-planner-selector__website-icon" data-website-action={kind} />
			<span className="upgrade-planner-selector__website-label">Website extension</span>
		</span>
	);
}

/**
 * The editor's Load selector is a browser-only source chooser. Its tiles copy a
 * planner into the editable draft and retain Empty/Paste choices. The global
 * apply-only selector uses `BlueprintRecordViews` instead, so its library records
 * share search, List/Grid/Slots presentation, and directional activation.
 *
 * Evidence: SelectUpgradePlannerGui and BE-3 at Factorio 2.1.12.
 */
export function UpgradePlannerSelectorItem({
	active,
	buttonRef,
	choice,
	choiceCount,
	index,
	instructionsId,
	onChoose,
	onFocus,
	onMoveFocus,
	selected,
}: UpgradePlannerSelectorItemProps) {
	const kind = choiceKind(choice);
	const websiteExtension =
		kind === UpgradePlannerSelectorChoiceKind.Empty
			? 'empty-upgrade-planner'
			: kind === UpgradePlannerSelectorChoiceKind.Paste
				? 'paste-upgrade-planner'
				: undefined;
	return (
		<button
			ref={buttonRef}
			type="button"
			className={`blueprint-record-item blueprint-record-item--grid upgrade-planner-selector__tile upgrade-planner-selector__tile--${kind}`}
			aria-label={choice.label}
			aria-describedby={instructionsId}
			aria-pressed={selected}
			data-choice-kind={kind}
			data-factorio-source={websiteExtension === undefined ? 'BlueprintsList::addItem' : undefined}
			data-website-extension={websiteExtension}
			tabIndex={active ? 0 : -1}
			title={choice.label}
			onClick={onChoose}
			onFocus={onFocus}
			onKeyDown={(event) => {
				if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
					event.preventDefault();
					onMoveFocus(index + 1);
				} else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
					event.preventDefault();
					onMoveFocus(index - 1);
				} else if (event.key === 'Home') {
					event.preventDefault();
					onMoveFocus(0);
				} else if (event.key === 'End') {
					event.preventDefault();
					onMoveFocus(choiceCount - 1);
				}
			}}
		>
			{websiteExtension === undefined ? (
				<PlannerRecordIcon choice={choice} />
			) : (
				<WebsiteExtensionIcon kind={kind} />
			)}
			<span className="blueprint-record-item__text upgrade-planner-selector__label">
				<strong>{choice.label}</strong>
			</span>
		</button>
	);
}
