import {Copy, ExternalLink} from 'lucide-react';
import {useId, useState} from 'react';

import type {BlueprintString, SignalID, UpgradeSourceSignal} from '../../../../parsing/types';
import type {UpgradeDirection} from '../../../../transform/upgradePlanner';
import {FactorioIcon} from '../../../core/icons/FactorioIcon';
import {FactorioButton, FactorioButtonKind} from '../../../ui/FactorioUi';
import {BookWideReplacements, type BookWideReplacementsProps} from './BookWideReplacements';
import {BlueprintDescriptionEditor} from './BlueprintDescriptionEditor';
import {BlueprintLabelIcons} from './BlueprintLabelIcons';
import {BlueprintTitleEditor} from './BlueprintTitleEditor';
import {SignalPickerDialog} from './SignalPickerDialog';
import {UpgradeMappingGrid, type PositionedUpgradeMapping} from './UpgradeMappingGrid';
import {
	chatIconPickerOptions,
	isUpgradeTargetSelectionAllowed,
	signalIdentity,
	signalPrototypeIdentity,
	signalTitle,
	upgradeTargetOptions,
} from './upgradePlannerSignals';
import {UpgradePlannerSelectorDialog, type UpgradePlannerChoice} from './UpgradePlannerSelectorDialog';
import {useDialogFocus} from './useDialogFocus';

/**
 * Factorio 2.1.12 Upgrade Planner editor source contract:
 *
 * Record editing
 *
 * - An upgrade item or library record owns one ordered mapper set. Every mapper
 *   is one fixed From/To slot pair; upgrade, downgrade, quality, modules, and
 *   fuels are not separate action lists or separate planner sections.
 * - Opening a planner edits a draft of that record's label data and mapper
 *   definition. Picker confirmations, endpoint clearing, and pair reordering
 *   update that draft; they do not transform a blueprint.
 * - `UpgradeMappingGrid` owns ordered placement, `UpgradeMappingRow` owns a
 *   populated pair, `AddUpgradeMappingRow` owns empty or incomplete pairs,
 *   `upgradePlannerSignals` owns endpoint eligibility and compatibility, and
 *   `useUpgradePlannerDraft` is the sole authoritative draft and commit boundary.
 *   This dialog only composes those parts and opens their pickers.
 *
 * Blueprint application
 *
 * - Applying the displayed draft is a separate explicit operation. Upgrade
 *   reads the same records From to To; downgrade reads them in reverse.
 *   Direction never changes the editor shape or creates another mapper set.
 * - A mapper remains part of the planner when the current blueprint has no
 *   matches. Counts may describe a proposed application, but must not add,
 *   remove, reorder, or otherwise become the source of editor rows.
 * - Saving a planner definition to the Blueprint Library and applying it to a
 *   selected blueprint/root are distinct commands. Apply reads the draft already
 *   visible here and never opens another planner selector. Saving alone does not
 *   transform or close the current blueprint.
 *
 * Evidence: UpgradeItemGui, UpgradeFilterSelectListGui,
 * UpgradeDestinationSelectListGui, UpgradeRecord, UpgradeItem, UpgradeData, and
 * its mapper value types at Factorio 2.1.12; UP-1 and the July 23 planner-grid,
 * source-filter, quality-condition, and restricted-target captures.
 */
interface UpgradePlannerMappings {
	error: string | undefined;
	mappings: PositionedUpgradeMapping[];
	onClearEndpoint: (mappingId: string, endpoint: 'from' | 'to') => void;
	onMove: (mappingId: string, targetSlotIndex: number) => void;
	onPlannerLoad: (choice: UpgradePlannerChoice) => void;
	onPlannerInputChange: (value: string) => void;
	onSourceChange: (mappingId: string | undefined, slotIndex: number, source: UpgradeSourceSignal) => void;
	onTargetChange: (mappingId: string | undefined, slotIndex: number, target: SignalID) => void;
	plannerInput: string;
	plannerInputError: string | undefined;
	rootBlueprint: BlueprintString;
	source: string;
	sourceLabel: string;
	sourceOptions: SignalID[];
}

