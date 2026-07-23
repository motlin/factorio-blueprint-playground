import {type ReactNode, useId, useState} from 'react';

import type {BlueprintString, Parameter, SignalID} from '../../../../parsing/types';
import type {BlueprintSnapGrid} from '../../../../transform/blueprintEditor';
import type {BlueprintComponentIdentity, BlueprintComponentRemovalKey} from '../../../../transform/componentRemoval';
import type {BlueprintFilterCategories} from '../../../../transform/strip';
import type {UpgradeDirection} from '../../../../transform/upgradePlanner';
import {ButtonGreen} from '../../../ui/ButtonGreen';
import {BlueprintComponentsGrid} from './BlueprintComponentsGrid';
import {BlueprintContentFilters} from './BlueprintContentFilters';
import {BlueprintDescriptionEditor} from './BlueprintDescriptionEditor';
import {BlueprintEditorToolbar, type PlacedUpgradePlanner} from './BlueprintEditorToolbar';
import {BlueprintParameterizationDialog} from './BlueprintParameterizationDialog';
import {BlueprintSnapGridEditor} from './BlueprintSnapGridEditor';
import {BlueprintTitleEditor} from './BlueprintTitleEditor';
import {UpgradePlannerSelectorDialog, type UpgradePlannerChoice} from './UpgradePlannerSelectorDialog';

interface BlueprintEditorDialogProps {
	blueprint: BlueprintString;
	book: boolean;
	bookOperationSelected: boolean;
	breadcrumb: string;
	description: string;
	filters: BlueprintFilterCategories;
	flattenBookSelected: boolean;
	icons: ReactNode;
	label: string;
	onApplyPlacedPlanner: (direction: UpgradeDirection) => void;
	onClose: () => void;
	onClearPlacedPlanner: () => void;
	onComponentRemovedChange: (component: BlueprintComponentIdentity, removed: boolean) => void;
	onDescriptionChange: (description: string) => void;
	onDropPlanner: (serializedPlanner: string) => void;
	onEntitiesIncludedChange: (included: boolean) => void;
	onFlattenBookSelectedChange: (selected: boolean) => void;
	onLabelChange: (label: string) => void;
	onModulesIncludedChange: (included: boolean) => void;
	onParametersChange: (parameters: Parameter[]) => void;
	onPlannerPlace: (choice: UpgradePlannerChoice, direction: UpgradeDirection) => void;
	onSave: () => void;
	onSnapGridChange: (settings: BlueprintSnapGrid) => void;
	onSortBookSelectedChange: (selected: boolean) => void;
	onTilesIncludedChange: (included: boolean) => void;
	onTrainsIncludedChange: (included: boolean) => void;
	parameters: readonly Parameter[];
	plannerDropError: string | undefined;
	placedPlanner: PlacedUpgradePlanner | undefined;
	rootBlueprint: BlueprintString;
	removedComponents: ReadonlySet<BlueprintComponentRemovalKey>;
	saveDisabled: boolean;
	saveLabel: string;
	signalOptions: readonly SignalID[];
	snapGrid: BlueprintSnapGrid | undefined;
	sortBookSelected: boolean;
	stripEntitiesSelected: boolean;
	stripModulesSelected: boolean;
	stripTilesSelected: boolean;
	stripTrainsSelected: boolean;
}

export function BlueprintEditorDialog({
	blueprint,
	book,
	bookOperationSelected,
	breadcrumb,
	description,
	filters,
	flattenBookSelected,
	icons,
	label,
	onApplyPlacedPlanner,
	onClose,
	onClearPlacedPlanner,
	onComponentRemovedChange,
	onDescriptionChange,
	onDropPlanner,
	onEntitiesIncludedChange,
	onFlattenBookSelectedChange,
	onLabelChange,
	onModulesIncludedChange,
	onParametersChange,
	onPlannerPlace,
	onSave,
	onSnapGridChange,
	onSortBookSelectedChange,
	onTilesIncludedChange,
	onTrainsIncludedChange,
	parameters,
	plannerDropError,
	placedPlanner,
	rootBlueprint,
	removedComponents,
	saveDisabled,
	saveLabel,
	signalOptions,
	snapGrid,
	sortBookSelected,
	stripEntitiesSelected,
	stripModulesSelected,
	stripTilesSelected,
	stripTrainsSelected,
}: BlueprintEditorDialogProps) {
	const [upgradePlannerSelectorOpen, setUpgradePlannerSelectorOpen] = useState(false);
	const [parameterizationOpen, setParameterizationOpen] = useState(false);
	const upgradePlannerSelectorId = useId();
	const parameterizationDialogId = useId();

	return (
		<div className="transform-dialog-backdrop transform-workbench-backdrop blueprint-editor__backdrop">
			<section
				className="transform-dialog transform-workbench transform-workbench--blueprint"
				role="dialog"
				aria-modal="true"
				aria-label="Blueprint Editor"
				onKeyDown={(event) => {
					if (event.key === 'Escape') {
						onClose();
					}
				}}
			>
				<header className="transform-dialog__header transform-workbench__header">
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
					<button
						type="button"
						className="transform-dialog__close"
						aria-label="Close Blueprint Editor"
						onClick={onClose}
					>
						×
					</button>
				</header>

				<div className="transform-workbench__body blueprint-editor__layout">
					<div className="panel-hole transform-workflow blueprint-editor__settings">
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

						<section
							className="transform-workflow__section blueprint-editor__icons"
							aria-labelledby="blueprint-editor-icons-heading"
						>
							<h4 id="blueprint-editor-icons-heading">Icon</h4>
							<div>{icons}</div>
							<small>Left-click to edit. Right-click to remove.</small>
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
							categories={filters}
							entitiesIncluded={!stripEntitiesSelected}
							modulesIncluded={!stripModulesSelected}
							onEntitiesIncludedChange={onEntitiesIncludedChange}
							onModulesIncludedChange={onModulesIncludedChange}
							onTilesIncludedChange={onTilesIncludedChange}
							onTrainsIncludedChange={onTrainsIncludedChange}
							tilesIncluded={!stripTilesSelected}
							trainsIncluded={!stripTrainsSelected}
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

				<footer className="transform-workbench__footer transform-workbench__footer--actions">
					<button type="button" className="transform-button" onClick={onClose}>
						Cancel
					</button>
					<ButtonGreen
						disabled={saveDisabled}
						onClick={(event) => {
							event.preventDefault();
							onSave();
						}}
					>
						{saveLabel}
					</ButtonGreen>
				</footer>
			</section>
			{upgradePlannerSelectorOpen ? (
				<UpgradePlannerSelectorDialog
					dialogId={upgradePlannerSelectorId}
					includeEditingChoices={false}
					rootBlueprint={rootBlueprint}
					selectedSource={placedPlanner?.choice.source ?? ''}
					onClose={() => {
						setUpgradePlannerSelectorOpen(false);
					}}
					onChoose={(choice, direction) => {
						setUpgradePlannerSelectorOpen(false);
						onPlannerPlace(choice, direction);
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
