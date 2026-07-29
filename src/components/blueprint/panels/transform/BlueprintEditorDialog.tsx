import {type ReactNode, useId, useState} from 'react';

import type {BlueprintString, Parameter, SignalID} from '../../../../parsing/types';
import type {BlueprintSnapGrid} from '../../../../transform/blueprintEditor';
import type {BlueprintComponentIdentity, BlueprintComponentRemovalKey} from '../../../../transform/componentRemoval';
import type {BlueprintFilterAnalysis} from '../../../../transform/strip';
import type {UpgradeDirection} from '../../../../transform/upgradePlanner';
import {FactorioButton, FactorioButtonKind} from '../../../ui/FactorioUi';
import {BlueprintComponentsGrid} from './BlueprintComponentsGrid';
import {BlueprintContentFilters} from './BlueprintContentFilters';
import {BlueprintDescriptionEditor} from './BlueprintDescriptionEditor';
import {BlueprintEditorActions} from './BlueprintEditorActions';
import {BlueprintEditorToolbar, type PlacedUpgradePlanner} from './BlueprintEditorToolbar';
import {BlueprintParameterizationDialog} from './BlueprintParameterizationDialog';
import {BlueprintSnapGridEditor} from './BlueprintSnapGridEditor';
import {BlueprintTitleEditor} from './BlueprintTitleEditor';
import {UpgradePlannerSelectorDialog, type UpgradePlannerChoice} from './UpgradePlannerSelectorDialog';
import type {BlueprintEditorCommitAction} from './useBlueprintEditorDraft';
import {useDialogFocus} from './useDialogFocus';

/**
 * Factorio 2.1.12 source contract for the editor shell:
 *
 * - `BlueprintEditorCommitAction` carries explicit captured-draft, existing-record,
 *   or child-book state into the confirm caption. Empty titles remain valid in
 *   every mode and do not decide the action.
 * - `BlueprintTitleEditor`, `BlueprintDescriptionEditor`, and
 *   `BlueprintLabelIcons` own the label fields shown in BE-1. Four icon slots are
 *   edited independently; the signal chooser follows BE-6.
 * - `BlueprintSnapGridEditor` owns the enabled state, positive grid size,
 *   absolute/relative choice, and absolute offset. Disabling snapping removes its
 *   persisted fields.
 * - `BlueprintComponentsGrid` owns the BE-7 inventory: secondary activation
 *   removes a component type and primary activation restores it.
 * - `BlueprintContentFilters` owns the BE-8 options. Module, station-name, and
 *   fuel filters appear when relevant. Entity, tile, train, and vehicle filters
 *   appear when more than one structural category is present.
 * - `BlueprintParameterizationDialog` is the local BE-5 child editor for parameter
 *   name, value signal, enabled state, and dependency. Its confirmation updates
 *   the parent draft only.
 * - BE-1's rendered blueprint is evidence for Factorio's renderer, which this
 *   application does not have. The shell must not substitute a metadata pane or a
 *   fabricated preview.
 *
 * Evidence: BlueprintSetupGui, BlueprintSettingsGui,
 * BlueprintRecordPreviewEdit, and BlueprintLabelEdit.
 */
interface BlueprintEditorDialogProps {
	blueprint: BlueprintString;
	book: boolean;
	bookOperationSelected: boolean;
	breadcrumb: string;
	closeConfirmationOpen: boolean;
	commitAction: BlueprintEditorCommitAction;
	commitDisabled: boolean;
	description: string;
	filterAnalysis: BlueprintFilterAnalysis;
	flattenBookSelected: boolean;
	icons: ReactNode;
	label: string;
	onApplyPlacedPlanner: (direction: UpgradeDirection) => void;
	onClose: () => void;
	onClearPlacedPlanner: () => void;
	onCommit: () => void;
	onComponentRemovedChange: (component: BlueprintComponentIdentity, removed: boolean) => void;
	onDescriptionChange: (description: string) => void;
	onDiscard: () => void;
	onDropPlanner: (serializedPlanner: string) => void;
	onEntitiesIncludedChange: (included: boolean) => void;
	onFuelIncludedChange: (included: boolean) => void;
	onFlattenBookSelectedChange: (selected: boolean) => void;
	onLabelChange: (label: string) => void;
	onKeepEditing: () => void;
	onModulesIncludedChange: (included: boolean) => void;
	onStationNamesIncludedChange: (included: boolean) => void;
	onParametersChange: (parameters: Parameter[]) => void;
	onApplyPlannerChoice: (choice: UpgradePlannerChoice, direction: UpgradeDirection) => void;
	onSnapGridChange: (settings: BlueprintSnapGrid) => void;
	onSortBookSelectedChange: (selected: boolean) => void;
	onTilesIncludedChange: (included: boolean) => void;
	onTrainsIncludedChange: (included: boolean) => void;
	onVehiclesIncludedChange: (included: boolean) => void;
	parameters: readonly Parameter[];
	plannerDropError: string | undefined;
	placedPlanner: PlacedUpgradePlanner | undefined;
	rootBlueprint: BlueprintString;
	removedComponents: ReadonlySet<BlueprintComponentRemovalKey>;
	sessionPlanner?: UpgradePlannerChoice;
	signalOptions: readonly SignalID[];
	snapGrid: BlueprintSnapGrid | undefined;
	sortBookSelected: boolean;
	stripEntitiesSelected: boolean;
	stripFuelSelected: boolean;
	stripModulesSelected: boolean;
	stripStationNamesSelected: boolean;
	stripTilesSelected: boolean;
	stripTrainsSelected: boolean;
	stripVehiclesSelected: boolean;
}