interface UpgradePlannerLoaderProps {
	error: string | undefined;
	onPlannerLoad: (choice: UpgradePlannerChoice) => void;
	onPlannerInputChange: (value: string) => void;
	plannerInput: string;
	plannerInputError: string | undefined;
	rootBlueprint: BlueprintString;
	source: string;
	sourceLabel: string;
}

interface UpgradeMappingsEditorProps {
	mappings: PositionedUpgradeMapping[];
	onClearEndpoint: (mappingId: string, endpoint: 'from' | 'to') => void;
	onMove: (mappingId: string, targetSlotIndex: number) => void;
	onSourceChange: (mappingId: string | undefined, slotIndex: number, source: UpgradeSourceSignal) => void;
	onTargetChange: (mappingId: string | undefined, slotIndex: number, target: SignalID) => void;
	sourceOptions: SignalID[];
}

interface UpgradePlannerDialogProps {
	breadcrumb: string;
	canChooseRootScope: boolean;
	mappings: UpgradePlannerMappings;
	matchCount: number;
	onApply: (direction: UpgradeDirection) => void;
	onClose: () => void;
	onScopeChange: (scope: 'selection' | 'root') => void;
	replacements: BookWideReplacementsProps;
	recordMetadata: UpgradePlannerRecordMetadataProps;
	recordTools: UpgradePlannerRecordToolsProps;
	saveDisabled: boolean;
	savePrompt: UpgradePlannerSavePromptProps;
	savedRecordName?: string;
	savedLibraryMessage?: string;
	scope: 'selection' | 'root';
	selectionScopeDisabled: boolean;
	selectionScopeLabel: string;
}

interface UpgradePlannerRecordMetadataProps {
	description: string;
	icons: readonly (SignalID | undefined)[];
	label: string;
	onDescriptionChange: (description: string) => void;
	onIconsChange: (icons: Array<SignalID | undefined>) => void;
	onLabelChange: (label: string) => void;
}

interface UpgradePlannerRecordToolsProps {
	deleteKind: 'local' | 'saved';
	onCopy: () => Promise<boolean>;
	onDelete: () => Promise<void>;
	onExport: () => void;
}

interface UpgradePlannerSavePromptProps {
	existingRecordName?: string;
	label: string;
	onCancel: () => void;
	onOpen: () => void;
	onSaveAsNew: () => void;
	onUpdateExisting?: () => void;
	open: boolean;
	pending: boolean;
}

interface UpgradePlannerMetadataEditorProps {
	description: string;
	icons: readonly (SignalID | undefined)[];
	label: string;
	onClose: () => void;
	onConfirm: (metadata: {description: string; icons: Array<SignalID | undefined>; label: string}) => void;
	signalOptions: readonly SignalID[];
}

