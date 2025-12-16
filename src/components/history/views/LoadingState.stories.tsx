import type {Meta, StoryObj} from '@storybook/react-vite';

import {LoadingState} from './LoadingState';

const meta: Meta<typeof LoadingState> = {
	title: 'History/Views/LoadingState',
	component: LoadingState,
	parameters: {
		layout: 'centered',
	},
	tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof LoadingState>;

export const Default: Story = {};
