import type {Meta, StoryObj} from '@storybook/react-vite';

import {EmptyHistoryState} from './EmptyHistoryState';

const meta: Meta<typeof EmptyHistoryState> = {
	title: 'History/Views/EmptyHistoryState',
	component: EmptyHistoryState,
	parameters: {
		layout: 'centered',
	},
	tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof EmptyHistoryState>;

export const Default: Story = {};
