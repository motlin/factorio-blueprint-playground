import type {Meta, StoryObj} from '@storybook/react-vite';
import {fn} from 'storybook/test';

import {SignalPickerDialog} from './SignalPickerDialog';

const qualitySourceSignal = {
	type: 'entity',
	name: 'transport-belt',
	quality: 'rare',
	comparator: '≥',
} as const;

const meta = {
	title: 'Blueprint/Panels/Transform/SignalPickerDialog',
	component: SignalPickerDialog,
	parameters: {
		layout: 'fullscreen',
	},
	args: {
		onChoose: fn(),
		onClose: fn(),
	},
} satisfies Meta<typeof SignalPickerDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

export const CategorizedSignals: Story = {
	args: {
		title: 'Select a signal',
		options: [
			{type: 'item', name: 'iron-plate'},
			{type: 'item', name: 'copper-plate'},
			{type: 'entity', name: 'transport-belt'},
			{type: 'recipe', name: 'electronic-circuit'},
			{type: 'fluid', name: 'water'},
			{type: 'virtual', name: 'signal-red'},
			{type: 'planet', name: 'nauvis'},
			{type: 'technology', name: 'automation'},
		],
	},
};

export const QualityTarget: Story = {
	args: {
		title: 'Choose target for Transport belt',
		initialQuality: 'rare',
		initialSignal: {type: 'entity', name: 'fast-transport-belt'},
		options: [
			{type: 'entity', name: 'transport-belt'},
			{type: 'entity', name: 'fast-transport-belt'},
			{type: 'entity', name: 'express-transport-belt'},
			{type: 'entity', name: 'turbo-transport-belt'},
		],
		qualityMode: 'target',
	},
};

export const QualitySource: Story = {
	args: {
		title: 'Choose mapping source',
		initialSignal: qualitySourceSignal,
		options: [
			qualitySourceSignal,
			{type: 'entity', name: 'fast-transport-belt'},
			{type: 'entity', name: 'express-transport-belt'},
			{type: 'entity', name: 'turbo-transport-belt'},
		],
		qualityMode: 'source',
	},
};
