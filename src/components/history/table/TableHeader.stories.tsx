import type {Meta, StoryObj} from '@storybook/react-vite';
import {fn} from 'storybook/test';

import {TableHeader} from './TableHeader';

const meta: Meta<typeof TableHeader> = {
	title: 'History/Table/TableHeader',
	component: TableHeader,
	parameters: {
		layout: 'centered',
	},
	tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof TableHeader>;

export const Default: Story = {
	args: {
		label: 'Column Header',
	},
};

export const Sortable: Story = {
	args: {
		label: 'Sortable Column',
		onSort: fn(),
	},
};

export const SortableAscending: Story = {
	args: {
		label: 'Sorted Ascending',
		sortDirection: 'asc',
		onSort: fn(),
	},
};

export const SortableDescending: Story = {
	args: {
		label: 'Sorted Descending',
		sortDirection: 'desc',
		onSort: fn(),
	},
};

export const WithCustomClass: Story = {
	args: {
		label: 'Custom Styled',
		className: 'custom-header-class',
	},
};
