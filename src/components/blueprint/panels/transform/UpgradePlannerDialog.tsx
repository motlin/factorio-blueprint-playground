import {useId, useState} from 'react';

import type {BlueprintString, SignalID, UpgradeSourceSignal} from '../../../../parsing/types';
import type {UpgradeCandidate, UpgradeRule} from '../../../../transform/upgradePlanner';
import {FactorioIcon} from '../../../core/icons/FactorioIcon';
import {ButtonGreen} from '../../../ui/ButtonGreen';
import {Textarea} from '../../../ui/Textarea';
import {AddUpgradeMappingRow} from './AddUpgradeMappingRow';
import {BookWideReplacements, type BookWideReplacementsProps} from './BookWideReplacements';
import {SignalPickerDialog} from './SignalPickerDialog';
import {UpgradeMappingGrid} from './UpgradeMappingGrid';
import {
	isUpgradeSourceOption,
	isUpgradeTargetSelectionAllowed,
	signalIdentity,
	signalName,
	signalPrototypeIdentity,
	upgradeTargetOptions,
} from './upgradePlannerSignals';
import {UpgradePlannerSelectorDialog, type UpgradePlannerChoice} from './UpgradePlannerSelectorDialog';

interface MappingSourceDraft {
	candidate: UpgradeCandidate;
	source: UpgradeSourceSignal;
}

