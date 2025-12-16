import type {Meta, StoryObj} from '@storybook/react-vite';

import FilterRowsDisplay from './FilterRowsDisplay';

const meta: Meta<typeof FilterRowsDisplay> = {
	title: 'Blueprint/Panels/Deconstruction/FilterRowsDisplay',
	component: FilterRowsDisplay,
	parameters: {
		layout: 'centered',
	},
	tags: ['autodocs'],
	decorators: [
		(Story) => (
			<div style={{minWidth: '600px'}}>
				<Story />
			</div>
		),
	],
};

export default meta;
type Story = StoryObj<typeof FilterRowsDisplay>;

export const EntityFilters: Story = {
	args: {
		filters: [
			{index: 1, name: 'inserter'},
			{index: 2, name: 'fast-inserter'},
			{index: 3, name: 'stack-inserter'},
		],
		type: 'entity',
		label: 'Entity Filters',
	},
};

export const ItemFilters: Story = {
	args: {
		filters: [
			{index: 1, name: 'iron-plate', count: 100},
			{index: 2, name: 'copper-plate', count: 200},
		],
		type: 'item',
		label: 'Item Filters',
	},
};

export const TileFilters: Story = {
	args: {
		filters: [
			{index: 1, name: 'stone-path'},
			{index: 2, name: 'concrete'},
			{index: 3, name: 'refined-concrete'},
		],
		type: 'tile',
		label: 'Tile Filters',
	},
};

export const WithQualityFilters: Story = {
	args: {
		filters: [
			{index: 1, name: 'iron-plate', quality: 'legendary'},
			{index: 2, name: 'copper-plate', quality: 'epic'},
		],
		type: 'item',
		label: 'Quality Items',
	},
};

export const EmptyFilters: Story = {
	args: {
		filters: [],
		type: 'item',
		label: 'Empty',
	},
};
