import {type ReactNode, useId, useState} from 'react';

import type {BlueprintString} from '../../../../parsing/types';
import type {BlueprintFilterCategories} from '../../../../transform/strip';
import type {UpgradeDirection} from '../../../../transform/upgradePlanner';
import {ButtonGreen} from '../../../ui/ButtonGreen';
import {BlueprintEditorToolbar} from './BlueprintEditorToolbar';
import {BlueprintTitleEditor} from './BlueprintTitleEditor';
import {UpgradePlannerSelectorDialog, type UpgradePlannerChoice} from './UpgradePlannerSelectorDialog';

interface BlueprintEditorDialogProps {
	book: boolean;
	bookOperationSelected: boolean;
	breadcrumb: string;
	description: string;
	filters: BlueprintFilterCategories;
	flattenBookSelected: boolean;
	icons: readonly ReactNode[];
	label: string;
	onClose: () => void;
	onDescriptionChange: (description: string) => void;
	onEntitiesIncludedChange: (included: boolean) => void;
	onFlattenBookSelectedChange: (selected: boolean) => void;
	onLabelChange: (label: string) => void;
	onModulesIncludedChange: (included: boolean) => void;
	onPlannerChoose: (choice: UpgradePlannerChoice, direction: UpgradeDirection) => void;
	onSave: () => void;
	onSortBookSelectedChange: (selected: boolean) => void;
	onTilesIncludedChange: (included: boolean) => void;
	onTrainsIncludedChange: (included: boolean) => void;
	rootBlueprint: BlueprintString;
	saveDisabled: boolean;
	saveLabel: string;
	sortBookSelected: boolean;
	stripEntitiesSelected: boolean;
	stripModulesSelected: boolean;
	stripTilesSelected: boolean;
	stripTrainsSelected: boolean;
}

export function BlueprintEditorDialog({
	book,
	bookOperationSelected,
	breadcrumb,
	description,
	filters,
	flattenBookSelected,
	icons,
	label,
	onClose,
	onDescriptionChange,
	onEntitiesIncludedChange,
	onFlattenBookSelectedChange,
	onLabelChange,
	onModulesIncludedChange,
	onPlannerChoose,
	onSave,
	onSortBookSelectedChange,
	onTilesIncludedChange,
	onTrainsIncludedChange,
	rootBlueprint,
	saveDisabled,
	saveLabel,
	sortBookSelected,
	stripEntitiesSelected,
	stripModulesSelected,
	stripTilesSelected,
	stripTrainsSelected,
}: BlueprintEditorDialogProps) {
	const [upgradePlannerSelectorOpen, setUpgradePlannerSelectorOpen] = useState(false);
	const upgradePlannerSelectorId = useId();
	const entityFilterCount = [filters.entities, filters.tiles, filters.trains].filter(Boolean).length;
	const showEntityFilters = entityFilterCount > 1;
	const showFilters = filters.modules || showEntityFilters;

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
								onOpenUpgradePlannerSelector={() => {
									setUpgradePlannerSelectorOpen(true);
								}}
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

						<section
							className="transform-workflow__section blueprint-editor__description"
							aria-labelledby="blueprint-editor-description-heading"
						>
							<h4 id="blueprint-editor-description-heading">Description</h4>
							<textarea
								aria-label="Blueprint description"
								value={description}
								onChange={(event) => {
									onDescriptionChange(event.currentTarget.value);
								}}
							/>
						</section>

						{showFilters ? (
							<section
								className="transform-workflow__section"
								aria-labelledby="blueprint-editor-filters-heading"
							>
								<h4 id="blueprint-editor-filters-heading">Filters</h4>
								<div className="transform-workflow__checks">
									{filters.modules ? (
										<label>
											<input
												type="checkbox"
												checked={!stripModulesSelected}
												onChange={(event) => {
													onModulesIncludedChange(event.currentTarget.checked);
												}}
											/>{' '}
											Modules
										</label>
									) : null}
									{showEntityFilters && filters.entities ? (
										<label>
											<input
												type="checkbox"
												checked={!stripEntitiesSelected}
												onChange={(event) => {
													onEntitiesIncludedChange(event.currentTarget.checked);
												}}
											/>{' '}
											Entities
										</label>
									) : null}
									{showEntityFilters && filters.trains ? (
										<label>
											<input
												type="checkbox"
												checked={!stripTrainsSelected}
												onChange={(event) => {
													onTrainsIncludedChange(event.currentTarget.checked);
												}}
											/>{' '}
											Trains
										</label>
									) : null}
									{showEntityFilters && filters.tiles ? (
										<label>
											<input
												type="checkbox"
												checked={!stripTilesSelected}
												onChange={(event) => {
													onTilesIncludedChange(event.currentTarget.checked);
												}}
											/>{' '}
											Tiles
										</label>
									) : null}
								</div>
							</section>
						) : null}

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
					selectedSource="suggested"
					onClose={() => {
						setUpgradePlannerSelectorOpen(false);
					}}
					onChoose={(choice, direction) => {
						setUpgradePlannerSelectorOpen(false);
						onPlannerChoose(choice, direction);
					}}
				/>
			) : null}
		</div>
	);
}
