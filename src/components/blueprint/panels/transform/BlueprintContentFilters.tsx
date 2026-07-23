import {useId} from 'react';

import type {BlueprintFilterCategories} from '../../../../transform/strip';

interface BlueprintContentFiltersProps {
	categories: BlueprintFilterCategories;
	entitiesIncluded: boolean;
	modulesIncluded: boolean;
	onEntitiesIncludedChange: (included: boolean) => void;
	onModulesIncludedChange: (included: boolean) => void;
	onTilesIncludedChange: (included: boolean) => void;
	onTrainsIncludedChange: (included: boolean) => void;
	tilesIncluded: boolean;
	trainsIncluded: boolean;
}

interface ContentFilterCheckboxProps {
	included: boolean;
	label: string;
	onIncludedChange: (included: boolean) => void;
}

function ContentFilterCheckbox({included, label, onIncludedChange}: ContentFilterCheckboxProps) {
	return (
		<label className="checkbox-label blueprint-content-filters__option">
			<input
				type="checkbox"
				checked={included}
				onChange={(event) => {
					onIncludedChange(event.currentTarget.checked);
				}}
			/>
			<span className="checkbox" aria-hidden="true" />
			<div>{label}</div>
		</label>
	);
}

export function BlueprintContentFilters({
	categories,
	entitiesIncluded,
	modulesIncluded,
	onEntitiesIncludedChange,
	onModulesIncludedChange,
	onTilesIncludedChange,
	onTrainsIncludedChange,
	tilesIncluded,
	trainsIncluded,
}: BlueprintContentFiltersProps) {
	const headingId = useId();
	const structuralCategoryCount = [categories.entities, categories.tiles, categories.trains].filter(Boolean).length;
	const showStructuralFilters = structuralCategoryCount > 1;

	if (!categories.modules && !showStructuralFilters) return null;

	return (
		<section className="transform-workflow__section blueprint-content-filters" aria-labelledby={headingId}>
			<h4 id={headingId}>Filters</h4>
			<div className="blueprint-content-filters__options">
				{categories.modules ? (
					<ContentFilterCheckbox
						included={modulesIncluded}
						label="Modules"
						onIncludedChange={onModulesIncludedChange}
					/>
				) : null}
				{showStructuralFilters && categories.entities ? (
					<ContentFilterCheckbox
						included={entitiesIncluded}
						label="Entities"
						onIncludedChange={onEntitiesIncludedChange}
					/>
				) : null}
				{showStructuralFilters && categories.trains ? (
					<ContentFilterCheckbox
						included={trainsIncluded}
						label="Trains"
						onIncludedChange={onTrainsIncludedChange}
					/>
				) : null}
				{showStructuralFilters && categories.tiles ? (
					<ContentFilterCheckbox
						included={tilesIncluded}
						label="Tiles"
						onIncludedChange={onTilesIncludedChange}
					/>
				) : null}
			</div>
		</section>
	);
}
