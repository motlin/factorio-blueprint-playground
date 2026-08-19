import type {Meta, StoryObj} from '@storybook/react-vite';
import {expect, fn, userEvent, within} from 'storybook/test';

import {transformStoryParameters} from './transformStoryParameters';
import {UpgradeMappingGrid} from './UpgradeMappingGrid';

const meta = {
	title: 'Blueprint/Panels/Transform/UpgradeMappingGrid',
	component: UpgradeMappingGrid,
	args: {
		mappings: [
			{
				count: 4,
				from: {type: 'entity', name: 'transport-belt'},
				mappingId: 'mapping-belt',
				slotIndex: 0,
				to: {type: 'entity', name: 'fast-transport-belt'},
			},
			{
				count: 0,
				from: {type: 'entity', name: 'underground-belt'},
				mappingId: 'mapping-underground-belt',
				slotIndex: 4,
				to: {type: 'entity', name: 'fast-underground-belt'},
			},
		],
		onChooseSource: fn(),
		onChooseTarget: fn(),
		onClearEndpoint: fn(),
		onMove: fn(),
	},
	parameters: transformStoryParameters,
	tags: ['autodocs'],
} satisfies Meta<typeof UpgradeMappingGrid>;

export default meta;
type Story = StoryObj<typeof meta>;

export const OrderedMappings: Story = {
	play: async ({args, canvasElement}) => {
		const canvas = within(canvasElement);
		await userEvent.click(canvas.getByRole('button', {name: 'Choose source, currently Transport belt'}));
		await expect(args.onChooseSource).toHaveBeenLastCalledWith('mapping-belt', 0);
		await userEvent.keyboard('{Control>}{ArrowRight}{/Control}');
		await expect(args.onMove).toHaveBeenLastCalledWith('mapping-belt', 1);
	},
};
