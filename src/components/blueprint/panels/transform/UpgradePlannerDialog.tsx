import {useId, useState} from 'react';

import type {BlueprintString, SignalID, UpgradeSourceSignal} from '../../../../parsing/types';
import type {UpgradeRule} from '../../../../transform/upgradePlanner';
import {FactorioIcon} from '../../../core/icons/FactorioIcon';
import {ButtonGreen} from '../../../ui/ButtonGreen';
import {FactorioButton, FactorioButtonKind} from '../../../ui/FactorioUi';
import {Textarea} from '../../../ui/Textarea';
import {BookWideReplacements, type BookWideReplacementsProps} from './BookWideReplacements';
import {SignalPickerDialog} from './SignalPickerDialog';
import {UpgradeMappingGrid, type PositionedUpgradeCandidate} from './UpgradeMappingGrid';
import {
	isUpgradeSourceOption,
	isUpgradeTargetSelectionAllowed,
	signalIdentity,
	signalPrototypeIdentity,
	upgradeTargetOptions,
} from './upgradePlannerSignals';
import {UpgradePlannerSelectorDialog, type UpgradePlannerChoice} from './UpgradePlannerSelectorDialog';

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
 * - Applying a saved planner is a separate explicit operation. Upgrade reads the
 *   same records From to To; downgrade reads them in reverse. Direction never
 *   changes the editor shape or creates another mapper set.
 * - A mapper remains part of the planner when the current blueprint has no
 *   matches. Counts may describe a proposed application, but must not add,
 *   remove, reorder, or otherwise become the source of editor rows.
 * - Saving a planner definition and applying it to a selected blueprint/root are
 *   distinct commands. The application selector may follow a save in this
 *   product, but saving alone must not apply the planner.
 *
 * Evidence: UpgradeItemGui, UpgradeFilterSelectListGui,
 * UpgradeDestinationSelectListGui, UpgradeRecord, UpgradeItem, UpgradeData, and
 * its mapper value types at Factorio 2.1.12; UP-1 and the July 23 planner-grid,
 * source-filter, quality-condition, and restricted-target captures.
 */
interface UpgradePlannerMappings {
	candidates: PositionedUpgradeCandidate[];
	error: string | undefined;
	excludedSources: ReadonlySet<string>;
	manualRules: readonly UpgradeRule[];
	onAddManualRule: (rule: UpgradeRule, slotIndex: number) => void;
	onChangeManualRule: (previousSource: UpgradeSourceSignal, rule: UpgradeRule) => void;
	onPlannerLoad: (choice: UpgradePlannerChoice) => void;
	onPlannerInputChange: (value: string) => void;
	onRemoveRule: (source: UpgradeSourceSignal, manual: boolean) => void;
	onTargetChange: (source: SignalID, target: SignalID) => void;
	plannerInput: string;
	rootBlueprint: BlueprintString;
	source: string;
	sourceLabel: string;
	sourceOptions: SignalID[];
}

interface UpgradePlannerDialogProps {
	breadcrumb: string;
	canChooseRootScope: boolean;
	mappings: UpgradePlannerMappings;
	matchCount: number;
	onClose: () => void;
	onSave: () => void;
	onScopeChange: (scope: 'selection' | 'root') => void;
	replacements: BookWideReplacementsProps;
	saveDisabled: boolean;
	scope: 'selection' | 'root';
	selectionScopeDisabled: boolean;
	selectionScopeLabel: string;
}