interface UpgradePlannerMappings {
	candidates: UpgradeCandidate[];
	error: string | undefined;
	excludedSources: ReadonlySet<string>;
	manualRules: readonly UpgradeRule[];
	onAddManualRule: (rule: UpgradeRule) => void;
	onChangeManualRule: (previousSource: UpgradeSourceSignal, rule: UpgradeRule) => void;
	onPlannerLoad: (choice: UpgradePlannerChoice) => void;
	onPlannerInputChange: (value: string) => void;
	onRemoveRule: (source: UpgradeSourceSignal, manual: boolean) => void;
	onTargetChange: (source: SignalID, target: SignalID, preserveQuality: boolean) => void;
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
	const [targetPickerCandidate, setTargetPickerCandidate] = useState<UpgradeCandidate>();
	const [sourcePickerCandidate, setSourcePickerCandidate] = useState<UpgradeCandidate>();
	const [mappingSourceDraft, setMappingSourceDraft] = useState<MappingSourceDraft>();
	const [addMappingSource, setAddMappingSource] = useState<UpgradeSourceSignal>();
	const [addSourcePickerOpen, setAddSourcePickerOpen] = useState(false);
	const [addTargetPickerOpen, setAddTargetPickerOpen] = useState(false);
	const visibleCandidates = candidates.filter((candidate) => !excludedSources.has(signalIdentity(candidate.from)));
	const occupiedSourcePrototypes = new Set(
		visibleCandidates.map((candidate) => signalPrototypeIdentity(candidate.from)),
	);
	const availableAddSources = sourceOptions.filter(
		(signal) => isUpgradeSourceOption(signal) && !occupiedSourcePrototypes.has(signalPrototypeIdentity(signal)),
	);
	const availableEditSources = (candidate: UpgradeCandidate): SignalID[] => {
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
						<Textarea
							value={plannerInput}
							onChange={onPlannerInputChange}
							placeholder="Paste an upgrade planner string or JSON"
							rows={3}
						/>
					</div>
				) : null}
				{error === undefined ? null : (
					<p className="panel alert alert-error upgrade-planner-editor__error" role="alert">
						{error}
					</p>
				)}
				<UpgradeMappingGrid
					candidates={candidates}
					excludedSources={excludedSources}
					manualRules={manualRules}
					showEmptyState={error === undefined}
					onRemove={(candidate, manual) => {
						onRemoveRule(candidate.from, manual);
					}}
					onSourceChoose={(candidate) => {
						setSourcePickerCandidate(candidate);
					}}
					onSourceQualityChange={(candidate, nextSource) => {
						onChangeManualRule(candidate.from, {
							from: nextSource,
							preserveQuality: candidate.preserveQuality,
							to: candidate.to,
						});
					}}
					onTargetChoose={(candidate) => {
						setTargetPickerCandidate(candidate);
					}}
					onTargetQualityChange={(candidate, target, preserveQuality) => {
						onTargetChange(candidate.from, target, preserveQuality);
					}}
				/>
				<AddUpgradeMappingRow
					source={addMappingSource}
					onRemove={() => {
						setAddMappingSource(undefined);
						setAddSourcePickerOpen(false);
						setAddTargetPickerOpen(false);
					}}
					onSourceChoose={() => {
						setAddSourcePickerOpen(true);
						setAddTargetPickerOpen(false);
					}}
					onTargetChoose={() => {
						setAddTargetPickerOpen(true);
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
						setAddSourcePickerOpen(false);
						setAddTargetPickerOpen(false);
						setPlannerSelectorOpen(false);
					}}
				/>
			) : null}
			{targetPickerCandidate === undefined ? null : (
				<SignalPickerDialog
					initialSignal={targetPickerCandidate.to}
					initialQuality={
						targetPickerCandidate.preserveQuality
							? 'preserve'
							: (targetPickerCandidate.to.quality ?? 'normal')
					}
					title={`Choose target for ${signalName(targetPickerCandidate.from)}`}
					options={upgradeTargetOptions(targetPickerCandidate.from, targetPickerCandidate.to)}
					qualityMode="target"
					isSelectionAllowed={(target, preserveQuality) =>
						isUpgradeTargetSelectionAllowed(targetPickerCandidate.from, target, preserveQuality)
					}
					onClose={() => {
						setTargetPickerCandidate(undefined);
					}}
					onChoose={(target, preserveQuality = false) => {
						onTargetChange(targetPickerCandidate.from, target, preserveQuality);
						setTargetPickerCandidate(undefined);
					}}
				/>
			)}
			{sourcePickerCandidate === undefined ? null : (
				<SignalPickerDialog
					initialSignal={sourcePickerCandidate.from}
					title="Choose mapping source"
					options={availableEditSources(sourcePickerCandidate)}
					qualityMode="source"
					onClose={() => {
						setSourcePickerCandidate(undefined);
					}}
					onChoose={(sourceSignal) => {
						setMappingSourceDraft({candidate: sourcePickerCandidate, source: sourceSignal});
						setSourcePickerCandidate(undefined);
					}}
				/>
			)}
			{mappingSourceDraft === undefined ? null : (
				<SignalPickerDialog
					initialSignal={mappingSourceDraft.source}
					title={`Choose target for ${signalName(mappingSourceDraft.source)}`}
					options={upgradeTargetOptions(mappingSourceDraft.source, mappingSourceDraft.source)}
					qualityMode="target"
					isSelectionAllowed={(target, preserveQuality) =>
						isUpgradeTargetSelectionAllowed(mappingSourceDraft.source, target, preserveQuality)
					}
					onClose={() => {
						setMappingSourceDraft(undefined);
					}}
					onChoose={(target, preserveQuality = false) => {
						const rule = {from: mappingSourceDraft.source, preserveQuality, to: target};
						onChangeManualRule(mappingSourceDraft.candidate.from, rule);
						setMappingSourceDraft(undefined);
					}}
				/>
			)}
			{addSourcePickerOpen ? (
				<SignalPickerDialog
					initialSignal={addMappingSource}
					title="Choose source for new mapping"
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
					}}
					onChoose={(sourceSignal) => {
						if (occupiedSourcePrototypes.has(signalPrototypeIdentity(sourceSignal))) {
							setAddSourcePickerOpen(false);
							return;
						}
						setAddMappingSource(sourceSignal);
						setAddSourcePickerOpen(false);
						setAddTargetPickerOpen(true);
					}}
				/>
			) : null}
			{addTargetPickerOpen && addMappingSource !== undefined ? (
				<SignalPickerDialog
					title={`Choose target for ${signalName(addMappingSource)}`}
					options={upgradeTargetOptions(addMappingSource, addMappingSource)}
					qualityMode="target"
					isSelectionAllowed={(target, preserveQuality) =>
						isUpgradeTargetSelectionAllowed(addMappingSource, target, preserveQuality)
					}
					onClose={() => {
						setAddTargetPickerOpen(false);
					}}
					onChoose={(target, preserveQuality = false) => {
						onAddManualRule({from: addMappingSource, preserveQuality, to: target});
						setAddMappingSource(undefined);
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
				className="transform-dialog transform-workbench transform-workbench--planner upgrade-planner-dialog"
				role="dialog"
				aria-modal="true"
				aria-labelledby={dialogHeadingId}
				onKeyDown={(event) => {
					if (event.key === 'Escape') {
						onClose();
					}
				}}
			>
				<header className="transform-dialog__header transform-workbench__header">
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
					<button
						type="button"
						className="transform-dialog__close"
						aria-label="Close Upgrade Planner"
						onClick={() => {
							onClose();
						}}
					>
						×
					</button>
				</header>

				<div
					className="transform-workbench__body upgrade-planner-dialog__scroll-region"
					role="region"
					aria-label="Upgrade Planner configuration"
					tabIndex={0}
				>
					<div className="upgrade-planner-dialog__content transform-workflow">
						<section
							className="panel-hole upgrade-planner-dialog__configuration"
							aria-labelledby={configurationHeadingId}
						>
							<header className="upgrade-planner-dialog__panel-heading">
								<h4 id={configurationHeadingId}>Upgrade mappings</h4>
								<span>One ordered From/To configuration</span>
							</header>
							<div className="panel-hole-inner transform-workflow__scope">
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
							</div>
							<UpgradeMappingsEditor {...mappings} />
						</section>

						<BookWideReplacements {...replacements} />
					</div>
				</div>

				<footer className="transform-workbench__footer transform-workbench__footer--actions">
					<button
						type="button"
						className="transform-button"
						onClick={() => {
							onClose();
						}}
					>
						Cancel
					</button>
					<ButtonGreen disabled={saveDisabled} onClick={onSave}>
						Save planner
					</ButtonGreen>
				</footer>
			</section>
		</div>
	);
}
