import type {Meta, StoryObj} from '@storybook/react-vite';

import {TextCell} from './TextCell';

const meta: Meta<typeof TextCell> = {
	title: 'Blueprint/Spreadsheet/TextCell',
	component: TextCell,
	parameters: {
		layout: 'centered',
	},
	tags: ['autodocs'],
	decorators: [
		(Story) => (
			<div
				className="spreadsheet-container"
				style={{minWidth: '400px'}}
			>
				<Story />
			</div>
		),
	],
};

export default meta;
type Story = StoryObj<typeof TextCell>;

export const Default: Story = {
	args: {
		children: 'Text cell content',
	},
};

export const LeftAligned: Story = {
	args: {
		children: 'Left aligned text',
		align: 'left',
	},
};

export const CenterAligned: Story = {
	args: {
		children: 'Center aligned text',
		align: 'center',
	},
};

export const RightAligned: Story = {
	args: {
		children: 'Right aligned text',
		align: 'right',
	},
};

export const FixedWidth: Story = {
	args: {
		children: 'Fixed width text',
		width: '200px',
	},
};

export const NonGrowable: Story = {
	args: {
		children: 'This cell does not grow',
		grow: false,
	},
};
