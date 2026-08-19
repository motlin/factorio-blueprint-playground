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
	const structuralOptions: ContentFilterCheckboxProps[] = [];
	if (categories.entities) {
		structuralOptions.push({
			included: entitiesIncluded,
			label: 'Entities',
			onIncludedChange: onEntitiesIncludedChange,
		});
	}
	if (categories.trains) {
		structuralOptions.push({
			included: trainsIncluded,
			label: 'Trains',
			onIncludedChange: onTrainsIncludedChange,
		});
	}
	if (categories.tiles) {
		structuralOptions.push({
			included: tilesIncluded,
			label: 'Tiles',
			onIncludedChange: onTilesIncludedChange,
		});
	}
	const options: ContentFilterCheckboxProps[] = [];
	if (categories.modules) {
		options.push({
			included: modulesIncluded,
			label: 'Modules',
			onIncludedChange: onModulesIncludedChange,
		});
	}
	if (structuralOptions.length > 1) {
		options.push(...structuralOptions);
	}

	if (options.length === 0) return null;

	return (
		<section className="transform-workflow__section blueprint-content-filters" aria-labelledby={headingId}>
			<h4 id={headingId}>Filters</h4>
			<div className="blueprint-content-filters__options">
				{options.map((option) => (
					<ContentFilterCheckbox key={option.label} {...option} />
				))}
			</div>
		</section>
	);
}