function UpgradePlannerMetadataEditor({
	description,
	icons,
	label,
	onClose,
	onConfirm,
	signalOptions,
}: UpgradePlannerMetadataEditorProps) {
	const headingId = useId();
	const nameId = useId();
	const iconHeadingId = useId();
	const [draftDescription, setDraftDescription] = useState(description);
	const [draftIcons, setDraftIcons] = useState<Array<SignalID | undefined>>(() => [...icons]);
	const [draftLabel, setDraftLabel] = useState(label);
	const [pickerIndex, setPickerIndex] = useState<number>();
	const pickerOptions = chatIconPickerOptions([
		...signalOptions,
		...draftIcons.filter((icon): icon is SignalID => icon !== undefined),
	]);
	const dialogReference = useDialogFocus<HTMLElement>({
		initialFocusSelector: '.upgrade-planner-metadata__name',
		onClose,
	});

	const confirm = () => {
		onConfirm({description: draftDescription, icons: draftIcons, label: draftLabel});
	};

	return (
		<div className="transform-dialog-backdrop upgrade-planner-metadata__backdrop">
			<section
				ref={dialogReference}
				className="factorio-frame factorio-frame--shallow transform-dialog upgrade-planner-metadata"
				role="dialog"
				aria-modal="true"
				aria-labelledby={headingId}
				aria-hidden={pickerIndex === undefined ? undefined : true}
				inert={pickerIndex !== undefined}
			>
				<header className="factorio-title-bar transform-dialog__header upgrade-planner-metadata__header">
					<h3 id={headingId}>Edit upgrade planner</h3>
					<FactorioButton
						kind={FactorioButtonKind.Close}
						aria-label="Close upgrade planner preview editor"
						title="Close"
						onClick={onClose}
					/>
				</header>
				<div
					className="factorio-frame factorio-frame--shallow upgrade-planner-metadata__record"
					data-factorio-source="BlueprintRecordPreviewEdit"
					data-factorio-style="entity_frame"
				>
					<label className="upgrade-planner-metadata__label" htmlFor={nameId}>
						Name
					</label>
					<input
						id={nameId}
						className="upgrade-planner-metadata__name"
						type="text"
						maxLength={200}
						value={draftLabel}
						data-factorio-style="textbox"
						onChange={(event) => {
							setDraftLabel(event.currentTarget.value);
						}}
						onKeyDown={(event) => {
							if (event.key === 'Enter') {
								event.preventDefault();
								confirm();
							}
						}}
					/>
					<BlueprintDescriptionEditor
						accessibleLabel="Planner description"
						description={draftDescription}
						onDescriptionChange={setDraftDescription}
						variant="record-preview"
					/>
					<h4
						id={iconHeadingId}
						className="upgrade-planner-metadata__label upgrade-planner-metadata__icon-label"
					>
						Icon <span title="Choose up to four preview icons.">ⓘ</span>
					</h4>
					<div className="upgrade-planner-metadata__icons" aria-labelledby={iconHeadingId}>
						<BlueprintLabelIcons
							icons={draftIcons}
							itemName="upgrade-planner"
							labelPrefix="preview icon"
							onChange={setDraftIcons}
							onChoose={setPickerIndex}
							signalTitle={signalTitle}
						/>
					</div>
				</div>
				<footer className="upgrade-planner-metadata__footer">
					<span className="upgrade-planner-metadata__drag-space" aria-hidden="true" />
					<FactorioButton
						kind={FactorioButtonKind.Confirm}
						className="transform-picker__confirm"
						aria-label="Confirm planner metadata"
						title="Confirm"
						onClick={confirm}
					>
						<span aria-hidden="true">✓</span>
					</FactorioButton>
				</footer>
			</section>
			{pickerIndex === undefined ? null : (
				<SignalPickerDialog
					confirmationMode="required"
					initialSignal={draftIcons[pickerIndex]}
					title={`Choose planner preview icon ${(pickerIndex + 1).toString()}`}
					options={pickerOptions}
					onClose={() => {
						setPickerIndex(undefined);
					}}
					onChoose={(signal) => {
						setDraftIcons((current) => {
							const next = [...current];
							next[pickerIndex] = signal;
							return next;
						});
						setPickerIndex(undefined);
					}}
				/>
			)}
		</div>
	);
}

function UpgradePlannerDeleteConfirmation({
	deleteKind,
	onCancel,
	onDelete,
}: Pick<UpgradePlannerRecordToolsProps, 'deleteKind' | 'onDelete'> & {onCancel: () => void}) {
	const headingId = useId();
	const [pending, setPending] = useState(false);
	const [error, setError] = useState<string>();
	const dialogReference = useDialogFocus<HTMLElement>({
		initialFocusSelector: '[data-dialog-initial-focus="true"]',
		onClose: () => {
			if (!pending) {
				onCancel();
			}
		},
	});
	const saved = deleteKind === 'saved';

	return (
		<div className="transform-dialog-backdrop transform-dialog-backdrop--confirmation">
			<section
				ref={dialogReference}
				className="factorio-frame factorio-frame--shallow transform-dialog transform-dialog--confirmation"
				role="alertdialog"
				aria-modal="true"
				aria-labelledby={headingId}
			>
				<header className="factorio-title-bar transform-dialog__header">
					<h3 id={headingId}>{saved ? 'Delete saved planner?' : 'Discard local planner?'}</h3>
				</header>
				<p>
					{saved
						? 'This removes the planner from the Blueprint Library. The loaded blueprint is not changed.'
						: 'This planner has no Blueprint Library record. Its local draft will be discarded.'}
				</p>
				{error === undefined ? null : (
					<p className="alert alert-error" role="alert">
						{error}
					</p>
				)}
				<div className="transform-dialog__actions">
					<FactorioButton data-dialog-initial-focus="true" disabled={pending} onClick={onCancel}>
						Keep planner
					</FactorioButton>
					<FactorioButton
						kind={FactorioButtonKind.Delete}
						disabled={pending}
						onClick={() => {
							setPending(true);
							setError(undefined);
							void onDelete().catch((reason: unknown) => {
								setPending(false);
								setError(reason instanceof Error ? reason.message : 'Unable to delete planner.');
							});
						}}
					>
						{saved ? 'Delete from Library' : 'Discard local draft'}
					</FactorioButton>
				</div>
			</section>
		</div>
	);
}