function UpgradeMappingsEditor({
	candidates,
	error,
	excludedSources,
	manualRules,
	onAddManualRule,
	onChangeManualRule,
	onPlannerLoad,
	onPlannerInputChange,
	onRemoveRule,
	onTargetChange,
	plannerInput,
	rootBlueprint,
	source,
	sourceLabel,
	sourceOptions,
}: UpgradePlannerMappings) {
	const plannerSelectorId = useId();
	const [plannerSelectorOpen, setPlannerSelectorOpen] = useState(false);
	const [targetPickerCandidate, setTargetPickerCandidate] = useState<PositionedUpgradeCandidate>();
	const [sourcePickerCandidate, setSourcePickerCandidate] = useState<PositionedUpgradeCandidate>();
	const [addMappingSource, setAddMappingSource] = useState<UpgradeSourceSignal>();
	const [addMappingSlotIndex, setAddMappingSlotIndex] = useState<number>();
	const [addSourcePickerOpen, setAddSourcePickerOpen] = useState(false);
	const [addTargetPickerOpen, setAddTargetPickerOpen] = useState(false);
	const visibleCandidates = candidates.filter((candidate) => !excludedSources.has(signalIdentity(candidate.from)));
	const occupiedSourcePrototypes = new Set(
		visibleCandidates.map((candidate) => signalPrototypeIdentity(candidate.from)),
	);
	const availableAddSources = sourceOptions.filter(
		(signal) => isUpgradeSourceOption(signal) && !occupiedSourcePrototypes.has(signalPrototypeIdentity(signal)),
	);
	const availableEditSources = (candidate: PositionedUpgradeCandidate): SignalID[] => {
		const occupiedByOtherMapping = new Set(
			visibleCandidates
				.filter((visibleCandidate) => visibleCandidate !== candidate)
				.map((visibleCandidate) => signalPrototypeIdentity(visibleCandidate.from)),
		);
		return [
			...new Map(
				[...sourceOptions.filter(isUpgradeSourceOption), candidate.from]
					.filter((signal) => !occupiedByOtherMapping.has(signalPrototypeIdentity(signal)))
					.map((signal) => [signalIdentity(signal), signal]),
			).values(),
		];
	};

	return (
		<>
			<div className="upgrade-planner-editor">
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
				<UpgradeMappingGrid
					candidates={candidates}
					draftSlotIndex={addMappingSlotIndex}
					draftSource={addMappingSource}
					excludedSources={excludedSources}
					manualRules={manualRules}
					onDraftRemove={() => {
						setAddMappingSource(undefined);
						setAddMappingSlotIndex(undefined);
						setAddSourcePickerOpen(false);
						setAddTargetPickerOpen(false);
					}}
					onDraftSourceChoose={(slotIndex) => {
						setAddMappingSlotIndex(slotIndex);
						setAddSourcePickerOpen(true);
						setAddTargetPickerOpen(false);
					}}
					onDraftTargetChoose={() => {
						if (addMappingSource !== undefined) {
							setAddTargetPickerOpen(true);
						}
					}}
					onRemove={(candidate, manual) => {
						onRemoveRule(candidate.from, manual);
					}}
					onSourceChoose={(candidate) => {
						setSourcePickerCandidate(candidate);
					}}
					onTargetChoose={(candidate) => {
						setTargetPickerCandidate(candidate);
					}}
				/>
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
						setAddMappingSource(undefined);
						setAddMappingSlotIndex(undefined);
						setAddSourcePickerOpen(false);
						setAddTargetPickerOpen(false);
						setPlannerSelectorOpen(false);
					}}
				/>
			) : null}
			{targetPickerCandidate === undefined ? null : (
				<SignalPickerDialog
					initialSignal={targetPickerCandidate.to}
					initialQuality={targetPickerCandidate.to.quality ?? 'normal'}
					title="Select upgrade"
					options={upgradeTargetOptions(targetPickerCandidate.from, targetPickerCandidate.to)}
					qualityMode="target"
					isSelectionAllowed={(target) => isUpgradeTargetSelectionAllowed(targetPickerCandidate.from, target)}
					onClose={() => {
						setTargetPickerCandidate(undefined);
					}}
					onChoose={(target) => {
						onTargetChange(targetPickerCandidate.from, target);
						setTargetPickerCandidate(undefined);
					}}
				/>
			)}
			{sourcePickerCandidate === undefined ? null : (
				<SignalPickerDialog
					initialSignal={sourcePickerCandidate.from}
					title="Set the filter"
					options={availableEditSources(sourcePickerCandidate)}
					qualityMode="source"
					onClose={() => {
						setSourcePickerCandidate(undefined);
					}}
					onChoose={(sourceSignal) => {
						onChangeManualRule(sourcePickerCandidate.from, {
							from: sourceSignal,
							preserveQuality: false,
							to: sourcePickerCandidate.to,
						});
						setSourcePickerCandidate(undefined);
					}}
				/>
			)}
			{addSourcePickerOpen ? (
				<SignalPickerDialog
					initialSignal={addMappingSource}
					title="Set the filter"
					options={
						addMappingSource === undefined
							? availableAddSources
							: [
									...new Map(
										[...availableAddSources, addMappingSource].map((signal) => [
											signalIdentity(signal),
											signal,
										]),
									).values(),
								]
					}
					qualityMode="source"
					onClose={() => {
						setAddSourcePickerOpen(false);
						if (addMappingSource === undefined) {
							setAddMappingSlotIndex(undefined);
						}
					}}
					onChoose={(sourceSignal) => {
						if (occupiedSourcePrototypes.has(signalPrototypeIdentity(sourceSignal))) {
							setAddSourcePickerOpen(false);
							return;
						}
						setAddMappingSource(sourceSignal);
						setAddSourcePickerOpen(false);
					}}
				/>
			) : null}
			{addTargetPickerOpen && addMappingSource !== undefined ? (
				<SignalPickerDialog
					title="Select upgrade"
					options={upgradeTargetOptions(addMappingSource, addMappingSource)}
					qualityMode="target"
					isSelectionAllowed={(target) => isUpgradeTargetSelectionAllowed(addMappingSource, target)}
					onClose={() => {
						setAddTargetPickerOpen(false);
					}}
					onChoose={(target) => {
						if (addMappingSlotIndex === undefined) {
							throw new Error('A mapping slot must be selected before choosing a target.');
						}
						onAddManualRule(
							{from: addMappingSource, preserveQuality: false, to: target},
							addMappingSlotIndex,
						);
						setAddMappingSource(undefined);
						setAddMappingSlotIndex(undefined);
						setAddTargetPickerOpen(false);
					}}
				/>
			) : null}
		</>
	);
}

