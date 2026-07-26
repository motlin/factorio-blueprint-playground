import {useNavigate} from '@tanstack/react-router';
import {useMemo, useState} from 'react';

import {BlueprintWrapper} from '../../../../parsing/BlueprintWrapper';
import {serializeBlueprint} from '../../../../parsing/blueprintParser';
import type {BlueprintString, SignalID} from '../../../../parsing/types';
import {db, LIBRARY_ROOT_ID} from '../../../../storage/db';
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
import {FactorioButton, FactorioButtonKind} from '../../../ui/FactorioUi';
import {BlueprintEditorDialog} from './BlueprintEditorDialog';
import {BlueprintLabelIcons} from './BlueprintLabelIcons';
import {BlueprintToolbelt} from './BlueprintToolbelt';
import {IconReplacementDialog} from './IconReplacementDialog';
import {SignalPickerDialog} from './SignalPickerDialog';
import {UpgradePlannerDialog} from './UpgradePlannerDialog';
import {pickerSignals, signalIdentity, signalTitle} from './upgradePlannerSignals';
import {useBlueprintEditorDraft} from './useBlueprintEditorDraft';
import type {UpgradePlannerChoice} from './UpgradePlannerSelectorDialog';
import {useUpgradePlannerDraft} from './useUpgradePlannerDraft';

interface TransformPanelProps {
	blueprint?: BlueprintString;
	rootBlueprint?: BlueprintString;
	selectedPath?: string;
}

export function TransformPanel({blueprint, rootBlueprint = blueprint, selectedPath = ''}: TransformPanelProps) {
	const navigate = useNavigate();
	const upgradeDraft = useUpgradePlannerDraft({blueprint, rootBlueprint, selectedPath});
	const [plannerSavePromptOpen, setPlannerSavePromptOpen] = useState(false);
	const [plannerSavePending, setPlannerSavePending] = useState(false);
	const [plannerSaveMode, setPlannerSaveMode] = useState<'new' | 'updated'>();
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
	const savePlannerAsNewLibraryRecord = async (label: string) => {
		setPlannerSavePending(true);
		try {
			const siblings = await db.listLibraryChildren(LIBRARY_ROOT_ID);
			const record = await db.saveLibraryCopy({
				...upgradeDraft.libraryRecordContent(label),
				destination: {
					parentId: LIBRARY_ROOT_ID,
					position: siblings.reduce((next, record) => Math.max(next, record.position + 1), 0),
				},
			});
			upgradeDraft.onLibraryRecordSaved(record);
			setPlannerSaveMode('new');
			setPlannerSavePromptOpen(false);
		} finally {
			setPlannerSavePending(false);
		}
	};
	const updateExistingPlannerLibraryRecord = async (label: string) => {
		if (upgradeDraft.libraryRecordId === undefined) {
			throw new Error('No existing Blueprint Library planner is loaded.');
		}
		setPlannerSavePending(true);
		try {
			const record = await db.updateLibraryRecord({
				id: upgradeDraft.libraryRecordId,
				content: upgradeDraft.libraryRecordContent(label),
			});
			upgradeDraft.onLibraryRecordSaved(record);
			setPlannerSaveMode('updated');
			setPlannerSavePromptOpen(false);
		} finally {
			setPlannerSavePending(false);
		}
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
					onApply={(direction) => {
						commitBlueprint(upgradeDraft.applyDraftPlanner(rootBlueprint ?? blueprint, direction));
					}}
					onClose={upgradeDraft.requestClosePlanner}
					onScopeChange={upgradeDraft.onScopeChange}
					replacements={upgradeDraft.replacements}
					saveDisabled={upgradeDraft.saveDisabled}
					savePrompt={{
						initialLabel:
							upgradeDraft.mappings.source === 'custom'
								? 'Empty Planner'
								: upgradeDraft.mappings.source === 'pasted'
									? 'Pasted Upgrade Planner'
									: upgradeDraft.mappings.sourceLabel,
						onCancel: () => {
							setPlannerSavePromptOpen(false);
						},
						onOpen: () => {
							setPlannerSavePromptOpen(true);
						},
						onSaveAsNew: (label) => {
							void savePlannerAsNewLibraryRecord(label);
						},
						onUpdateExisting:
							upgradeDraft.libraryRecordId === undefined
								? undefined
								: (label) => {
										void updateExistingPlannerLibraryRecord(label);
									},
						open: plannerSavePromptOpen,
						pending: plannerSavePending,
					}}
					savedLibraryMessage={
						upgradeDraft.savedLibraryRecord === undefined || plannerSaveMode === undefined
							? undefined
							: `${plannerSaveMode === 'new' ? 'Saved' : 'Updated'} “${
									upgradeDraft.savedLibraryRecord.gameData.label ?? 'Untitled upgrade planner'
								}” ${
									plannerSaveMode === 'new'
										? 'in Blueprint Library › Root shelf.'
										: 'in its Blueprint Library destination.'
								}`
					}
					scope={upgradeDraft.scope}
					selectionScopeDisabled={type === 'upgrade-planner'}
					selectionScopeLabel={canChooseRootScope ? 'This selection' : 'This blueprint or book'}
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
						className="factorio-frame factorio-frame--shallow transform-dialog transform-dialog--confirmation"
						role="alertdialog"
						aria-modal="true"
						aria-labelledby="discard-transform-heading"
					>
						<header className="factorio-title-bar transform-dialog__header">
							<h3 id="discard-transform-heading">Discard unsaved changes?</h3>
						</header>
						<p>Your changes have not been written back to the loaded blueprint or book.</p>
						<div className="transform-dialog__actions">
							<FactorioButton className="transform-button" onClick={upgradeDraft.keepEditingPlanner}>
								Keep editing
							</FactorioButton>
							<FactorioButton
								kind={FactorioButtonKind.Delete}
								className="transform-button"
								onClick={upgradeDraft.discardPlanner}
							>
								Discard changes
							</FactorioButton>
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
