import type {Meta, StoryObj} from '@storybook/react-vite';
import {expect, fn, userEvent, within} from 'storybook/test';

import {BlueprintEditorSourceMode} from '../../../../transform/blueprintEditor';
import {blueprintFilterAnalysis} from '../../../../transform/strip';
import {BlueprintContentFilters} from './BlueprintContentFilters';
import {transformStoryParameters} from './transformStoryParameters';

const analysis = blueprintFilterAnalysis(
	{
		blueprint: {
			item: 'blueprint',
			version: 0,
			entities: [
				{
					entity_number: 1,
					name: 'assembling-machine-3',
					position: {x: 0, y: 0},
					items: [
						{
							id: {name: 'speed-module-3'},
							items: {in_inventory: [{inventory: 4, stack: 0}]},
						},
					],
				},
				{entity_number: 2, name: 'train-stop', position: {x: 1, y: 0}, station: 'Alice'},
				{
					entity_number: 3,
					name: 'locomotive',
					position: {x: 2, y: 0},
					items: [
						{
							id: {name: 'coal'},
							items: {in_inventory: [{inventory: 1, stack: 0}]},
						},
					],
				},
				{entity_number: 4, name: 'car', position: {x: 3, y: 0}},
			],
			tiles: [{name: 'concrete', position: {x: 0, y: 1}}],
		},
	},
	BlueprintEditorSourceMode.ExistingRecord,
);

const blueprintReferenceAnalysis = blueprintFilterAnalysis(
	{
		blueprint: {
			item: 'blueprint',
			version: 0,
			entities: [
				{
					entity_number: 1,
					name: 'assembling-machine-3',
					position: {x: 0, y: 0},
					items: [
						{
							id: {name: 'speed-module-3'},
							items: {in_inventory: [{inventory: 4, stack: 0}]},
						},
					],
				},
			],
			tiles: [{name: 'concrete', position: {x: 0, y: 1}}],
		},
	},
	BlueprintEditorSourceMode.ExistingRecord,
);

const capturedDraftAnalysis = blueprintFilterAnalysis(
	{
		blueprint: {
			item: 'blueprint',
			version: 0,
			entities: [
				{entity_number: 1, name: 'assembling-machine-3', position: {x: 0, y: 0}},
				{entity_number: 2, name: 'locomotive', position: {x: 1, y: 0}},
				{entity_number: 3, name: 'car', position: {x: 2, y: 0}},
			],
			tiles: [{name: 'concrete', position: {x: 0, y: 1}}],
		},
	},
	BlueprintEditorSourceMode.CapturedDraft,
);

const hiddenAnalysis = blueprintFilterAnalysis(
	{
		blueprint: {
			item: 'blueprint',
			version: 0,
			entities: [{entity_number: 1, name: 'assembling-machine-3', position: {x: 0, y: 0}}],
		},
	},
	BlueprintEditorSourceMode.ExistingRecord,
);

const meta = {
	title: 'Blueprint/Panels/Transform/BlueprintContentFilters',
	component: BlueprintContentFilters,
	args: {
		analysis,
		entitiesIncluded: true,
		fuelIncluded: true,
		modulesIncluded: true,
		onEntitiesIncludedChange: fn(),
		onFuelIncludedChange: fn(),
		onModulesIncludedChange: fn(),
		onStationNamesIncludedChange: fn(),
		onTilesIncludedChange: fn(),
		onTrainsIncludedChange: fn(),
		onVehiclesIncludedChange: fn(),
		stationNamesIncluded: true,
		tilesIncluded: true,
		trainsIncluded: true,
		vehiclesIncluded: true,
	},
	parameters: transformStoryParameters,
	decorators: [
		(StoryComponent) => (
			<div style={{width: 'min(432px, 100vw)'}}>
				<StoryComponent />
			</div>
		),
	],
	tags: ['autodocs', 'visual-conformance'],
} satisfies Meta<typeof BlueprintContentFilters>;

export default meta;
type Story = StoryObj<typeof meta>;

