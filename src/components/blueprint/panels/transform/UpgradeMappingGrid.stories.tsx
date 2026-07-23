import type {Meta, StoryObj} from '@storybook/react-vite';
import {fn} from 'storybook/test';

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

export const OrderedMappings: Story = {};
