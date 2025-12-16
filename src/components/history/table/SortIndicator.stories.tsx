import type {Meta, StoryObj} from '@storybook/react-vite';

import {SortIndicator} from './SortIndicator';

const meta: Meta<typeof SortIndicator> = {
	title: 'History/Table/SortIndicator',
	component: SortIndicator,
	parameters: {
		layout: 'centered',
	},
	tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof SortIndicator>;

export const Ascending: Story = {
	args: {
		direction: 'asc',
	},
};

export const Descending: Story = {
	args: {
		direction: 'desc',
	},
};

export const Null: Story = {
	args: {
		direction: null,
	},
};

export const WithClassName: Story = {
	args: {
		direction: 'asc',
		className: 'custom-class',
	},
};
