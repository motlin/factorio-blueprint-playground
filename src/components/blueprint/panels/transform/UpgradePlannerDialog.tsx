import {useId, useState} from 'react';

import gameData from '../../../../generated/game-data.json';
import type {BlueprintString, SignalID, UpgradeSourceSignal} from '../../../../parsing/types';
import type {UpgradeCandidate, UpgradeRule} from '../../../../transform/upgradePlanner';
import {FactorioIcon} from '../../../core/icons/FactorioIcon';
import {ButtonGreen} from '../../../ui/ButtonGreen';
import {Textarea} from '../../../ui/Textarea';
import {SignalPickerDialog} from './SignalPickerDialog';
import {signalIdentity, signalName, signalTitle} from './upgradePlannerSignals';
import {UpgradePlannerSelectorDialog, type UpgradePlannerChoice} from './UpgradePlannerSelectorDialog';

interface SignalSlotProps {
	label: string;
	onClick?: () => void;
	onContextMenu?: () => void;
	signal?: SignalID;
}

interface MappingSourceDraft {
	candidate?: UpgradeCandidate;
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

interface UpgradePlannerReplacements {
	iconMappingCount: number;
	iconReplacementCount: number;
	metadataFind: string;
	metadataReplace: string;
	metadataReplacementCount: number;
	onIconReplacementsOpen: () => void;
	onMetadataFindChange: (value: string) => void;
	onMetadataReplaceChange: (value: string) => void;
	onTextReplacementEnabledChange: (enabled: boolean) => void;
	textReplacementEnabled: boolean;
}

interface UpgradePlannerDialogProps {
	applyDisabled: boolean;
	breadcrumb: string;
	canChooseRootScope: boolean;
	mappings: UpgradePlannerMappings;
	matchCount: number;
	onApplyDowngrades: () => void;
	onApplyUpgrades: () => void;
	onClose: () => void;
	onScopeChange: (scope: 'selection' | 'root') => void;
	replacements: UpgradePlannerReplacements;
	scope: 'selection' | 'root';
	selectionScopeDisabled: boolean;
	selectionScopeLabel: string;
}

function upgradeTargetOptions(source: SignalID, currentTarget: SignalID): SignalID[] {
	const adjacent = new Map<string, Set<string>>();
	for (const {from, to} of gameData.nextUpgrades) {
		const fromTargets = adjacent.get(from) ?? new Set<string>();
		fromTargets.add(to);
		adjacent.set(from, fromTargets);
		const toTargets = adjacent.get(to) ?? new Set<string>();
		toTargets.add(from);
		adjacent.set(to, toTargets);
	}
	const visited = new Set([source.name]);
	const pending = [source.name];
	while (pending.length > 0) {
		const current = pending.shift();
		if (current === undefined) {
			break;
		}
		for (const candidate of adjacent.get(current) ?? []) {
			if (!visited.has(candidate)) {
				visited.add(candidate);
				pending.push(candidate);
			}
		}
	}
	visited.add(currentTarget.name);
	return [...visited].map((name) => ({...currentTarget, name}));
}

export function SignalSlot({label, onClick, onContextMenu, signal}: SignalSlotProps) {
	return (
		<button
			type="button"
			className={`transform-signal-slot${signal === undefined ? ' transform-signal-slot--empty' : ''}`}
			aria-label={label}
			aria-disabled={onClick === undefined}
			title={signal === undefined ? label : signalTitle(signal)}
			onClick={() => {
				onClick?.();
			}}
			onContextMenu={(event) => {
				if (onContextMenu !== undefined) {
					event.preventDefault();
					onContextMenu();
				}
			}}
		>
			{signal === undefined ? <span aria-hidden="true">+</span> : <FactorioIcon icon={signal} size="large" />}
		</button>
	);
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
	const [sourcePickerCandidate, setSourcePickerCandidate] = useState<UpgradeCandidate | null>();
	const [mappingSourceDraft, setMappingSourceDraft] = useState<MappingSourceDraft>();
	const manualSourceKeys = new Set(manualRules.map((rule) => signalIdentity(rule.from)));
	const visibleCandidates = candidates.filter((candidate) => !excludedSources.has(signalIdentity(candidate.from)));

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
				<div className="upgrade-planner-editor__mappings" role="group" aria-label="From and To mappings">
					{visibleCandidates.length === 0 && error === undefined ? (
						<p className="upgrade-planner-editor__empty">No matching entities or modules in this scope.</p>
					) : (
						<>
							<div className="upgrade-planner-editor__mapping-headings" aria-hidden="true">
								<span>From</span>
								<span />
								<span>To</span>
								<span>Matches</span>
								<span />
							</div>
							{visibleCandidates.map((candidate) => {
								const sourceKey = signalIdentity(candidate.from);
								const manual = manualSourceKeys.has(sourceKey);
								return (
									<div key={sourceKey} className="upgrade-planner-editor__mapping">
										<SignalSlot
											label={`Choose source, currently ${signalName(candidate.from)}`}
											signal={candidate.from}
											onClick={() => {
												setSourcePickerCandidate(candidate);
											}}
										/>
										<span className="upgrade-planner-editor__arrow" aria-hidden="true">
											→
										</span>
										<SignalSlot
											label={`Choose target for ${signalName(candidate.from)}`}
											signal={candidate.to}
											onClick={() => {
												setTargetPickerCandidate(candidate);
											}}
										/>
										<strong>{candidate.count}</strong>
										<button
											type="button"
											className="upgrade-planner-editor__remove"
											aria-label={`Remove mapping from ${signalName(candidate.from)}`}
											onClick={() => {
												onRemoveRule(candidate.from, manual);
											}}
										>
											×
										</button>
									</div>
								);
							})}
						</>
					)}
				</div>
				<button
					type="button"
					className="upgrade-planner-editor__add"
					onClick={() => {
						setSourcePickerCandidate(null);
					}}
				>
					+ Add mapping
				</button>
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
					initialSignal={sourcePickerCandidate?.from}
					title="Choose mapping source"
					options={[
						...new Map(
							[
								...sourceOptions,
								...(sourcePickerCandidate === null ? [] : [sourcePickerCandidate.from]),
							].map((signal) => [signalIdentity(signal), signal]),
						).values(),
					]}
					qualityMode="source"
					onClose={() => {
						setSourcePickerCandidate(undefined);
					}}
					onChoose={(sourceSignal) => {
						setMappingSourceDraft({candidate: sourcePickerCandidate ?? undefined, source: sourceSignal});
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
					onClose={() => {
						setMappingSourceDraft(undefined);
					}}
					onChoose={(target, preserveQuality = false) => {
						const rule = {from: mappingSourceDraft.source, preserveQuality, to: target};
						if (mappingSourceDraft.candidate === undefined) {
							onAddManualRule(rule);
						} else {
							onChangeManualRule(mappingSourceDraft.candidate.from, rule);
						}
						setMappingSourceDraft(undefined);
					}}
				/>
			)}
		</>
	);
}

