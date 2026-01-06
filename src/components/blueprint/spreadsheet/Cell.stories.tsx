import type {Meta, StoryObj} from '@storybook/react-vite';

import {Cell} from './Cell';

const meta: Meta<typeof Cell> = {
	title: 'Blueprint/Spreadsheet/Cell',
	component: Cell,
	parameters: {
		layout: 'centered',
	},
	tags: ['autodocs'],
	decorators: [
		(StoryComponent) => (
			<div
				className="spreadsheet-container"
				style={{minWidth: '400px'}}
			>
				<StoryComponent />
			</div>
		),
	],
};

export default meta;
type Story = StoryObj<typeof Cell>;

export const Default: Story = {
	args: {
		children: 'Cell content',
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
		children: 'Fixed width',
		width: '200px',
	},
};

export const Growable: Story = {
	args: {
		children: 'This cell can grow',
		grow: true,
	},
};

export const Shrinkable: Story = {
	args: {
		children: 'This cell can shrink when space is limited',
		shrink: true,
	},
};
