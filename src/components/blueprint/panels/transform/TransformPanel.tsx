import {useNavigate} from '@tanstack/react-router';
import {useId, useMemo, useState} from 'react';

import {BlueprintWrapper} from '../../../../parsing/BlueprintWrapper';
import {serializeBlueprint} from '../../../../parsing/blueprintParser';
import type {BlueprintString, SignalID} from '../../../../parsing/types';
import {db, LIBRARY_ROOT_ID} from '../../../../storage/db';
import {updateNestedBlueprint} from '../../../../transform/applyAtPath';
import {blueprintComponentRemovalKey, type BlueprintComponentIdentity} from '../../../../transform/componentRemoval';
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
import {chatIconPickerOptions, signalTitle} from './upgradePlannerSignals';
import {BlueprintEditorSourceMode, useBlueprintEditorDraft} from './useBlueprintEditorDraft';
import {useDialogFocus} from './useDialogFocus';
import type {UpgradePlannerChoice} from './UpgradePlannerSelectorDialog';
import {useUpgradePlannerDraft} from './useUpgradePlannerDraft';

interface TransformPanelProps {
	blueprint?: BlueprintString;
	blueprintEditorSourceMode?: BlueprintEditorSourceMode;
	capturedOnSpacePlatform?: boolean;
	onBlueprintCommit?: (committedRoot: BlueprintString) => void;
	rootBlueprint?: BlueprintString;
	selectedPath?: string;
}

function UpgradePlannerDiscardConfirmation({
	onDiscard,
	onKeepEditing,
}: {
	onDiscard: () => void;
	onKeepEditing: () => void;
}) {
	const headingId = useId();
	const confirmationReference = useDialogFocus<HTMLElement>({
		initialFocusSelector: '[data-dialog-initial-focus="true"]',
		onClose: onKeepEditing,
	});

	return (
		<div className="transform-dialog-backdrop transform-dialog-backdrop--confirmation">
			<section
				ref={confirmationReference}
				className="factorio-frame factorio-frame--shallow transform-dialog transform-dialog--confirmation"
				role="alertdialog"
				aria-modal="true"
				aria-labelledby={headingId}
			>
				<header className="factorio-title-bar transform-dialog__header">
					<h3 id={headingId}>Discard unsaved changes?</h3>
				</header>
				<p>Your changes have not been written back to the loaded blueprint or book.</p>
				<div className="transform-dialog__actions">
					<FactorioButton
						data-dialog-initial-focus="true"
						className="transform-button"
						onClick={onKeepEditing}
					>
						Keep editing
					</FactorioButton>
					<FactorioButton kind={FactorioButtonKind.Delete} className="transform-button" onClick={onDiscard}>
						Discard changes
					</FactorioButton>
				</div>
			</section>
		</div>
	);
}

