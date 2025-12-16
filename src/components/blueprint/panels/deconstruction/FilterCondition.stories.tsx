import type {Meta, StoryObj} from '@storybook/react-vite';

import FilterCondition from './FilterCondition';

const meta: Meta<typeof FilterCondition> = {
	title: 'Blueprint/Panels/Deconstruction/FilterCondition',
	component: FilterCondition,
	parameters: {
		layout: 'centered',
	},
	tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof FilterCondition>;

export const BasicFilter: Story = {
	args: {
		filter: {
			index: 1,
			name: 'iron-plate',
		},
	},
};

export const WithCount: Story = {
	args: {
		filter: {
			index: 1,
			name: 'iron-plate',
			count: 100,
		},
	},
};

export const WithComparator: Story = {
	args: {
		filter: {
			index: 1,
			name: 'copper-plate',
			comparator: '>',
			count: 50,
		},
	},
};

export const WithQuality: Story = {
	args: {
		filter: {
			index: 1,
			name: 'iron-plate',
			quality: 'legendary',
		},
	},
};

export const WithCountRange: Story = {
	args: {
		filter: {
			index: 1,
			name: 'steel-plate',
			count: 10,
			max_count: 100,
		},
	},
};

export const FullFilter: Story = {
	args: {
		filter: {
			index: 1,
			name: 'electronic-circuit',
			comparator: '>=',
			quality: 'epic',
			count: 25,
			max_count: 500,
		},
	},
};
