import type {Meta, StoryObj} from '@storybook/react-vite';
import {expect, fn, userEvent, within} from 'storybook/test';

import {BlueprintContentFilters} from './BlueprintContentFilters';
import {transformStoryParameters} from './transformStoryParameters';

const meta = {
	title: 'Blueprint/Panels/Transform/BlueprintContentFilters',
	component: BlueprintContentFilters,
	args: {
		categories: {
			entities: true,
			modules: true,
			tiles: true,
			trains: true,
		},
		entitiesIncluded: true,
		modulesIncluded: true,
		onEntitiesIncludedChange: fn(),
		onModulesIncludedChange: fn(),
		onTilesIncludedChange: fn(),
		onTrainsIncludedChange: fn(),
		tilesIncluded: true,
		trainsIncluded: true,
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
			{checked: true, label: 'Trains'},
			{checked: true, label: 'Tiles'},
		]);
		modules.focus();
		await userEvent.keyboard(' ');
		await expect(args.onModulesIncludedChange.mock.calls).toStrictEqual([[false]]);
	},
};