export function TransformPanel({
	blueprint,
	blueprintEditorSourceMode = BlueprintEditorSourceMode.ExistingRecord,
	capturedOnSpacePlatform = false,
	onBlueprintCommit,
	rootBlueprint = blueprint,
	selectedPath = '',
}: TransformPanelProps) {
	const navigate = useNavigate();
	const upgradeDraft = useUpgradePlannerDraft({blueprint, rootBlueprint, selectedPath});
	const [plannerSavePromptOpen, setPlannerSavePromptOpen] = useState(false);
	const [plannerSavePending, setPlannerSavePending] = useState(false);
	const [plannerSaveMode, setPlannerSaveMode] = useState<'new' | 'updated'>();
	const {
		blueprintEditorOpen,
		closeConfirmationOpen: blueprintCloseConfirmationOpen,
		closeBlueprintEditor,
		commitBlueprintEditorDraft,
		discardBlueprintEditorDraft,
		editorCommitAction,
		editorCommitDisabled,
		editorContext,
		editorDescription,
		editorDirty,
		editorDraft,
		editorFilterAnalysis,
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
		setStripFuelSelected,
		setStripModulesSelected,
		setStripStationNamesSelected,
		setStripTilesSelected,
		setStripTrainsSelected,
		setStripVehiclesSelected,
		sortBookSelected,
		stripEntitiesSelected,
		stripFuelSelected,
		stripModulesSelected,
		stripStationNamesSelected,
		stripTilesSelected,
		stripTrainsSelected,
		stripVehiclesSelected,
	} = useBlueprintEditorDraft({
		blueprint,
		rootBlueprint,
		selectedPath,
		capturedOnSpacePlatform,
		sourceMode: blueprintEditorSourceMode,
	});

	const type = blueprint === undefined ? undefined : new BlueprintWrapper(blueprint).getType();
	const editorIconOptions = useMemo(
		() =>
			chatIconPickerOptions([
				...upgradeDraft.sourceOptions,
				...editorIcons.filter((icon): icon is SignalID => icon !== undefined),
			]),
		[editorIcons, upgradeDraft.sourceOptions],
	);
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
	const commitBlueprintEditor = () => {
		const committedRoot = commitBlueprintEditorDraft();
		upgradeDraft.closeIconReplacement();
		upgradeDraft.closePlanner();
		if (onBlueprintCommit === undefined) {
			commitBlueprint(committedRoot);
			return;
		}
		onBlueprintCommit(committedRoot);
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
	const savePlannerAsNewLibraryRecord = async () => {
		setPlannerSavePending(true);
		try {
			const siblings = await db.listLibraryChildren(LIBRARY_ROOT_ID);
			const record = await db.saveLibraryCopy({
				...upgradeDraft.libraryRecordContent(),
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
	const updateExistingPlannerLibraryRecord = async () => {
		if (upgradeDraft.libraryRecordId === undefined) {
			throw new Error('No existing Blueprint Library planner is loaded.');
		}
		setPlannerSavePending(true);
		try {
			const record = await db.updateLibraryRecord({
				id: upgradeDraft.libraryRecordId,
				content: upgradeDraft.libraryRecordContent(),
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
					recordMetadata={upgradeDraft.recordMetadata}
					saveDisabled={upgradeDraft.saveDisabled}
					savePrompt={{
						existingRecordName:
							upgradeDraft.savedLibraryRecord === undefined
								? undefined
								: (upgradeDraft.savedLibraryRecord.gameData.label ?? upgradeDraft.mappings.sourceLabel),
						label: upgradeDraft.recordMetadata.label.trim(),
						onCancel: () => {
							setPlannerSavePromptOpen(false);
						},
						onOpen: () => {
							setPlannerSavePromptOpen(true);
						},
						onSaveAsNew: () => {
							void savePlannerAsNewLibraryRecord();
						},
						onUpdateExisting:
							upgradeDraft.libraryRecordId === undefined
								? undefined
								: () => {
										void updateExistingPlannerLibraryRecord();
									},
						open: plannerSavePromptOpen,
						pending: plannerSavePending,
					}}
					savedRecordName={
						upgradeDraft.savedLibraryRecord === undefined
							? undefined
							: (upgradeDraft.savedLibraryRecord.gameData.label ?? upgradeDraft.mappings.sourceLabel)
					}
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
					commitAction={editorCommitAction}
					commitDisabled={editorCommitDisabled}
					context={editorContext}
					description={editorDescription}
					closeConfirmationOpen={blueprintCloseConfirmationOpen}
					filterAnalysis={editorFilterAnalysis}
					flattenBookSelected={flattenBookSelected}
					icons={
						<BlueprintLabelIcons
							icons={editorIcons}
							itemName={type === 'blueprint-book' ? 'blueprint-book' : 'blueprint'}
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
					onCommit={commitBlueprintEditor}
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
					onFuelIncludedChange={(included) => {
						setStripFuelSelected(!included);
					}}
					onFlattenBookSelectedChange={setFlattenBookSelected}
					onLabelChange={setEditorLabel}
					onKeepEditing={keepEditingBlueprint}
					onModulesIncludedChange={(included) => {
						setStripModulesSelected(!included);
					}}
					onStationNamesIncludedChange={(included) => {
						setStripStationNamesSelected(!included);
					}}
					onParametersChange={setEditorParameters}
					onApplyPlannerChoice={applyPlannerFromBlueprintEditor}
					onSnapGridChange={setEditorSnapGrid}
					onSortBookSelectedChange={setSortBookSelected}
					onTilesIncludedChange={(included) => {
						setStripTilesSelected(!included);
					}}
					onTrainsIncludedChange={(included) => {
						setStripTrainsSelected(!included);
					}}
					onVehiclesIncludedChange={(included) => {
						setStripVehiclesSelected(!included);
					}}
					parameters={editorParameters}
					plannerDropError={editorPlannerDropError}
					placedPlanner={editorPlacedPlanner}
					rootBlueprint={rootBlueprint ?? blueprint}
					removedComponents={removedEditorComponents}
					sessionPlanner={upgradeDraft.savedPlannerChoice}
					signalOptions={editorIconOptions}
					snapGrid={editorSnapGrid}
					sortBookSelected={sortBookSelected}
					stripEntitiesSelected={stripEntitiesSelected}
					stripFuelSelected={stripFuelSelected}
					stripModulesSelected={stripModulesSelected}
					stripStationNamesSelected={stripStationNamesSelected}
					stripTilesSelected={stripTilesSelected}
					stripTrainsSelected={stripTrainsSelected}
					stripVehiclesSelected={stripVehiclesSelected}
				/>
			) : null}
			{upgradeDraft.discardConfirmationOpen ? (
				<UpgradePlannerDiscardConfirmation
					onDiscard={upgradeDraft.discardPlanner}
					onKeepEditing={upgradeDraft.keepEditingPlanner}
				/>
			) : null}
			{editorIconPickerIndex === undefined ? null : (
				<SignalPickerDialog
					confirmationMode="required"
					initialSignal={editorIcons[editorIconPickerIndex]}
					title={`Choose label icon ${(editorIconPickerIndex + 1).toString()}`}
					options={editorIconOptions}
					onClose={() => {
						setEditorIconPickerIndex(undefined);
					}}
					onChoose={(signal) => {
						setEditorIcons((current) => {
							const next = [...current];
							next[editorIconPickerIndex] = signal;
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
