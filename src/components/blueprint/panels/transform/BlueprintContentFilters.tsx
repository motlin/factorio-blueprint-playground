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
	description?: string;
	included: boolean;
	label: string;
	onIncludedChange: (included: boolean) => void;
}

function ContentFilterCheckbox({description, included, label, onIncludedChange}: ContentFilterCheckboxProps) {
	return (
		<label className="checkbox-label blueprint-content-filters__option" title={description}>
			<input
				type="checkbox"
				aria-description={description}
				checked={included}
				data-factorio-style="checkbox"
				onChange={(event) => {
					onIncludedChange(event.currentTarget.checked);
				}}
			/>
			<span className="checkbox" aria-hidden="true" />
			<span className="blueprint-content-filters__label">{label}</span>
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
			label: 'Train stop names',
			onIncludedChange: onStationNamesIncludedChange,
		});
	}
	if (analysis.visible.trains) {
		options.push({
			description: 'Include trains in the blueprint',
			included: trainsIncluded,
			label: 'Trains',
			onIncludedChange: onTrainsIncludedChange,
		});
	}
	if (analysis.visible.fuel) {
		options.push({
			included: fuelIncluded,
			label: 'Vehicle fuel',
			onIncludedChange: onFuelIncludedChange,
		});
	}
	if (analysis.visible.vehicles) {
		options.push({
			description: 'Include vehicles (other than trains) in the blueprint',
			included: vehiclesIncluded,
			label: 'Vehicles',
			onIncludedChange: onVehiclesIncludedChange,
		});
	}

	if (!analysis.showGroup) return null;

	return (
		<section
			className="transform-workflow__section blueprint-content-filters"
			aria-labelledby={headingId}
			data-factorio-source="BlueprintSettingsGui::updateCheckboxes"
			data-factorio-style="bordered_frame"
		>
			<h4 id={headingId} data-factorio-style="caption_label">
				Filters
			</h4>
			<div
				className="blueprint-content-filters__options"
				data-factorio-source="BlueprintSettingsGui::updateCheckboxes"
			>
				{options.map((option) => (
					<ContentFilterCheckbox key={option.label} {...option} />
				))}
			</div>
		</section>
	);
}
