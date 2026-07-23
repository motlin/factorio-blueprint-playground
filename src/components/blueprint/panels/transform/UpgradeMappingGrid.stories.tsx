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
				to: {type: 'entity', name: 'fast-transport-belt'},
			},
			{
				count: 2,
				from: {type: 'entity', name: 'underground-belt'},
				preserveQuality: true,
				to: {type: 'entity', name: 'fast-underground-belt'},
			},
		],
		excludedSources: new Set(),
		manualRules: [],
		onRemove: fn(),
		onSourceChoose: fn(),
		onSourceQualityChange: fn(),
		onTargetChoose: fn(),
		onTargetQualityChange: fn(),
		showEmptyState: true,
	},
	parameters: transformStoryParameters,
	tags: ['autodocs'],
} satisfies Meta<typeof UpgradeMappingGrid>;

export default meta;
type Story = StoryObj<typeof meta>;

export const OrderedMappings: Story = {
	play: async ({args, canvasElement}) => {
		const canvas = within(canvasElement);
		const rareQualityButtons = canvas.getAllByRole('button', {name: 'Rare quality'});

		await userEvent.click(rareQualityButtons[0]);
		await userEvent.click(rareQualityButtons[1]);

		await expect(args.onSourceQualityChange).toHaveBeenLastCalledWith(args.candidates[0], {
			comparator: '=',
			name: 'transport-belt',
			quality: 'rare',
			type: 'entity',
		});
		await expect(args.onTargetQualityChange).toHaveBeenLastCalledWith(
			args.candidates[0],
			{name: 'fast-transport-belt', quality: 'rare', type: 'entity'},
			false,
		);
	},
};
