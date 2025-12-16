import type {Meta, StoryObj} from '@storybook/react-vite';
import {fn} from 'storybook/test';

import {TreeRow} from './TreeRow';

const meta: Meta<typeof TreeRow> = {
	title: 'Blueprint/Tree/TreeRow',
	component: TreeRow,
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
type Story = StoryObj<typeof TreeRow>;

export const BlueprintNode: Story = {
	args: {
		node: {
			path: '0',
			blueprint: {
				blueprint: {
					item: 'blueprint',
					version: 562949954076673,
					label: 'Iron Smelting',
					icons: [
						{index: 1, signal: {type: 'item', name: 'iron-plate'}},
						{index: 2, signal: {type: 'entity', name: 'electric-furnace'}},
					],
				},
			},
			children: [],
		},
		indentLevel: 0,
		isSelected: false,
		isActive: false,
		onSelect: fn(),
	},
};

export const SelectedNode: Story = {
	args: {
		node: {
			path: '0',
			blueprint: {
				blueprint: {
					item: 'blueprint',
					version: 562949954076673,
					label: 'Selected Blueprint',
					icons: [{index: 1, signal: {type: 'item', name: 'copper-plate'}}],
				},
			},
			children: [],
		},
		indentLevel: 0,
		isSelected: true,
		isActive: false,
		onSelect: fn(),
	},
};

export const ActiveNode: Story = {
	args: {
		node: {
			path: '0',
			blueprint: {
				blueprint: {
					item: 'blueprint',
					version: 562949954076673,
					label: 'Active Blueprint',
					icons: [{index: 1, signal: {type: 'item', name: 'steel-plate'}}],
				},
			},
			children: [],
		},
		indentLevel: 0,
		isSelected: false,
		isActive: true,
		onSelect: fn(),
	},
};

export const IndentedNode: Story = {
	args: {
		node: {
			path: '0.1',
			blueprint: {
				blueprint: {
					item: 'blueprint',
					version: 562949954076673,
					label: 'Nested Blueprint',
				},
			},
			children: [],
		},
		indentLevel: 2,
		isSelected: false,
		isActive: false,
		onSelect: fn(),
	},
};

export const BlueprintBookNode: Story = {
	args: {
		node: {
			path: '0',
			blueprint: {
				blueprint_book: {
					item: 'blueprint-book',
					version: 562949954076673,
					label: 'Factory Book',
					icons: [
						{index: 1, signal: {type: 'item', name: 'automation-science-pack'}},
						{index: 2, signal: {type: 'item', name: 'logistic-science-pack'}},
					],
					blueprints: [],
				},
			},
			children: [],
		},
		indentLevel: 0,
		isSelected: false,
		isActive: false,
		onSelect: fn(),
	},
};

export const NoLabel: Story = {
	args: {
		node: {
			path: '0',
			blueprint: {
				blueprint: {
					item: 'blueprint',
					version: 562949954076673,
				},
			},
			children: [],
		},
		indentLevel: 0,
		isSelected: false,
		isActive: false,
		onSelect: fn(),
	},
};

export const WithRichTextLabel: Story = {
	args: {
		node: {
			path: '0',
			blueprint: {
				blueprint: {
					item: 'blueprint',
					version: 562949954076673,
					label: '[color=green]Green Circuit[/color] Factory [item=electronic-circuit]',
					icons: [{index: 1, signal: {type: 'item', name: 'electronic-circuit'}}],
				},
			},
			children: [],
		},
		indentLevel: 0,
		isSelected: false,
		isActive: false,
		onSelect: fn(),
	},
};