function UpgradePlannerSavePrompt({
	existingRecordName,
	label,
	onCancel,
	onSaveAsNew,
	onUpdateExisting,
	open,
	pending,
}: UpgradePlannerSavePromptProps) {
	const headingId = useId();
	const dialogReference = useDialogFocus<HTMLElement>({
		initialFocusSelector: '.factorio-button--green',
		onClose: () => {
			if (!pending) {
				onCancel();
			}
		},
	});

	if (!open) {
		return null;
	}

	return (
		<div className="transform-dialog-backdrop transform-dialog-backdrop--confirmation">
			<section
				ref={dialogReference}
				className="factorio-frame factorio-frame--shallow transform-dialog transform-dialog--confirmation upgrade-planner-save"
				role="dialog"
				aria-modal="true"
				aria-labelledby={headingId}
			>
				<header className="factorio-title-bar transform-dialog__header">
					<h3 id={headingId}>Save to Blueprint Library</h3>
				</header>
				<p>
					{existingRecordName === undefined ? (
						<>
							Save <strong>“{label}”</strong> to <strong>Blueprint Library › Root shelf</strong>.
						</>
					) : (
						<>
							Update the saved record <strong>“{existingRecordName}”</strong> in its current Blueprint
							Library location, or save <strong>“{label}”</strong> as a copy on{' '}
							<strong>Blueprint Library › Root shelf</strong>.
						</>
					)}
				</p>
				<div className="transform-dialog__actions">
					<FactorioButton className="transform-button" disabled={pending} onClick={onCancel}>
						Cancel Save
					</FactorioButton>
					{onUpdateExisting === undefined ? null : (
						<FactorioButton
							className="transform-button"
							disabled={pending}
							onClick={() => {
								onUpdateExisting();
							}}
						>
							Update Planner
						</FactorioButton>
					)}
					<FactorioButton
						kind={FactorioButtonKind.Confirm}
						disabled={pending}
						onClick={() => {
							onSaveAsNew();
						}}
					>
						{onUpdateExisting === undefined ? 'Save Planner' : 'Save a Copy'}
					</FactorioButton>
				</div>
			</section>
		</div>
	);
}

