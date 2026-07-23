import {useNavigate} from '@tanstack/react-router';
import {useId, useMemo} from 'react';

import {BlueprintWrapper} from '../../../../parsing/BlueprintWrapper';
import {serializeBlueprint} from '../../../../parsing/blueprintParser';
import type {BlueprintString, SignalID} from '../../../../parsing/types';
import {updateNestedBlueprint} from '../../../../transform/applyAtPath';
import {blueprintComponentRemovalKey, type BlueprintComponentIdentity} from '../../../../transform/componentRemoval';
import {blueprintFilterCategories} from '../../../../transform/strip';
import {
	applyUpgradeRules,
	builtInUpgradeRules,
	parseUpgradePlanner,
	rulesFromUpgradePlanner,
	type UpgradeDirection,
} from '../../../../transform/upgradePlanner';
import {BlueprintEditorDialog} from './BlueprintEditorDialog';
import {BlueprintLabelIcons} from './BlueprintLabelIcons';
import {BlueprintToolbelt} from './BlueprintToolbelt';
import {IconReplacementDialog} from './IconReplacementDialog';
import {SignalPickerDialog} from './SignalPickerDialog';
import {UpgradePlannerDialog} from './UpgradePlannerDialog';
import {pickerSignals, signalIdentity, signalTitle} from './upgradePlannerSignals';
import {useBlueprintEditorDraft} from './useBlueprintEditorDraft';
import {UpgradePlannerSelectorDialog, type UpgradePlannerChoice} from './UpgradePlannerSelectorDialog';
import {useUpgradePlannerDraft} from './useUpgradePlannerDraft';

interface TransformPanelProps {
	blueprint?: BlueprintString;
	rootBlueprint?: BlueprintString;
	selectedPath?: string;
}