export function UpgradePlannerDialog({
	applyDisabled,
	breadcrumb,
	canChooseRootScope,
	mappings,
	matchCount,
	onApplyDowngrades,
	onApplyUpgrades,
	onClose,
	onScopeChange,
	replacements,
	scope,
	selectionScopeDisabled,
	selectionScopeLabel,
}: UpgradePlannerDialogProps) {
	const dialogHeadingId = useId();
	const configurationHeadingId = useId();
	const replacementsHeadingId = useId();

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

						<section
							className="panel-hole transform-workflow__section transform-workflow__website-replacements"
							aria-labelledby={replacementsHeadingId}
						>
							<div className="transform-workflow__website-label">Website extension</div>
							<h4 id={replacementsHeadingId}>Book-wide replacements</h4>
							<p className="transform-workflow__scope-note">
								Applies to titles, descriptions, and label icons throughout the entire book.
							</p>
							<div className="transform-workflow__operations">
								<button
									type="button"
									className="transform-operation"
									onClick={() => {
										replacements.onIconReplacementsOpen();
									}}
								>
									<span className="transform-operation__icon">
										<span aria-hidden="true">+</span>
									</span>
									<span className="transform-operation__text">
										<strong>Icon replacements</strong>
										<small>
											{replacements.iconMappingCount}{' '}
											{replacements.iconMappingCount === 1 ? 'mapping' : 'mappings'} ·{' '}
											{replacements.iconReplacementCount}{' '}
											{replacements.iconReplacementCount === 1 ? 'replacement' : 'replacements'}
										</small>
									</span>
									<span>Edit…</span>
								</button>
							</div>

							<div className="transform-workflow__text">
								<label className="transform-workflow__text-toggle">
									<input
										type="checkbox"
										checked={replacements.textReplacementEnabled}
										onChange={(event) => {
											replacements.onTextReplacementEnabledChange(event.currentTarget.checked);
										}}
									/>{' '}
									Text replacement <strong>{replacements.metadataReplacementCount}</strong>
								</label>
								<div>
									<label htmlFor="metadata-find">Find</label>
									<input
										id="metadata-find"
										type="text"
										value={replacements.metadataFind}
										onChange={(event) => {
											replacements.onMetadataFindChange(event.currentTarget.value);
										}}
									/>
									<span aria-hidden="true">→</span>
									<label htmlFor="metadata-replace">Replace with</label>
									<input
										id="metadata-replace"
										type="text"
										value={replacements.metadataReplace}
										onChange={(event) => {
											replacements.onMetadataReplaceChange(event.currentTarget.value);
										}}
									/>
								</div>
							</div>
						</section>
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
					<div className="transform-workbench__apply-actions">
						<button
							type="button"
							className="transform-button"
							disabled={applyDisabled}
							onClick={() => {
								onApplyDowngrades();
							}}
						>
							Apply downgrades
						</button>
						<ButtonGreen
							disabled={applyDisabled}
							onClick={() => {
								onApplyUpgrades();
							}}
						>
							Apply upgrades
						</ButtonGreen>
					</div>
				</footer>
			</section>
		</div>
	);
}