export function UpgradePlannerDialog({
	breadcrumb,
	canChooseRootScope,
	mappings,
	matchCount,
	onClose,
	onSave,
	onScopeChange,
	replacements,
	saveDisabled,
	scope,
	selectionScopeDisabled,
	selectionScopeLabel,
}: UpgradePlannerDialogProps) {
	const dialogHeadingId = useId();
	const configurationHeadingId = useId();

	return (
		<div className="transform-dialog-backdrop transform-workbench-backdrop upgrade-planner-dialog__backdrop">
			<section
				className="factorio-frame factorio-frame--shallow transform-dialog transform-workbench transform-workbench--planner upgrade-planner-dialog"
				role="dialog"
				aria-modal="true"
				aria-labelledby={dialogHeadingId}
				onKeyDown={(event) => {
					if (event.key === 'Escape') {
						onClose();
					}
				}}
			>
				<header className="factorio-title-bar transform-dialog__header transform-workbench__header">
					<div className="transform-workbench__title">
						<FactorioIcon icon={{type: 'item', name: 'upgrade-planner'}} size="large" />
						<div>
							<h3 id={dialogHeadingId}>Upgrade Planner</h3>
							<span>{breadcrumb}</span>
						</div>
					</div>
					<div
						className="transform-workbench__status"
						aria-label={`${matchCount.toString()} ${matchCount === 1 ? 'match' : 'matches'}`}
					>
						<strong>{matchCount}</strong>
						<span>{matchCount === 1 ? 'match' : 'matches'}</span>
					</div>
					<FactorioButton
						kind={FactorioButtonKind.Close}
						className="transform-dialog__close"
						aria-label="Close Upgrade Planner"
						title="Close Upgrade Planner"
						onClick={() => {
							onClose();
						}}
					/>
				</header>

				<div
					className="factorio-scroll-frame transform-workbench__body upgrade-planner-dialog__scroll-region"
					role="region"
					aria-label="Upgrade Planner configuration"
					tabIndex={0}
				>
					<div className="upgrade-planner-dialog__content transform-workflow">
						<section
							className="panel-hole upgrade-planner-dialog__configuration"
							aria-labelledby={configurationHeadingId}
						>
							<header className="factorio-title-bar upgrade-planner-dialog__panel-heading">
								<h4 id={configurationHeadingId}>Upgrade mappings</h4>
							</header>
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
							<UpgradeMappingsEditor {...mappings} />
						</section>

						<BookWideReplacements {...replacements} />
					</div>
				</div>

				<footer className="transform-workbench__footer transform-workbench__footer--actions">
					<FactorioButton
						className="transform-button"
						onClick={() => {
							onClose();
						}}
					>
						Cancel
					</FactorioButton>
					<ButtonGreen disabled={saveDisabled} onClick={onSave}>
						Save planner
					</ButtonGreen>
				</footer>
			</section>
		</div>
	);
}