function UpgradePlannerLoader({
	error,
	onPlannerLoad,
	onPlannerInputChange,
	plannerInput,
	plannerInputError,
	rootBlueprint,
	source,
	sourceLabel,
}: UpgradePlannerLoaderProps) {
	const plannerSelectorId = useId();
	const plannerSourceId = useId();
	const pasteHeadingId = useId();
	const pasteInputId = useId();
	const pasteStatusId = useId();
	const [plannerSelectorOpen, setPlannerSelectorOpen] = useState(false);
	const pasteState = plannerInput === '' ? 'empty' : plannerInputError === undefined ? 'valid' : 'invalid';
	const pasteStatus =
		pasteState === 'empty'
			? 'Paste an encoded upgrade planner string or its JSON representation.'
			: pasteState === 'valid'
				? 'Planner loaded into the editable mapping grid.'
				: plannerInputError;

	return (
		<>
			<div className="upgrade-planner-loader" data-website-extension="planner-library-loader">
				<div className="panel-hole-inner upgrade-planner-editor__source">
					<div
						id={plannerSourceId}
						className="upgrade-planner-editor__source-identity"
						aria-label={`Draft source: ${sourceLabel}`}
					>
						<span>Draft source</span>
						<span className="upgrade-planner-editor__source-value">
							<FactorioIcon decorative icon={{type: 'item', name: 'upgrade-planner'}} size="small" />
							<strong title={sourceLabel}>{sourceLabel}</strong>
						</span>
					</div>
					<FactorioButton
						className="upgrade-planner-editor__source-button"
						aria-controls={plannerSelectorId}
						aria-describedby={plannerSourceId}
						aria-expanded={plannerSelectorOpen}
						aria-haspopup="dialog"
						aria-label="Load planner to replace draft"
						data-website-action="replace-planner-draft"
						title="Choose a planner to replace this editable draft"
						onClick={() => {
							setPlannerSelectorOpen(true);
						}}
					>
						Load planner…
					</FactorioButton>
				</div>
				{source === 'pasted' ? (
					<section
						className="panel-hole-inner upgrade-planner-editor__paste"
						data-validation-state={pasteState}
						data-website-extension="planner-paste-import"
						aria-labelledby={pasteHeadingId}
					>
						<header className="upgrade-planner-editor__paste-header">
							<span className="upgrade-planner-editor__paste-extension">Website extension</span>
							<h5 id={pasteHeadingId}>Paste planner definition</h5>
						</header>
						<label className="upgrade-planner-editor__paste-label" htmlFor={pasteInputId}>
							Planner string or JSON
						</label>
						<textarea
							id={pasteInputId}
							value={plannerInput}
							aria-describedby={pasteStatusId}
							aria-invalid={pasteState === 'invalid' || undefined}
							data-factorio-style="textbox"
							placeholder="Paste an upgrade planner string or JSON"
							rows={3}
							onChange={(event) => {
								onPlannerInputChange(event.currentTarget.value);
							}}
						/>
						<p
							id={pasteStatusId}
							className="upgrade-planner-editor__paste-status"
							aria-live={pasteState === 'invalid' ? undefined : 'polite'}
							role={pasteState === 'invalid' ? 'alert' : undefined}
						>
							{pasteStatus}
						</p>
					</section>
				) : null}
				{error === undefined ? null : (
					<p className="panel alert alert-error upgrade-planner-editor__error" role="alert">
						{error}
					</p>
				)}
			</div>
			{plannerSelectorOpen ? (
				<UpgradePlannerSelectorDialog
					dialogId={plannerSelectorId}
					includeEditingChoices
					rootBlueprint={rootBlueprint}
					selectedSource={source}
					onClose={() => {
						setPlannerSelectorOpen(false);
					}}
					onChoose={(choice) => {
						onPlannerLoad(choice);
					}}
				/>
			) : null}
		</>
	);
}

