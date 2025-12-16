import type {Meta, StoryObj} from '@storybook/react-vite';

import {RichText} from './RichText';

const meta: Meta<typeof RichText> = {
	title: 'Core/RichText',
	component: RichText,
	parameters: {
		layout: 'centered',
	},
	tags: ['autodocs'],
	argTypes: {
		iconSize: {
			control: 'radio',
			options: ['small', 'large'],
		},
	},
};

export default meta;
type Story = StoryObj<typeof RichText>;

export const PlainText: Story = {
	args: {
		text: 'This is plain text without any formatting',
		iconSize: 'small',
	},
};

export const WithColor: Story = {
	args: {
		text: '[color=red]Red text[/color] and [color=green]green text[/color]',
		iconSize: 'small',
	},
};

export const WithBold: Story = {
	args: {
		text: '[font=default-bold]This text is bold[/font]',
		iconSize: 'small',
	},
};

export const WithItemIcon: Story = {
	args: {
		text: 'Requires [item=iron-plate] and [item=copper-plate]',
		iconSize: 'small',
	},
};

export const WithLargeIcons: Story = {
	args: {
		text: 'Build [entity=assembling-machine-3] for production',
		iconSize: 'large',
	},
};

export const WithFluid: Story = {
	args: {
		text: 'Uses [fluid=water] and [fluid=crude-oil]',
		iconSize: 'small',
	},
};

export const WithVirtualSignal: Story = {
	args: {
		text: 'Signal: [virtual-signal=signal-A] [virtual-signal=signal-1]',
		iconSize: 'small',
	},
};

export const WithQuality: Story = {
	args: {
		text: 'Quality items: [item=iron-plate,quality=legendary] [item=copper-plate,quality=epic]',
		iconSize: 'large',
	},
};

export const MultipleLines: Story = {
	args: {
		text: 'Line 1: [item=iron-plate]\nLine 2: [item=copper-plate]\nLine 3: [item=steel-plate]',
		iconSize: 'small',
	},
};

export const ComplexFormatting: Story = {
	args: {
		text: '[color=yellow][font=default-bold]Blueprint Factory[/font][/color]\nProduces [item=electronic-circuit] at [color=green]100/min[/color]',
		iconSize: 'small',
	},
};

export const EmptyText: Story = {
	args: {
		text: '',
		iconSize: 'small',
	},
};

export const UndefinedText: Story = {
	args: {
		text: undefined,
		iconSize: 'small',
	},
};
