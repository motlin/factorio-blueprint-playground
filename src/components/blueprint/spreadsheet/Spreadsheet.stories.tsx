import type {Meta, StoryObj} from '@storybook/react-vite';

import {Cell} from './Cell';
import {Row} from './Row';
import {Spreadsheet} from './Spreadsheet';

const meta: Meta<typeof Spreadsheet> = {
	title: 'Blueprint/Spreadsheet/Spreadsheet',
	component: Spreadsheet,
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
type Story = StoryObj<typeof Spreadsheet>;

export const WithRows: Story = {
	args: {
		children: (
			<>
				<Row>
					<Cell width="100px">Item 1</Cell>
					<Cell grow>Description of item 1</Cell>
					<Cell
						width="80px"
						align="right"
					>
						100
					</Cell>
				</Row>
				<Row>
					<Cell width="100px">Item 2</Cell>
					<Cell grow>Description of item 2</Cell>
					<Cell
						width="80px"
						align="right"
					>
						250
					</Cell>
				</Row>
				<Row>
					<Cell width="100px">Item 3</Cell>
					<Cell grow>Description of item 3</Cell>
					<Cell
						width="80px"
						align="right"
					>
						75
					</Cell>
				</Row>
			</>
		),
	},
};

export const Empty: Story = {
	args: {
		children: null,
	},
};

export const EmptyWithCustomText: Story = {
	args: {
		children: null,
		emptyText: 'No items to display',
	},
};

export const SingleRow: Story = {
	args: {
		children: (
			<Row>
				<Cell grow>Single row content</Cell>
			</Row>
		),
	},
};
