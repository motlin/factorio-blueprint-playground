import type {Meta, StoryObj} from '@storybook/react-vite';

import {IconCell} from './IconCell';

const meta: Meta<typeof IconCell> = {
	title: 'Blueprint/Spreadsheet/IconCell',
	component: IconCell,
	parameters: {
		layout: 'centered',
	},
	tags: ['autodocs'],
	decorators: [
		(Story) => (
			<div
				className="spreadsheet-container"
				style={{minWidth: '200px'}}
			>
				<Story />
			</div>
		),
	],
};

export default meta;
type Story = StoryObj<typeof IconCell>;

export const ItemIcon: Story = {
	args: {
		icon: {
			type: 'item',
			name: 'iron-plate',
		},
	},
};

export const ItemIconWithLabel: Story = {
	args: {
		icon: {
			type: 'item',
			name: 'copper-plate',
		},
		label: 'Copper Plate',
	},
};

export const FluidIcon: Story = {
	args: {
		icon: {
			type: 'fluid',
			name: 'water',
		},
		label: 'Water',
	},
};

export const EntityIcon: Story = {
	args: {
		icon: {
			type: 'entity',
			name: 'assembling-machine-3',
		},
		label: 'Assembler 3',
	},
};

export const VirtualSignalIcon: Story = {
	args: {
		icon: {
			type: 'virtual-signal',
			name: 'signal-A',
		},
		label: 'Signal A',
	},
};

export const WithQuality: Story = {
	args: {
		icon: {
			type: 'item',
			name: 'iron-plate',
			quality: 'legendary',
		},
		label: 'Legendary Iron',
	},
};