function UpgradeMappingsEditor({
	mappings,
	onClearEndpoint,
	onMove,
	onSourceChange,
	onTargetChange,
	sourceOptions,
}: UpgradeMappingsEditorProps) {
	const [sourcePicker, setSourcePicker] = useState<{mappingId?: string; slotIndex: number}>();
	const [targetPicker, setTargetPicker] = useState<{mappingId?: string; slotIndex: number}>();
	const sourcePickerMapping = mappings.find((mapping) => mapping.mappingId === sourcePicker?.mappingId);
	const targetPickerMapping = mappings.find((mapping) => mapping.mappingId === targetPicker?.mappingId);
	const sourceSelectionAllowed = (sourceSignal: UpgradeSourceSignal): boolean => {
		const duplicate = mappings.some(
			(mapping) =>
				mapping.mappingId !== sourcePicker?.mappingId &&
				mapping.from !== undefined &&
				signalIdentity(mapping.from) === signalIdentity(sourceSignal),
		);
		return !duplicate;
	};
	const sourcePickerOptions = [
		...new Map(
			[...sourceOptions, ...(sourcePickerMapping?.from === undefined ? [] : [sourcePickerMapping.from])].map(
				(signal) => [signalPrototypeIdentity(signal), signal],
			),
		).values(),
	];
	const targetPickerOptions =
		targetPickerMapping?.from === undefined ? sourceOptions : upgradeTargetOptions(targetPickerMapping.from);

	return (
		<>
			<UpgradeMappingGrid
				mappings={mappings}
				onChooseSource={(mappingId, slotIndex) => {
					setSourcePicker({mappingId, slotIndex});
					setTargetPicker(undefined);
				}}
				onChooseTarget={(mappingId, slotIndex) => {
					setTargetPicker({mappingId, slotIndex});
					setSourcePicker(undefined);
				}}
				onClearEndpoint={onClearEndpoint}
				onMove={onMove}
			/>
			{targetPicker === undefined ? null : (
				<SignalPickerDialog
					confirmationMode="required"
					includeHiddenSignals
					initialSignal={targetPickerMapping?.to}
					initialQuality={targetPickerMapping?.to?.quality ?? 'normal'}
					title="Select upgrade"
					options={targetPickerOptions}
					qualityMode="target"
					isSelectionAllowed={(target) =>
						targetPickerMapping?.from === undefined ||
						isUpgradeTargetSelectionAllowed(targetPickerMapping.from, target)
					}
					onClose={() => {
						setTargetPicker(undefined);
					}}
					onChoose={(target) => {
						onTargetChange(targetPicker.mappingId, targetPicker.slotIndex, target);
						setTargetPicker(undefined);
					}}
				/>
			)}
			{sourcePicker === undefined ? null : (
				<SignalPickerDialog
					confirmationMode="required"
					includeHiddenSignals
					initialSignal={sourcePickerMapping?.from}
					title="Set the filter"
					options={sourcePickerOptions}
					qualityMode="source"
					isSelectionAllowed={sourceSelectionAllowed}
					onClose={() => {
						setSourcePicker(undefined);
					}}
					onChoose={(sourceSignal) => {
						onSourceChange(sourcePicker.mappingId, sourcePicker.slotIndex, sourceSignal);
						setSourcePicker(undefined);
					}}
				/>
			)}
		</>
	);
}

