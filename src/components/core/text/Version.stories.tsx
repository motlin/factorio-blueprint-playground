import type {Meta, StoryObj} from '@storybook/react-vite';

import {Version} from './Version';

const meta: Meta<typeof Version> = {
	title: 'Core/Version',
	component: Version,
	parameters: {
		layout: 'centered',
	},
	tags: ['autodocs'],
	argTypes: {
		number: {control: 'number'},
	},
};

export default meta;
type Story = StoryObj<typeof Version>;

export const Factorio1_1: Story = {
	args: {
		number: 281479275741184,
	},
};

export const Factorio2_0: Story = {
	args: {
		number: 562949954076672,
	},
};
