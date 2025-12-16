import type {Meta, StoryObj} from '@storybook/react-vite';

import {ItemPanel} from './ItemPanel';

const meta: Meta<typeof ItemPanel> = {
	title: 'Blueprint/Panels/Contents/ItemPanel',
	component: ItemPanel,
	parameters: {
		layout: 'centered',
	},
	tags: ['autodocs'],
	decorators: [
		(Story) => (
			<div style={{minWidth: '400px'}}>
				<Story />
			</div>
		),
	],
};

export default meta;
type Story = StoryObj<typeof ItemPanel>;

export const ItemsList: Story = {
	args: {
		title: 'Items',
		items: new Map([
			['iron-plate', 100],
			['copper-plate', 200],
			['steel-plate', 50],
		]),
		type: 'item',
	},
};

export const FluidsList: Story = {
	args: {
		title: 'Fluids',
		items: new Map([
			['water', 1000],
			['crude-oil', 500],
			['petroleum-gas', 250],
		]),
		type: 'fluid',
	},
};

export const EntitiesList: Story = {
	args: {
		title: 'Entities',
		items: new Map([
			['assembling-machine-3', 10],
			['electric-furnace', 5],
			['beacon', 8],
		]),
		type: 'entity',
	},
};

export const SingleItem: Story = {
	args: {
		title: 'Single Item',
		items: new Map([['iron-plate', 42]]),
		type: 'item',
	},
};

export const EmptyList: Story = {
	args: {
		title: 'Empty Items',
		items: new Map(),
		type: 'item',
	},
};
