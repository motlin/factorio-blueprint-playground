import {useId, useState} from 'react';

import type {BlueprintString, SignalID, UpgradeSourceSignal} from '../../../../parsing/types';
import type {UpgradeDirection} from '../../../../transform/upgradePlanner';
import {FactorioIcon} from '../../../core/icons/FactorioIcon';
import {FactorioButton, FactorioButtonKind} from '../../../ui/FactorioUi';
import {Textarea} from '../../../ui/Textarea';
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
	rootBlueprint,
	source,
	sourceLabel,
}: UpgradePlannerLoaderProps) {
	const plannerSelectorId = useId();
	const [plannerSelectorOpen, setPlannerSelectorOpen] = useState(false);

	return (
		<>
			<div className="upgrade-planner-loader" data-website-extension="planner-library-loader">
				<div className="panel-hole-inner upgrade-planner-editor__source">
					<strong>Load planner</strong>
					<button
						type="button"
						className="upgrade-planner-editor__source-button"
						aria-controls={plannerSelectorId}
						aria-expanded={plannerSelectorOpen}
						aria-haspopup="dialog"
						aria-label={`Load planner, currently ${sourceLabel}`}
						onClick={() => {
							setPlannerSelectorOpen(true);
						}}
					>
						<FactorioIcon icon={{type: 'item', name: 'upgrade-planner'}} size="small" />
						<span>{sourceLabel}</span>
					</button>
				</div>
				{source === 'pasted' ? (
					<div className="upgrade-planner-editor__paste">
						<label className="upgrade-planner-editor__paste-label">
							<span>Planner string or JSON</span>
							<Textarea
								value={plannerInput}
								onChange={onPlannerInputChange}
								placeholder="Paste an upgrade planner string or JSON"
								rows={3}
							/>
						</label>
					</div>
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
						setPlannerSelectorOpen(false);
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
	const [previewIconPickerIndex, setPreviewIconPickerIndex] = useState<number>();
	const previewIconOptions = chatIconPickerOptions([
		...mappings.sourceOptions,
		...recordMetadata.icons.filter((icon): icon is SignalID => icon !== undefined),
	]);
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
				aria-hidden={savePrompt.open || undefined}
				inert={savePrompt.open}
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
									emptyLabel="Planner name required"
									inputLabel="Planner name"
									label={recordMetadata.label}
									onLabelChange={recordMetadata.onLabelChange}
								/>
							</div>
						</header>
						<div className="upgrade-planner-dialog__record-details">
							<section
								className="transform-workflow__section blueprint-editor__icons upgrade-planner-dialog__preview-icons"
								aria-labelledby="upgrade-planner-preview-icons-heading"
							>
								<h4 id="upgrade-planner-preview-icons-heading">Preview icons</h4>
								<div>
									<BlueprintLabelIcons
										icons={recordMetadata.icons}
										itemName="upgrade-planner"
										labelPrefix="preview icon"
										onChange={recordMetadata.onIconsChange}
										onChoose={setPreviewIconPickerIndex}
										signalTitle={signalTitle}
									/>
								</div>
							</section>
							<BlueprintDescriptionEditor
								accessibleLabel="Planner description"
								description={recordMetadata.description}
								onDescriptionChange={recordMetadata.onDescriptionChange}
							/>
						</div>
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
							<div className="panel-hole-inner transform-workflow__scope">
								<label>
									<strong>Apply mappings to</strong>
									<select
										aria-label="Apply to"
										value={scope}
										onChange={(event) => {
											onScopeChange(event.currentTarget.value === 'root' ? 'root' : 'selection');
										}}
									>
										<option value="selection" disabled={selectionScopeDisabled}>
											{selectionScopeLabel}
										</option>
										{canChooseRootScope || selectionScopeDisabled ? (
											<option value="root">Entire root book</option>
										) : null}
									</select>
								</label>
							</div>
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
			{previewIconPickerIndex === undefined ? null : (
				<SignalPickerDialog
					confirmationMode="required"
					initialSignal={recordMetadata.icons[previewIconPickerIndex]}
					title={`Choose planner preview icon ${(previewIconPickerIndex + 1).toString()}`}
					options={previewIconOptions}
					onClose={() => {
						setPreviewIconPickerIndex(undefined);
					}}
					onChoose={(signal) => {
						const next = [...recordMetadata.icons];
						next[previewIconPickerIndex] = signal;
						recordMetadata.onIconsChange(next);
						setPreviewIconPickerIndex(undefined);
					}}
				/>
			)}
		</div>
	);
}
