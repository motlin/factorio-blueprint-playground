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
	tags: ['autodocs'],
} satisfies Meta<typeof BlueprintContentFilters>;

export default meta;
type Story = StoryObj<typeof meta>;

export const AllContentCategories: Story = {
	play: async ({args, canvasElement}) => {
		const canvas = within(canvasElement);
		const modules = canvas.getByRole('checkbox', {name: 'Modules'});
		await expect(
			canvas.getAllByRole('checkbox').map((checkbox) => {
				if (!(checkbox instanceof HTMLInputElement)) throw new TypeError('Expected a checkbox input.');
				return {checked: checkbox.checked, label: checkbox.labels?.[0]?.textContent};
			}),
		).toStrictEqual([
			{checked: true, label: 'Modules'},
			{checked: true, label: 'Entities'},
			{checked: true, label: 'Tiles'},
			{checked: true, label: 'Station names'},
			{checked: true, label: 'Trains'},
			{checked: true, label: 'Fuel'},
			{checked: true, label: 'Vehicles'},
		]);
		modules.focus();
		await userEvent.keyboard(' ');
		await expect(args.onModulesIncludedChange.mock.calls).toStrictEqual([[false]]);
	},
};