export function TransformPanel({blueprint, rootBlueprint = blueprint, selectedPath = ''}: TransformPanelProps) {
	const navigate = useNavigate();
	const applicationSelectorId = useId();
	const upgradeDraft = useUpgradePlannerDraft({blueprint, rootBlueprint, selectedPath});
	const {
		blueprintEditorOpen,
		closeConfirmationOpen: blueprintCloseConfirmationOpen,
		closeBlueprintEditor,
		discardBlueprintEditorDraft,
		editorDescription,
		editorDirty,
		editorDraft,
		editorIconPickerIndex,
		editorIcons,
		editorLabel,
		editorParameters,
		editorPlacedPlanner,
		editorPlannerDropError,
		editorSnapGrid,
		flattenBookSelected,
		keepEditingBlueprint,
		openBlueprintEditor: openBlueprintEditorDraft,
		removedEditorComponents,
		requestCloseBlueprintEditor,
		setEditorDescription,
		setEditorIconPickerIndex,
		setEditorIcons,
		setEditorLabel,
		setEditorParameters,
		setEditorPlacedPlanner,
		setEditorPlannerDropError,
		setEditorSnapGrid,
		setFlattenBookSelected,
		setRemovedEditorComponents,
		setSortBookSelected,
		setStripEntitiesSelected,
		setStripModulesSelected,
		setStripTilesSelected,
		setStripTrainsSelected,
		sortBookSelected,
		stripEntitiesSelected,
		stripModulesSelected,
		stripTilesSelected,
		stripTrainsSelected,
	} = useBlueprintEditorDraft({blueprint, rootBlueprint, selectedPath});

	const type = blueprint === undefined ? undefined : new BlueprintWrapper(blueprint).getType();
	const editorIconOptions = useMemo(() => {
		const options = new Map<string, SignalID>();
		for (const signal of [...pickerSignals, ...upgradeDraft.sourceOptions, ...editorIcons]) {
			options.set(signalIdentity(signal), signal);
		}
		return [...options.values()];
	}, [editorIcons, upgradeDraft.sourceOptions]);
	const editorFilters = useMemo(() => blueprintFilterCategories(blueprint ?? {}), [blueprint]);
	const editorDraftBlueprint = editorDraft.rootBlueprint;
	if (blueprint === undefined || type === 'deconstruction-planner') {
		return null;
	}
	const canChooseRootScope = rootBlueprint?.blueprint_book !== undefined && selectedPath !== '';
	const hasSelectedBookOperation = flattenBookSelected || sortBookSelected;
	const rootLabel =
		rootBlueprint === undefined
			? 'blueprint'
			: (new BlueprintWrapper(rootBlueprint).getLabel() ?? 'Blueprint book');
	const selectedLabel = new BlueprintWrapper(blueprint).getLabel() ?? 'Untitled blueprint';
	const editorBreadcrumb = selectedPath === '' ? selectedLabel : `${rootLabel} › ${selectedLabel}`;
	const openBlueprintEditor = () => {
		upgradeDraft.closePlanner();
		openBlueprintEditorDraft();
	};
	const openUpgradePlanner = () => {
		if (blueprintEditorOpen && editorDirty) {
			requestCloseBlueprintEditor();
			return;
		}
		closeBlueprintEditor();
		upgradeDraft.openPlanner();
	};
	const commitBlueprint = (committedBlueprint: BlueprintString) => {
		closeBlueprintEditor();
		upgradeDraft.closeApplicationSelector();
		upgradeDraft.closeIconReplacement();
		upgradeDraft.closePlanner();
		void navigate({
			to: '/',
			search: {
				pasted: serializeBlueprint(committedBlueprint),
				selection: selectedPath,
			},
		});
	};
	const applyPlannerChoice = (
		choice: UpgradePlannerChoice,
		direction: UpgradeDirection,
		targetRoot: BlueprintString,
	) => {
		if (choice.source === upgradeDraft.savedPlannerChoice?.source) {
			commitBlueprint(upgradeDraft.applySavedPlanner(targetRoot, direction));
			return;
		}
		const rules =
			choice.source === 'suggested'
				? builtInUpgradeRules(direction)
				: choice.planner === undefined
					? undefined
					: rulesFromUpgradePlanner(choice.planner, direction);
		if (rules === undefined) {
			throw new Error('The selected upgrade planner is unavailable.');
		}
		const transformedRoot = updateNestedBlueprint(targetRoot, selectedPath, (target) =>
			applyUpgradeRules(target, rules),
		);
		if (transformedRoot === null) {
			throw new Error('The selected blueprint no longer exists in the root book.');
		}
		commitBlueprint(transformedRoot);
	};
	const applyPlannerFromBlueprintEditor = (choice: UpgradePlannerChoice, direction: UpgradeDirection) => {
		if (editorDraftBlueprint === undefined) {
			throw new Error('Cannot apply an upgrade planner to an invalid blueprint draft.');
		}
		applyPlannerChoice(choice, direction, editorDraftBlueprint);
	};
	const placeDroppedPlanner = (serializedPlanner: string) => {
		try {
			const planner = parseUpgradePlanner(serializedPlanner);
			setEditorPlacedPlanner({
				choice: {
					label: planner.label ?? planner.settings.description ?? 'Dropped upgrade planner',
					planner,
					source: 'dropped',
				},
				direction: 'upgrade',
			});
			setEditorPlannerDropError(undefined);
		} catch {
			setEditorPlannerDropError('Drop an encoded or JSON upgrade planner.');
		}
	};

	return (
		<>
			<BlueprintToolbelt
				blueprintEditorAvailable={type !== 'upgrade-planner'}
				blueprintEditorOpen={blueprintEditorOpen}
				onOpenBlueprintEditor={openBlueprintEditor}
				onOpenUpgradePlanner={openUpgradePlanner}
				upgradePlannerOpen={upgradeDraft.plannerOpen}
			/>

			{upgradeDraft.plannerOpen ? (
				<UpgradePlannerDialog
					breadcrumb={editorBreadcrumb}
					canChooseRootScope={canChooseRootScope}
					mappings={{...upgradeDraft.mappings, rootBlueprint: rootBlueprint ?? blueprint}}
					matchCount={upgradeDraft.matchCount}
					onClose={upgradeDraft.requestClosePlanner}
					onSave={upgradeDraft.savePlanner}
					onScopeChange={upgradeDraft.onScopeChange}
					replacements={upgradeDraft.replacements}
					saveDisabled={upgradeDraft.saveDisabled}
					scope={upgradeDraft.scope}
					selectionScopeDisabled={type === 'upgrade-planner'}
					selectionScopeLabel={canChooseRootScope ? 'This selection' : 'This blueprint or book'}
				/>
			) : null}
			{upgradeDraft.applicationSelectorOpen && upgradeDraft.savedPlannerChoice !== undefined ? (
				<UpgradePlannerSelectorDialog
					dialogId={applicationSelectorId}
					includeEditingChoices={false}
					onChoose={(choice, direction) => {
						applyPlannerChoice(choice, direction, rootBlueprint ?? blueprint);
					}}
					onClose={upgradeDraft.closeApplicationSelector}
					rootBlueprint={rootBlueprint ?? blueprint}
					selectedSource={upgradeDraft.savedPlannerChoice.source}
					sessionChoice={upgradeDraft.savedPlannerChoice}
				/>
			) : null}
			{blueprintEditorOpen ? (
				<BlueprintEditorDialog
					blueprint={blueprint}
					book={type === 'blueprint-book'}
					bookOperationSelected={hasSelectedBookOperation}
					breadcrumb={editorBreadcrumb}
					description={editorDescription}
					dirty={editorDirty}
					draftBlueprint={editorDraft.selectedBlueprint}
					closeConfirmationOpen={blueprintCloseConfirmationOpen}
					filters={editorFilters}
					flattenBookSelected={flattenBookSelected}
					icons={
						<BlueprintLabelIcons
							icons={editorIcons}
							onChange={setEditorIcons}
							onChoose={setEditorIconPickerIndex}
							signalTitle={signalTitle}
						/>
					}
					label={editorLabel}
					onApplyPlacedPlanner={(direction) => {
						if (editorPlacedPlanner === undefined) {
							throw new Error('No upgrade planner is placed on the editor toolbar.');
						}
						applyPlannerFromBlueprintEditor(editorPlacedPlanner.choice, direction);
					}}
					onClose={requestCloseBlueprintEditor}
					onClearPlacedPlanner={() => {
						setEditorPlacedPlanner(undefined);
						setEditorPlannerDropError(undefined);
					}}
					onComponentRemovedChange={(component: BlueprintComponentIdentity, removed) => {
						setRemovedEditorComponents((current) => {
							const next = new Set(current);
							const key = blueprintComponentRemovalKey(component);
							if (removed) {
								next.add(key);
							} else {
								next.delete(key);
							}
							return next;
						});
					}}
					onDescriptionChange={setEditorDescription}
					onDiscard={discardBlueprintEditorDraft}
					onDropPlanner={placeDroppedPlanner}
					onEntitiesIncludedChange={(included) => {
						setStripEntitiesSelected(!included);
					}}
					onFlattenBookSelectedChange={setFlattenBookSelected}
					onLabelChange={setEditorLabel}
					onKeepEditing={keepEditingBlueprint}
					onModulesIncludedChange={(included) => {
						setStripModulesSelected(!included);
					}}
					onParametersChange={setEditorParameters}
					onPlannerPlace={(choice, direction) => {
						setEditorPlacedPlanner({choice, direction});
						setEditorPlannerDropError(undefined);
					}}
					onSaved={() => {
						closeBlueprintEditor();
						upgradeDraft.closeIconReplacement();
						upgradeDraft.closePlanner();
					}}
					onSnapGridChange={setEditorSnapGrid}
					onSortBookSelectedChange={setSortBookSelected}
					onTilesIncludedChange={(included) => {
						setStripTilesSelected(!included);
					}}
					onTrainsIncludedChange={(included) => {
						setStripTrainsSelected(!included);
					}}
					parameters={editorParameters}
					plannerDropError={editorPlannerDropError}
					placedPlanner={editorPlacedPlanner}
					rootBlueprint={rootBlueprint ?? blueprint}
					removedComponents={removedEditorComponents}
					selectedPath={selectedPath}
					sessionPlanner={upgradeDraft.savedPlannerChoice}
					signalOptions={editorIconOptions}
					snapGrid={editorSnapGrid}
					sortBookSelected={sortBookSelected}
					stripEntitiesSelected={stripEntitiesSelected}
					stripModulesSelected={stripModulesSelected}
					stripTilesSelected={stripTilesSelected}
					stripTrainsSelected={stripTrainsSelected}
				/>
			) : null}
			{upgradeDraft.discardConfirmationOpen ? (
				<div className="transform-dialog-backdrop transform-dialog-backdrop--confirmation">
					<section
						className="transform-dialog transform-dialog--confirmation"
						role="alertdialog"
						aria-modal="true"
						aria-labelledby="discard-transform-heading"
					>
						<header className="transform-dialog__header">
							<h3 id="discard-transform-heading">Discard unsaved changes?</h3>
						</header>
						<p>Your changes have not been written back to the loaded blueprint or book.</p>
						<div className="transform-dialog__actions">
							<button
								type="button"
								className="transform-button"
								onClick={upgradeDraft.keepEditingPlanner}
							>
								Keep editing
							</button>
							<button
								type="button"
								className="transform-button transform-button--danger"
								onClick={upgradeDraft.discardPlanner}
							>
								Discard changes
							</button>
						</div>
					</section>
				</div>
			) : null}
			{editorIconPickerIndex === undefined ? null : (
				<SignalPickerDialog
					initialSignal={editorIcons[editorIconPickerIndex]}
					title={`Choose label icon ${(editorIconPickerIndex + 1).toString()}`}
					options={editorIconOptions}
					onClose={() => {
						setEditorIconPickerIndex(undefined);
					}}
					onChoose={(signal) => {
						setEditorIcons((current) => {
							const next = [...current];
							next[Math.min(editorIconPickerIndex, current.length)] = signal;
							return next;
						});
						setEditorIconPickerIndex(undefined);
					}}
				/>
			)}
			{upgradeDraft.iconReplacementOpen ? (
				<IconReplacementDialog
					onChange={upgradeDraft.onIconReplacementsChange}
					onClose={upgradeDraft.closeIconReplacement}
					replacements={upgradeDraft.iconReplacements}
					rootBlueprint={rootBlueprint ?? blueprint}
				/>
			) : null}
		</>
	);
}
