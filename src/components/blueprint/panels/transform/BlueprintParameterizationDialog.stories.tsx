import type {Meta, StoryObj} from '@storybook/react-vite';
import {fn} from 'storybook/test';

import {BlueprintParameterizationDialog} from './BlueprintParameterizationDialog';
import {transformStoryParameters} from './transformStoryParameters';

const meta = {
	title: 'Blueprint/Panels/Transform/BlueprintParameterizationDialog',
	component: BlueprintParameterizationDialog,
	args: {
		dialogId: 'blueprint-parameterization-story',
		onClose: fn(),
		onConfirm: fn(),
		parameters: [
			{
				type: 'id',
				id: 'iron-plate',
				name: 'Alice input',
				'quality-condition': {quality: 'normal', comparator: '='},
			},
			{
				type: 'id',
				id: 'electronic-circuit',
				name: 'Bob product',
				'product-of': 'iron-plate',
			},
		],
		signalOptions: [
			{type: 'item', name: 'iron-plate'},
			{type: 'item', name: 'copper-plate'},
			{type: 'item', name: 'electronic-circuit'},
		],
	},
	parameters: transformStoryParameters,
	tags: ['autodocs'],
} satisfies Meta<typeof BlueprintParameterizationDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

export const DependentParameters: Story = {};
