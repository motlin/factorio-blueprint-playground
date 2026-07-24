import type {Meta, StoryObj} from '@storybook/react-vite';
import {expect, fn, userEvent, within} from 'storybook/test';

import {transformStoryParameters} from './transformStoryParameters';
import {UpgradeMappingGrid} from './UpgradeMappingGrid';

const meta = {
	title: 'Blueprint/Panels/Transform/UpgradeMappingGrid',
	component: UpgradeMappingGrid,
	args: {
		candidates: [
			{
				count: 4,
				from: {type: 'entity', name: 'transport-belt'},
				preserveQuality: true,
				slotIndex: 0,
				to: {type: 'entity', name: 'fast-transport-belt'},
			},
			{
				count: 2,
				from: {type: 'entity', name: 'underground-belt'},
				preserveQuality: true,
				slotIndex: 4,
				to: {type: 'entity', name: 'fast-underground-belt'},
			},
		],
		excludedSources: new Set(),
		manualRules: [],
		onDraftRemove: fn(),
		onDraftSourceChoose: fn(),
		onDraftTargetChoose: fn(),
		onRemove: fn(),
		onSourceChoose: fn(),
		onTargetChoose: fn(),
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
		await expect(args.onSourceChoose).toHaveBeenLastCalledWith(args.candidates[0]);
	},
};