export function UpgradePlannerDialog({
	breadcrumb,
	canChooseRootScope,
	mappings,
	matchCount,
	onApply,
	onClose,
	onScopeChange,
	replacements,
	recordMetadata,
	recordTools,
	saveDisabled,
	savePrompt,
	savedRecordName,
	savedLibraryMessage,
	scope,
	selectionScopeDisabled,
	selectionScopeLabel,
}: UpgradePlannerDialogProps) {
	const dialogHeadingId = useId();
	const applicationHeadingId = useId();
	const applicationScopeName = useId();
	const [metadataEditorOpen, setMetadataEditorOpen] = useState(false);
	const [deleteConfirmationOpen, setDeleteConfirmationOpen] = useState(false);
	const [copyStatus, setCopyStatus] = useState<string>();
	const childDialogOpen = savePrompt.open || metadataEditorOpen || deleteConfirmationOpen;
	const dialogReference = useDialogFocus<HTMLElement>({
		initialFocusSelector: '.upgrade-planner-dialog__scroll-region',
		onClose,
	});

	return (
		<div className="transform-dialog-backdrop transform-workbench-backdrop upgrade-planner-dialog__backdrop">
			<section
				ref={dialogReference}
				className="factorio-frame factorio-frame--shallow transform-dialog transform-workbench transform-workbench--planner upgrade-planner-dialog"
				role="dialog"
				aria-modal="true"
				aria-labelledby={dialogHeadingId}
				aria-hidden={childDialogOpen || undefined}
				inert={childDialogOpen}
			>
				<header
					className="factorio-title-bar transform-dialog__header upgrade-planner-dialog__title-bar"
					data-factorio-source="UpgradeItemGui::UpgradeItemGui"
				>
					<div className="upgrade-planner-dialog__identity">
						<span
							className="upgrade-planner-dialog__identity-icon"
							data-website-extension="planner-identity-icon"
						>
							<FactorioIcon decorative icon={{type: 'item', name: 'upgrade-planner'}} size="small" />
						</span>
						<h3 id={dialogHeadingId}>Upgrade Planner</h3>
					</div>
					<FactorioButton
						kind={FactorioButtonKind.Close}
						className="transform-dialog__close"
						aria-label="Close Upgrade Planner"
						data-factorio-source="GameGuiWithControllerInventory::closeButton"
						data-factorio-close-action="request-close"
						title="Close Upgrade Planner"
						onClick={() => {
							onClose();
						}}
					/>
				</header>
				<div className="upgrade-planner-dialog__context-strip" data-website-extension="planner-context">
					<nav className="upgrade-planner-dialog__context" aria-label="Upgrade planner blueprint context">
						<span className="upgrade-planner-dialog__context-label">
							{scope === 'root' ? 'Entire root book' : selectionScopeLabel}
						</span>
						<span aria-hidden="true">›</span>
						<span className="upgrade-planner-dialog__breadcrumb" aria-current="page">
							{breadcrumb}
						</span>
					</nav>
					<span className="upgrade-planner-dialog__library-state" aria-label="Planner library status">
						{savedRecordName === undefined
							? 'Local draft · not in Blueprint Library'
							: `Blueprint Library › ${savedRecordName}`}
					</span>
				</div>

				<div className="upgrade-planner-dialog__body">
					<section
						className="factorio-frame factorio-frame--shallow upgrade-planner-dialog__editor-shell"
						data-factorio-style="entity_frame"
						aria-label="Upgrade planner editor"
					>
						<header
							className="factorio-title-bar upgrade-planner-dialog__record-subheader"
							data-factorio-style="subheader_frame"
						>
							<div className="blueprint-editor__title-row upgrade-planner-dialog__name-group">
								<BlueprintTitleEditor
									editLabel="Edit planner name"
									emptyLabel="Upgrade planner"
									label={recordMetadata.label}
									onLabelChange={recordMetadata.onLabelChange}
									onEdit={() => {
										setMetadataEditorOpen(true);
									}}
								/>
							</div>
							<div
								className="upgrade-planner-dialog__record-tools"
								role="toolbar"
								aria-label="Planner record tools"
							>
								<FactorioButton
									className="upgrade-planner-dialog__record-tool"
									aria-label="Copy planner string"
									data-factorio-source="UpgradeItemFrame::copy"
									title="Copy this"
									onClick={() => {
										void recordTools.onCopy().then((copied) => {
											setCopyStatus(
												copied ? 'Planner string copied.' : 'Unable to copy planner string.',
											);
										});
									}}
								>
									<Copy aria-hidden="true" />
								</FactorioButton>
								<FactorioButton
									className="upgrade-planner-dialog__record-tool"
									aria-label="Export planner string"
									data-factorio-source="UpgradeItemFrame::exportSlot"
									title="Export planner"
									onClick={recordTools.onExport}
								>
									<ExternalLink aria-hidden="true" />
								</FactorioButton>
								<FactorioButton
									kind={FactorioButtonKind.Delete}
									className="upgrade-planner-dialog__record-tool"
									aria-label={
										recordTools.deleteKind === 'saved'
											? 'Delete planner from Blueprint Library'
											: 'Discard local planner'
									}
									data-factorio-source="UpgradeItemFrame::destroySlot"
									title={
										recordTools.deleteKind === 'saved'
											? 'Delete saved planner'
											: 'Discard local planner'
									}
									onClick={() => {
										setDeleteConfirmationOpen(true);
									}}
								/>
							</div>
						</header>
						{copyStatus === undefined ? null : (
							<p className="transform-visually-hidden" role="status">
								{copyStatus}
							</p>
						)}
						{recordMetadata.description === '' ? null : (
							<p className="upgrade-planner-dialog__record-description">{recordMetadata.description}</p>
						)}
						<div
							className="factorio-scroll-frame upgrade-planner-dialog__scroll-region"
							data-factorio-style="mappers_scroll_pane"
							role="region"
							aria-label="Upgrade mappings"
							tabIndex={0}
						>
							<UpgradeMappingsEditor {...mappings} />
						</div>
						<div
							className="upgrade-planner-dialog__filler"
							data-factorio-style="entity_frame_filler"
							aria-hidden="true"
						/>
					</section>

					<section
						className="panel-hole upgrade-planner-dialog__application"
						data-website-extension="planner-application"
						aria-labelledby={applicationHeadingId}
					>
						<header className="factorio-title-bar upgrade-planner-dialog__panel-heading">
							<h4 id={applicationHeadingId}>Website application</h4>
							<span aria-label={`${matchCount.toString()} ${matchCount === 1 ? 'match' : 'matches'}`}>
								{`${matchCount.toString()} ${matchCount === 1 ? 'match' : 'matches'}`}
							</span>
						</header>
						<div className="upgrade-planner-dialog__application-controls">
							<fieldset
								className="panel-hole-inner upgrade-planner-dialog__application-scope"
								role="radiogroup"
								data-website-extension="planner-application-scope"
							>
								<legend>Apply mappings to</legend>
								<div className="upgrade-planner-dialog__scope-options">
									<label data-selected={scope === 'selection' || undefined}>
										<input
											type="radio"
											checked={scope === 'selection'}
											data-factorio-style="radiobutton"
											disabled={selectionScopeDisabled}
											name={applicationScopeName}
											value="selection"
											onChange={() => {
												onScopeChange('selection');
											}}
										/>
										<span className="upgrade-planner-dialog__scope-copy">
											<strong>Current selection</strong>
											<small>{selectionScopeLabel}</small>
										</span>
									</label>
									{canChooseRootScope || selectionScopeDisabled ? (
										<label data-selected={scope === 'root' || undefined}>
											<input
												type="radio"
												checked={scope === 'root'}
												data-factorio-style="radiobutton"
												name={applicationScopeName}
												value="root"
												onChange={() => {
													onScopeChange('root');
												}}
											/>
											<span className="upgrade-planner-dialog__scope-copy">
												<strong>Entire book</strong>
												<small>Every blueprint in the loaded root book</small>
											</span>
										</label>
									) : null}
								</div>
							</fieldset>
							<UpgradePlannerLoader {...mappings} />
						</div>
					</section>

					<BookWideReplacements {...replacements} />
				</div>

				<footer
					className="transform-workbench__footer transform-workbench__footer--actions upgrade-planner-dialog__website-actions"
					data-website-extension="planner-actions"
				>
					<FactorioButton
						className="transform-button"
						onClick={() => {
							onClose();
						}}
					>
						Close Planner
					</FactorioButton>
					{savedLibraryMessage === undefined ? null : (
						<p className="upgrade-planner-dialog__saved-record" role="status">
							{savedLibraryMessage}
						</p>
					)}
					<div className="transform-workbench__apply-actions">
						<FactorioButton
							className="transform-button"
							disabled={saveDisabled}
							onClick={() => {
								savePrompt.onOpen();
							}}
						>
							Save Planner
						</FactorioButton>
						<FactorioButton
							className="transform-button"
							disabled={saveDisabled}
							onClick={() => {
								onApply('downgrade');
							}}
						>
							Apply Downgrade to {scope === 'root' ? 'Entire Root Book' : 'Current Blueprint'}
						</FactorioButton>
						<FactorioButton
							kind={FactorioButtonKind.Confirm}
							disabled={saveDisabled}
							onClick={() => {
								onApply('upgrade');
							}}
						>
							Apply Upgrade to {scope === 'root' ? 'Entire Root Book' : 'Current Blueprint'}
						</FactorioButton>
					</div>
				</footer>
			</section>
			{savePrompt.open ? <UpgradePlannerSavePrompt {...savePrompt} /> : null}
			{metadataEditorOpen ? (
				<UpgradePlannerMetadataEditor
					description={recordMetadata.description}
					icons={recordMetadata.icons}
					label={recordMetadata.label}
					signalOptions={mappings.sourceOptions}
					onClose={() => {
						setMetadataEditorOpen(false);
					}}
					onConfirm={(metadata) => {
						recordMetadata.onLabelChange(metadata.label);
						recordMetadata.onDescriptionChange(metadata.description);
						recordMetadata.onIconsChange(metadata.icons);
						setMetadataEditorOpen(false);
					}}
				/>
			) : null}
			{deleteConfirmationOpen ? (
				<UpgradePlannerDeleteConfirmation
					deleteKind={recordTools.deleteKind}
					onCancel={() => {
						setDeleteConfirmationOpen(false);
					}}
					onDelete={recordTools.onDelete}
				/>
			) : null}
		</div>
	);
}
