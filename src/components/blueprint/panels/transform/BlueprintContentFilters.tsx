import {useId} from 'react';

import type {BlueprintFilterAnalysis} from '../../../../transform/strip';

interface BlueprintContentFiltersProps {
	analysis: BlueprintFilterAnalysis;
	entitiesIncluded: boolean;
	fuelIncluded: boolean;
	modulesIncluded: boolean;
	onEntitiesIncludedChange: (included: boolean) => void;
	onFuelIncludedChange: (included: boolean) => void;
	onModulesIncludedChange: (included: boolean) => void;
	onStationNamesIncludedChange: (included: boolean) => void;
	onTilesIncludedChange: (included: boolean) => void;
	onTrainsIncludedChange: (included: boolean) => void;
	onVehiclesIncludedChange: (included: boolean) => void;
	stationNamesIncluded: boolean;
	tilesIncluded: boolean;
	trainsIncluded: boolean;
	vehiclesIncluded: boolean;
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
	analysis,
	entitiesIncluded,
	fuelIncluded,
	modulesIncluded,
	onEntitiesIncludedChange,
	onFuelIncludedChange,
	onModulesIncludedChange,
	onStationNamesIncludedChange,
	onTilesIncludedChange,
	onTrainsIncludedChange,
	onVehiclesIncludedChange,
	stationNamesIncluded,
	tilesIncluded,
	trainsIncluded,
	vehiclesIncluded,
}: BlueprintContentFiltersProps) {
	const headingId = useId();
	const options: ContentFilterCheckboxProps[] = [];
	if (analysis.visible.modules) {
		options.push({
			included: modulesIncluded,
			label: 'Modules',
			onIncludedChange: onModulesIncludedChange,
		});
	}
	if (analysis.visible.entities) {
		options.push({
			included: entitiesIncluded,
			label: 'Entities',
			onIncludedChange: onEntitiesIncludedChange,
		});
	}
	if (analysis.visible.tiles) {
		options.push({
			included: tilesIncluded,
			label: 'Tiles',
			onIncludedChange: onTilesIncludedChange,
		});
	}
	if (analysis.visible.stationNames) {
		options.push({
			included: stationNamesIncluded,
			label: 'Station names',
			onIncludedChange: onStationNamesIncludedChange,
		});
	}
	if (analysis.visible.trains) {
		options.push({
			included: trainsIncluded,
			label: 'Trains',
			onIncludedChange: onTrainsIncludedChange,
		});
	}
	if (analysis.visible.fuel) {
		options.push({
			included: fuelIncluded,
			label: 'Fuel',
			onIncludedChange: onFuelIncludedChange,
		});
	}
	if (analysis.visible.vehicles) {
		options.push({
			included: vehiclesIncluded,
			label: 'Vehicles',
			onIncludedChange: onVehiclesIncludedChange,
		});
	}

	if (!analysis.showGroup) return null;

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