export function BlueprintEditorDialog({
	blueprint,
	book,
	bookOperationSelected,
	breadcrumb,
	closeConfirmationOpen,
	commitAction,
	commitDisabled,
	description,
	filterAnalysis,
	flattenBookSelected,
	icons,
	label,
	onApplyPlacedPlanner,
	onClose,
	onClearPlacedPlanner,
	onCommit,
	onComponentRemovedChange,
	onDescriptionChange,
	onDiscard,
	onDropPlanner,
	onEntitiesIncludedChange,
	onFuelIncludedChange,
	onFlattenBookSelectedChange,
	onLabelChange,
	onKeepEditing,
	onModulesIncludedChange,
	onStationNamesIncludedChange,
	onParametersChange,
	onApplyPlannerChoice,
	onSnapGridChange,
	onSortBookSelectedChange,
	onTilesIncludedChange,
	onTrainsIncludedChange,
	onVehiclesIncludedChange,
	parameters,
	plannerDropError,
	placedPlanner,
	rootBlueprint,
	removedComponents,
	sessionPlanner,
	signalOptions,
	snapGrid,
	sortBookSelected,
	stripEntitiesSelected,
	stripFuelSelected,
	stripModulesSelected,
	stripStationNamesSelected,
	stripTilesSelected,
	stripTrainsSelected,
	stripVehiclesSelected,
}: BlueprintEditorDialogProps) {
	const [upgradePlannerSelectorOpen, setUpgradePlannerSelectorOpen] = useState(false);
	const [parameterizationOpen, setParameterizationOpen] = useState(false);
	const upgradePlannerSelectorId = useId();
	const parameterizationDialogId = useId();
	const dialogReference = useDialogFocus<HTMLElement>({
		initialFocusSelector: '.blueprint-editor__settings button',
		onClose,
	});

	return (
		<div className="transform-dialog-backdrop transform-workbench-backdrop blueprint-editor__backdrop">
			<section
				ref={dialogReference}
				className="factorio-frame factorio-frame--shallow transform-dialog transform-workbench transform-workbench--blueprint"
				data-factorio-source="BlueprintSetupGui::BlueprintSetupGui"
				role="dialog"
				aria-modal="true"
				aria-label="Blueprint Editor"
			>
				<header className="factorio-title-bar transform-dialog__header transform-workbench__header">
					<div className="transform-workbench__title">
						<div>
							<h3>
								{book
									? 'Blueprint book in the blueprint library'
									: 'Blueprint in the blueprint library'}
							</h3>
							<span>{breadcrumb}</span>
						</div>
					</div>
					<FactorioButton
						kind={FactorioButtonKind.Close}
						className="transform-dialog__close"
						aria-label="Close Blueprint Editor"
						title="Close Blueprint Editor"
						onClick={onClose}
					/>
				</header>

				<div
					className="transform-workbench__body blueprint-editor__layout"
					data-factorio-source="BlueprintSetupGui::insetFrameContainerHorizontalFlow"
				>
					<div
						className="panel-hole transform-workflow blueprint-editor__settings"
						data-factorio-source="BlueprintSettingsGui::BlueprintSettingsGui"
						role="region"
						aria-label="Blueprint settings"
					>
						<div className="panel-hole-inner blueprint-editor__title-row">
							<BlueprintTitleEditor label={label} onLabelChange={onLabelChange} />
							<BlueprintEditorToolbar
								dropError={plannerDropError}
								onApplyPlacedPlanner={onApplyPlacedPlanner}
								onClearPlacedPlanner={onClearPlacedPlanner}
								onDropPlanner={onDropPlanner}
								onOpenParameterization={() => {
									setParameterizationOpen(true);
								}}
								onOpenUpgradePlannerSelector={() => {
									setUpgradePlannerSelectorOpen(true);
								}}
								parameterizationAvailable={blueprint.blueprint !== undefined}
								parameterizationDialogId={parameterizationDialogId}
								parameterizationOpen={parameterizationOpen}
								placedPlanner={placedPlanner}
								selectorDialogId={upgradePlannerSelectorId}
								selectorOpen={upgradePlannerSelectorOpen}
							/>
						</div>

						<div
							className="blueprint-editor__settings-scroll"
							data-factorio-style="scroll_pane_under_subheader"
						>
							<section
								className="transform-workflow__section blueprint-editor__icons"
								aria-labelledby="blueprint-editor-icons-heading"
							>
								<h4 id="blueprint-editor-icons-heading">Icon</h4>
								<div>{icons}</div>
								<small>Left-click or press Enter to edit. Right-click or press Delete to remove.</small>
							</section>

							<BlueprintDescriptionEditor
								description={description}
								onDescriptionChange={onDescriptionChange}
							/>

							{snapGrid === undefined ? null : (
								<BlueprintSnapGridEditor settings={snapGrid} onChange={onSnapGridChange} />
							)}

							<BlueprintComponentsGrid
								blueprint={blueprint}
								onComponentRemovedChange={onComponentRemovedChange}
								removedComponents={removedComponents}
							/>

							<BlueprintContentFilters
								analysis={filterAnalysis}
								entitiesIncluded={!stripEntitiesSelected}
								fuelIncluded={!stripFuelSelected}
								modulesIncluded={!stripModulesSelected}
								onEntitiesIncludedChange={onEntitiesIncludedChange}
								onFuelIncludedChange={onFuelIncludedChange}
								onModulesIncludedChange={onModulesIncludedChange}
								onStationNamesIncludedChange={onStationNamesIncludedChange}
								onTilesIncludedChange={onTilesIncludedChange}
								onTrainsIncludedChange={onTrainsIncludedChange}
								onVehiclesIncludedChange={onVehiclesIncludedChange}
								stationNamesIncluded={!stripStationNamesSelected}
								tilesIncluded={!stripTilesSelected}
								trainsIncluded={!stripTrainsSelected}
								vehiclesIncluded={!stripVehiclesSelected}
							/>

							{book ? (
								<section
									className="transform-workflow__section"
									aria-labelledby="transform-book-operations-heading"
								>
									<h4 id="transform-book-operations-heading">
										Book operations{bookOperationSelected ? ' · selected' : ''}
									</h4>
									<div className="transform-workflow__checks">
										<label>
											<input
												type="checkbox"
												checked={flattenBookSelected}
												onChange={(event) => {
													onFlattenBookSelectedChange(event.currentTarget.checked);
												}}
											/>{' '}
											Flatten nested books
										</label>
										<label>
											<input
												type="checkbox"
												checked={sortBookSelected}
												onChange={(event) => {
													onSortBookSelectedChange(event.currentTarget.checked);
												}}
											/>{' '}
											Sort entries by label
										</label>
									</div>
								</section>
							) : null}
						</div>
					</div>
				</div>

				<BlueprintEditorActions
					closeConfirmationOpen={closeConfirmationOpen}
					commitAction={commitAction}
					commitDisabled={commitDisabled}
					onClose={onClose}
					onCommit={onCommit}
					onDiscard={onDiscard}
					onKeepEditing={onKeepEditing}
				/>
			</section>
			{upgradePlannerSelectorOpen ? (
				<UpgradePlannerSelectorDialog
					dialogId={upgradePlannerSelectorId}
					includeEditingChoices={false}
					rootBlueprint={rootBlueprint}
					selectedSource={placedPlanner?.choice.source ?? ''}
					sessionChoice={sessionPlanner}
					onClose={() => {
						setUpgradePlannerSelectorOpen(false);
					}}
					onChoose={(choice, direction) => {
						onApplyPlannerChoice(choice, direction);
					}}
				/>
			) : null}
			{parameterizationOpen ? (
				<BlueprintParameterizationDialog
					dialogId={parameterizationDialogId}
					onClose={() => {
						setParameterizationOpen(false);
					}}
					onConfirm={(nextParameters) => {
						onParametersChange(nextParameters);
						setParameterizationOpen(false);
					}}
					parameters={parameters}
					signalOptions={signalOptions}
				/>
			) : null}
		</div>
	);
}
