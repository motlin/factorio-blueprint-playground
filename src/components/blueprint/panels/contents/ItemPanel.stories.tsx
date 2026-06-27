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
		(StoryComponent) => (
			<div style={{minWidth: '400px'}}>
				<StoryComponent />
			</div>
		),
	],
};

export default meta;
type Story = StoryObj<typeof ItemPanel>;

// ItemPanel expects the Map keys produced by countItems: JSON.stringify({name, quality}).
const countMap = (entries: [string, number][]): Map<string, number> =>
	new Map(entries.map(([name, count]) => [JSON.stringify({name}), count]));

export const ItemsList: Story = {
	args: {
		title: 'Items',
		items: countMap([
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
		items: countMap([
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
		items: countMap([
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
		items: countMap([['iron-plate', 42]]),
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
