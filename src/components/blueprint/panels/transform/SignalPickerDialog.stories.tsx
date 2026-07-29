import type {Meta, StoryObj} from '@storybook/react-vite';
import {expect, fn, within} from 'storybook/test';

import type {SignalID} from '../../../../parsing/types';
import {SignalPickerDialog} from './SignalPickerDialog';
import {transformStoryParameters} from './transformStoryParameters';

const catalog: SignalID[] = [
	{type: 'item', name: 'iron-plate'},
	{type: 'item', name: 'copper-plate'},
	{type: 'item', name: 'electronic-circuit'},
	{type: 'item', name: 'advanced-circuit'},
	{type: 'entity', name: 'transport-belt'},
	{type: 'entity', name: 'fast-transport-belt'},
	{type: 'entity', name: 'express-transport-belt'},
	{type: 'recipe', name: 'advanced-oil-processing'},
	{type: 'fluid', name: 'water'},
	{type: 'fluid', name: 'crude-oil'},
	{type: 'virtual', name: 'signal-red'},
	{type: 'virtual', name: 'signal-green'},
	{type: 'planet', name: 'nauvis'},
	{type: 'technology', name: 'automation'},
];

const meta = {
	title: 'Blueprint/Panels/Transform/SignalPickerDialog',
	component: SignalPickerDialog,
	parameters: transformStoryParameters,
	args: {
		confirmationMode: 'required',
		onChoose: fn(),
		onClose: fn(),
	},
} satisfies Meta<typeof SignalPickerDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

export const BlueprintIconPicker: Story = {
	args: {
		title: 'Choose label icon 1',
		initialSignal: {type: 'item', name: 'iron-plate', quality: 'uncommon'},
		initialQuality: 'uncommon',
		options: catalog,
		qualityMode: 'target',
	},
};

export const NarrowPlannerIconPicker: Story = {
	args: {
		title: 'Choose planner preview icon 1',
		initialSignal: {type: 'item', name: 'iron-plate'},
		options: catalog,
	},
	parameters: {
		viewport: {
			defaultViewport: 'transform-narrow',
		},
	},
};

export const SourceOrderedCategoryRows: Story = {
	args: {
		title: 'Select a signal',
		options: [
			{type: 'item', name: 'wooden-chest'},
			{type: 'item', name: 'repair-pack'},
			{type: 'recipe', name: 'basic-oil-processing'},
			{type: 'item', name: 'space-platform-foundation'},
			{type: 'item', name: 'pistol'},
			{type: 'fluid', name: 'water'},
			{type: 'virtual', name: 'signal-everything'},
			{type: 'tile', name: 'stone-path'},
			{type: 'quality', name: 'rare'},
			{type: 'technology', name: 'automation'},
		],
	},
};

export const CanonicalSubgroupRows: Story = {
	args: {
		title: 'Set the filter',
		options: [
			{type: 'entity', name: 'inserter'},
			{type: 'entity', name: 'fast-splitter'},
			{type: 'item', name: 'transport-belt'},
			{type: 'entity', name: 'transport-belt'},
			{type: 'entity', name: 'express-underground-belt'},
			{type: 'entity', name: 'fast-transport-belt'},
			{type: 'entity', name: 'underground-belt'},
			{type: 'entity', name: 'splitter'},
			{type: 'entity', name: 'express-transport-belt'},
			{type: 'entity', name: 'fast-underground-belt'},
			{type: 'entity', name: 'inserter'},
		],
	},
	play: async ({canvasElement}) => {
		const screen = within(canvasElement.ownerDocument.body);
		const grid = screen.getByRole('region', {name: 'Logistics choices'});
		await expect(grid.getAttribute('data-grid-columns')).toBe('10');
		await expect(
			within(grid)
				.getAllByRole('button')
				.map((button) => button.getAttribute('aria-label')),
		).toStrictEqual([
			'Choose Transport belt',
			'Choose Fast transport belt',
			'Choose Express transport belt',
			'Choose Underground belt',
			'Choose Fast underground belt',
			'Choose Express underground belt',
			'Choose Splitter',
			'Choose Fast splitter',
			'Choose Inserter',
		]);
	},
};

export const PlannerFromPicker: Story = {
	args: {
		title: 'Set the filter',
		initialSignal: {
			type: 'entity',
			name: 'transport-belt',
			quality: 'rare',
			comparator: '≥',
		},
		options: catalog.filter(({type}) => type === 'entity'),
		qualityMode: 'source',
	},
};

export const RestrictedToPicker: Story = {
	args: {
		title: 'Select upgrade',
		initialSignal: {type: 'entity', name: 'fast-transport-belt', quality: 'rare'},
		initialQuality: 'rare',
		options: [
			{type: 'entity', name: 'transport-belt'},
			{type: 'entity', name: 'fast-transport-belt'},
			{type: 'entity', name: 'express-transport-belt'},
			{type: 'entity', name: 'turbo-transport-belt'},
		],
		qualityMode: 'target',
		isSelectionAllowed: (signal) => signal.name !== 'transport-belt',
	},
};

export const SearchResults: Story = {
	args: {
		title: 'Select a signal',
		initialSearch: 'circuit',
		options: catalog,
	},
};

export const EmptyResults: Story = {
	args: {
		title: 'Select a signal',
		initialSearch: 'spidertron',
		options: catalog,
	},
};
