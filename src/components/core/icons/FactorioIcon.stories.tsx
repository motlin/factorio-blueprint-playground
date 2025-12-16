import type {Meta, StoryObj} from '@storybook/react-vite';

import {FactorioIcon, Placeholder} from './FactorioIcon';

const meta: Meta<typeof FactorioIcon> = {
	title: 'Core/FactorioIcon',
	component: FactorioIcon,
	parameters: {
		layout: 'centered',
	},
	tags: ['autodocs'],
	argTypes: {
		size: {
			control: 'radio',
			options: ['small', 'large'],
		},
	},
};

export default meta;
type Story = StoryObj<typeof FactorioIcon>;

export const ItemSmall: Story = {
	args: {
		icon: {
			type: 'item',
			name: 'iron-plate',
		},
		size: 'small',
	},
};

export const ItemLarge: Story = {
	args: {
		icon: {
			type: 'item',
			name: 'iron-plate',
		},
		size: 'large',
	},
};

export const Fluid: Story = {
	args: {
		icon: {
			type: 'fluid',
			name: 'water',
		},
		size: 'large',
	},
};

export const VirtualSignal: Story = {
	args: {
		icon: {
			type: 'virtual-signal',
			name: 'signal-A',
		},
		size: 'large',
	},
};

export const Entity: Story = {
	args: {
		icon: {
			type: 'entity',
			name: 'assembling-machine-3',
		},
		size: 'large',
	},
};

export const WithQuality: Story = {
	args: {
		icon: {
			type: 'item',
			name: 'iron-plate',
			quality: 'legendary',
		},
		size: 'large',
	},
};

export const WithUncommonQuality: Story = {
	args: {
		icon: {
			type: 'item',
			name: 'copper-plate',
			quality: 'uncommon',
		},
		size: 'large',
	},
};

export const WithRareQuality: Story = {
	args: {
		icon: {
			type: 'item',
			name: 'steel-plate',
			quality: 'rare',
		},
		size: 'large',
	},
};

export const WithEpicQuality: Story = {
	args: {
		icon: {
			type: 'entity',
			name: 'electric-furnace',
			quality: 'epic',
		},
		size: 'large',
	},
};

export const NoIcon: Story = {
	args: {
		icon: undefined,
		size: 'large',
	},
};

export const IconPlaceholder: StoryObj<typeof Placeholder> = {
	render: () => <Placeholder size="large" />,
};
