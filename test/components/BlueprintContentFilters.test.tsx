import {render, screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {expect, test, vi} from 'vite-plus/test';

import {BlueprintContentFilters} from '../../src/components/blueprint/panels/transform/BlueprintContentFilters';
import type {BlueprintString, Entity} from '../../src/parsing/types';
import {BlueprintEditorSourceMode} from '../../src/transform/blueprintEditor';
import {
	blueprintFilterAnalysis,
	type BlueprintFilterAnalysis,
	type BlueprintFilterCategories,
} from '../../src/transform/strip';

interface FilterMatrixCase {
	blueprint: BlueprintString;
	capturedOnSpacePlatform?: boolean;
	expectedAnalysis: BlueprintFilterAnalysis;
	expectedControls: {checked: boolean; label: string}[];
	name: string;
	sourceMode: BlueprintEditorSourceMode;
}

const absentCategories: BlueprintFilterCategories = {
	entities: false,
	fuel: false,
	modules: false,
	stationNames: false,
	tiles: false,
	trains: false,
	vehicles: false,
};

const allIncluded: BlueprintFilterCategories = {
	entities: true,
	fuel: true,
	modules: true,
	stationNames: true,
	tiles: true,
	trains: true,
	vehicles: true,
};

function blueprint(entities: Entity[] = [], tiles: NonNullable<BlueprintString['blueprint']>['tiles'] = []) {
	return {
		blueprint: {
			item: 'blueprint',
			version: 0,
			...(entities.length === 0 ? {} : {entities}),
			...(tiles.length === 0 ? {} : {tiles}),
		},
	} satisfies BlueprintString;
}

const assemblingMachine: Entity = {
	entity_number: 100,
	name: 'assembling-machine-3',
	position: {x: 0, y: 0},
};
const locomotive: Entity = {
	entity_number: 200,
	name: 'locomotive',
	position: {x: 1, y: 0},
};
const car: Entity = {
	entity_number: 300,
	name: 'car',
	position: {x: 2, y: 0},
};
const concrete = {name: 'concrete', position: {x: 0, y: 1}};

const filterMatrix: FilterMatrixCase[] = [
	{
		blueprint: blueprint([assemblingMachine]),
		expectedAnalysis: {
			categories: {...absentCategories, entities: true},
			defaults: {...allIncluded, trains: false, vehicles: false},
			showGroup: false,
			visible: absentCategories,
		},
		expectedControls: [],
		name: 'new entity-only capture',
		sourceMode: BlueprintEditorSourceMode.CapturedDraft,
	},
	{
		blueprint: blueprint([assemblingMachine]),
		expectedAnalysis: {
			categories: {...absentCategories, entities: true},
			defaults: allIncluded,
			showGroup: false,
			visible: absentCategories,
		},
		expectedControls: [],
		name: 'existing entity-only blueprint',
		sourceMode: BlueprintEditorSourceMode.ExistingRecord,
	},
	{
		blueprint: blueprint([], [concrete]),
		expectedAnalysis: {
			categories: {...absentCategories, tiles: true},
			defaults: {...allIncluded, trains: false, vehicles: false},
			showGroup: false,
			visible: absentCategories,
		},
		expectedControls: [],
		name: 'new tile-only capture',
		sourceMode: BlueprintEditorSourceMode.CapturedDraft,
	},
	{
		blueprint: blueprint([assemblingMachine], [concrete]),
		expectedAnalysis: {
			categories: {...absentCategories, entities: true, tiles: true},
			defaults: {...allIncluded, tiles: false, trains: false, vehicles: false},
			showGroup: true,
			visible: {...absentCategories, entities: true, tiles: true},
		},
		expectedControls: [
			{checked: true, label: 'Entities'},
			{checked: false, label: 'Tiles'},
		],
		name: 'new mixed entity and tile capture',
		sourceMode: BlueprintEditorSourceMode.CapturedDraft,
	},
	{
		blueprint: blueprint([assemblingMachine], [concrete]),
		expectedAnalysis: {
			categories: {...absentCategories, entities: true, tiles: true},
			defaults: allIncluded,
			showGroup: true,
			visible: {...absentCategories, entities: true, tiles: true},
		},
		expectedControls: [
			{checked: true, label: 'Entities'},
			{checked: true, label: 'Tiles'},
		],
		name: 'existing mixed entity and tile blueprint',
		sourceMode: BlueprintEditorSourceMode.ExistingRecord,
	},
	{
		blueprint: blueprint([{...assemblingMachine, name: 'train-stop', station: 'Alice'}]),
		expectedAnalysis: {
			categories: {...absentCategories, entities: true, stationNames: true},
			defaults: allIncluded,
			showGroup: true,
			visible: {...absentCategories, stationNames: true},
		},
		expectedControls: [{checked: true, label: 'Station names'}],
		name: 'named station',
		sourceMode: BlueprintEditorSourceMode.ExistingRecord,
	},
	{
		blueprint: blueprint([
			{
				...locomotive,
				items: [
					{
						id: {name: 'coal'},
						items: {in_inventory: [{inventory: 1, stack: 0, count: 10}]},
					},
				],
			},
		]),
		expectedAnalysis: {
			categories: {...absentCategories, fuel: true, trains: true},
			defaults: allIncluded,
			showGroup: true,
			visible: {...absentCategories, fuel: true},
		},
		expectedControls: [{checked: true, label: 'Fuel'}],
		name: 'fuel in a train-only blueprint',
		sourceMode: BlueprintEditorSourceMode.ExistingRecord,
	},
	{
		blueprint: blueprint([assemblingMachine, locomotive]),
		expectedAnalysis: {
			categories: {...absentCategories, entities: true, trains: true},
			defaults: {...allIncluded, trains: false, vehicles: false},
			showGroup: true,
			visible: {...absentCategories, entities: true, trains: true},
		},
		expectedControls: [
			{checked: true, label: 'Entities'},
			{checked: false, label: 'Trains'},
		],
		name: 'new capture with entities and trains',
		sourceMode: BlueprintEditorSourceMode.CapturedDraft,
	},
	{
		blueprint: blueprint([assemblingMachine, car]),
		expectedAnalysis: {
			categories: {...absentCategories, entities: true, vehicles: true},
			defaults: {...allIncluded, trains: false, vehicles: false},
			showGroup: true,
			visible: {...absentCategories, entities: true, vehicles: true},
		},
		expectedControls: [
			{checked: true, label: 'Entities'},
			{checked: false, label: 'Vehicles'},
		],
		name: 'new capture with entities and vehicles',
		sourceMode: BlueprintEditorSourceMode.CapturedDraft,
	},
	{
		blueprint: blueprint([assemblingMachine], [concrete]),
		capturedOnSpacePlatform: true,
		expectedAnalysis: {
			categories: {...absentCategories, entities: true, tiles: true},
			defaults: {...allIncluded, trains: false, vehicles: false},
			showGroup: true,
			visible: {...absentCategories, entities: true, tiles: true},
		},
		expectedControls: [
			{checked: true, label: 'Entities'},
			{checked: true, label: 'Tiles'},
		],
		name: 'new mixed capture on a space platform',
		sourceMode: BlueprintEditorSourceMode.CapturedDraft,
	},
	{
		blueprint: blueprint([
			{
				...assemblingMachine,
				items: [
					{
						id: {name: 'speed-module-3'},
						items: {in_inventory: [{inventory: 4, stack: 0, count: 2}]},
					},
				],
			},
		]),
		expectedAnalysis: {
			categories: {...absentCategories, entities: true, modules: true},
			defaults: allIncluded,
			showGroup: true,
			visible: {...absentCategories, modules: true},
		},
		expectedControls: [{checked: true, label: 'Modules'}],
		name: 'modules in an entity-only blueprint',
		sourceMode: BlueprintEditorSourceMode.ExistingRecord,
	},
];

function renderFilters(analysis: BlueprintFilterAnalysis) {
	const callbacks = {
		entities: vi.fn<(included: boolean) => void>(),
		fuel: vi.fn<(included: boolean) => void>(),
		modules: vi.fn<(included: boolean) => void>(),
		stationNames: vi.fn<(included: boolean) => void>(),
		tiles: vi.fn<(included: boolean) => void>(),
		trains: vi.fn<(included: boolean) => void>(),
		vehicles: vi.fn<(included: boolean) => void>(),
	};

	render(
		<BlueprintContentFilters
			analysis={analysis}
			entitiesIncluded={analysis.defaults.entities}
			fuelIncluded={analysis.defaults.fuel}
			modulesIncluded={analysis.defaults.modules}
			onEntitiesIncludedChange={callbacks.entities}
			onFuelIncludedChange={callbacks.fuel}
			onModulesIncludedChange={callbacks.modules}
			onStationNamesIncludedChange={callbacks.stationNames}
			onTilesIncludedChange={callbacks.tiles}
			onTrainsIncludedChange={callbacks.trains}
			onVehiclesIncludedChange={callbacks.vehicles}
			stationNamesIncluded={analysis.defaults.stationNames}
			tilesIncluded={analysis.defaults.tiles}
			trainsIncluded={analysis.defaults.trains}
			vehiclesIncluded={analysis.defaults.vehicles}
		/>,
	);

	return callbacks;
}

test.each(filterMatrix)(
	'source-backed filter matrix: $name',
	({blueprint, capturedOnSpacePlatform = false, expectedAnalysis, expectedControls, sourceMode}) => {
		const analysis = blueprintFilterAnalysis(blueprint, sourceMode, capturedOnSpacePlatform);
		renderFilters(analysis);

		expect({
			analysis,
			controls: screen.queryAllByRole<HTMLInputElement>('checkbox').map((checkbox) => ({
				checked: checkbox.checked,
				label: checkbox.labels?.[0]?.textContent,
				type: checkbox.type,
			})),
			heading: screen.queryByRole('heading', {name: 'Filters'})?.textContent ?? null,
		}).toStrictEqual({
			analysis: expectedAnalysis,
			controls: expectedControls.map(({checked, label}) => ({checked, label, type: 'checkbox'})),
			heading: expectedControls.length === 0 ? null : 'Filters',
		});
	},
);

test('toggles a selectable label with the native keyboard control', async () => {
	const user = userEvent.setup();
	const analysis = blueprintFilterAnalysis(
		blueprint([assemblingMachine, locomotive]),
		BlueprintEditorSourceMode.ExistingRecord,
	);
	const callbacks = renderFilters(analysis);
	const trains = screen.getByRole<HTMLInputElement>('checkbox', {name: 'Trains'});

	trains.focus();
	await user.keyboard(' ');

	expect({
		activeElement: document.activeElement,
		calls: callbacks.trains.mock.calls,
		factorioCheckbox: trains.nextElementSibling?.className,
		labelElement: trains.labels?.[0]?.tagName,
		labelText: trains.labels?.[0]?.textContent,
	}).toStrictEqual({
		activeElement: trains,
		calls: [[false]],
		factorioCheckbox: 'checkbox',
		labelElement: 'LABEL',
		labelText: 'Trains',
	});
});