export const AllContentCategories: Story = {
	play: async ({args, canvasElement}) => {
		const canvas = within(canvasElement);
		const modules = canvas.getByRole<HTMLInputElement>('checkbox', {name: 'Modules'});
		await expect(
			canvas.getAllByRole('checkbox').map((checkbox) => {
				if (!(checkbox instanceof HTMLInputElement)) throw new TypeError('Expected a checkbox input.');
				return {checked: checkbox.checked, label: checkbox.labels?.[0]?.textContent};
			}),
		).toStrictEqual([
			{checked: true, label: 'Modules'},
			{checked: true, label: 'Entities'},
			{checked: true, label: 'Tiles'},
			{checked: true, label: 'Train stop names'},
			{checked: true, label: 'Trains'},
			{checked: true, label: 'Vehicle fuel'},
			{checked: true, label: 'Vehicles'},
		]);
		const frame = canvas.getByRole('region', {name: 'Filters'});
		const options = frame.querySelector('.blueprint-content-filters__options');
		const trains = canvas.getByRole<HTMLInputElement>('checkbox', {name: 'Trains'});
		if (!(options instanceof HTMLElement)) {
			throw new TypeError('Expected the source-backed filter options container.');
		}
		await expect({
			checkboxSize: [modules.getBoundingClientRect().width, modules.getBoundingClientRect().height],
			frameSource: frame.dataset.factorioSource,
			frameStyle: frame.dataset.factorioStyle,
			gap: getComputedStyle(options).gap,
			headingStyle: canvas.getByRole('heading', {name: 'Filters'}).dataset.factorioStyle,
			optionHeight: modules.labels?.[0]?.getBoundingClientRect().height,
			optionsSource: options.dataset.factorioSource,
			trainsDescription: trains.getAttribute('aria-description'),
			trainsTitle: trains.labels?.[0]?.title,
		}).toStrictEqual({
			checkboxSize: [28, 28],
			frameSource: 'BlueprintSettingsGui::updateCheckboxes',
			frameStyle: 'bordered_frame',
			gap: '4px',
			headingStyle: 'caption_label',
			optionHeight: 28,
			optionsSource: 'BlueprintSettingsGui::updateCheckboxes',
			trainsDescription: 'Include trains in the blueprint',
			trainsTitle: 'Include trains in the blueprint',
		});
		modules.focus();
		await userEvent.keyboard(' ');
		await expect(args.onModulesIncludedChange.mock.calls).toStrictEqual([[false]]);
	},
};

export const BlueprintReferenceFilters: Story = {
	args: {
		analysis: blueprintReferenceAnalysis,
	},
	play: async ({canvasElement}) => {
		const canvas = within(canvasElement);
		await expect(
			canvas.getAllByRole<HTMLInputElement>('checkbox').map((checkbox) => ({
				checked: checkbox.checked,
				label: checkbox.labels?.[0]?.textContent,
			})),
		).toStrictEqual([
			{checked: true, label: 'Modules'},
			{checked: true, label: 'Entities'},
			{checked: true, label: 'Tiles'},
		]);
	},
};

export const CapturedDraftDefaults: Story = {
	args: {
		analysis: capturedDraftAnalysis,
		tilesIncluded: capturedDraftAnalysis.defaults.tiles,
		trainsIncluded: capturedDraftAnalysis.defaults.trains,
		vehiclesIncluded: capturedDraftAnalysis.defaults.vehicles,
	},
	play: async ({canvasElement}) => {
		const canvas = within(canvasElement);
		await expect(
			canvas.getAllByRole<HTMLInputElement>('checkbox').map((checkbox) => ({
				checked: checkbox.checked,
				label: checkbox.labels?.[0]?.textContent,
			})),
		).toStrictEqual([
			{checked: true, label: 'Entities'},
			{checked: false, label: 'Tiles'},
			{checked: false, label: 'Trains'},
			{checked: false, label: 'Vehicles'},
		]);
	},
};

export const NoApplicableFilters: Story = {
	args: {
		analysis: hiddenAnalysis,
	},
	play: async ({canvasElement}) => {
		const canvas = within(canvasElement);
		await expect(canvas.queryByRole('region', {name: 'Filters'})).not.toBeInTheDocument();
		await expect(canvas.queryAllByRole('checkbox')).toStrictEqual([]);
	},
};
