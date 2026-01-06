import type {Meta, StoryObj} from '@storybook/react-vite';

import {Cell} from './Cell';
import {Row} from './Row';

const meta: Meta<typeof Row> = {
	title: 'Blueprint/Spreadsheet/Row',
	component: Row,
	parameters: {
		layout: 'centered',
	},
	tags: ['autodocs'],
	decorators: [
		(StoryComponent) => (
			<div
				className="spreadsheet-container"
				style={{minWidth: '600px'}}
			>
				<StoryComponent />
			</div>
		),
	],
};

export default meta;
type Story = StoryObj<typeof Row>;

export const Default: Story = {
	args: {
		children: (
			<>
				<Cell>Column 1</Cell>
				<Cell>Column 2</Cell>
				<Cell>Column 3</Cell>
			</>
		),
	},
};

export const WithMixedAlignment: Story = {
	args: {
		children: (
			<>
				<Cell align="left">Left</Cell>
				<Cell align="center">Center</Cell>
				<Cell align="right">Right</Cell>
			</>
		),
	},
};

export const WithFixedAndGrowable: Story = {
	args: {
		children: (
			<>
				<Cell width="100px">Fixed</Cell>
				<Cell grow>Growable content that takes remaining space</Cell>
				<Cell width="100px">Fixed</Cell>
			</>
		),
	},
};
