import type {Meta, StoryObj} from '@storybook/react-vite';
import {fn} from 'storybook/test';

import {BlueprintTree} from './BlueprintTree';

const meta: Meta<typeof BlueprintTree> = {
	title: 'Blueprint/Tree/BlueprintTree',
	component: BlueprintTree,
	parameters: {
		layout: 'centered',
	},
	tags: ['autodocs'],
	decorators: [
		(Story) => (
			<div style={{minWidth: '500px'}}>
				<Story />
			</div>
		),
	],
};

export default meta;
type Story = StoryObj<typeof BlueprintTree>;

export const SingleBlueprint: Story = {
	args: {
		rootBlueprint: {
			blueprint: {
				item: 'blueprint',
				version: 562949954076673,
				label: 'Iron Smelting',
				icons: [{index: 1, signal: {type: 'item', name: 'iron-plate'}}],
			},
		},
		selectedPath: '',
		onSelect: fn(),
	},
};

export const BlueprintBook: Story = {
	args: {
		rootBlueprint: {
			blueprint_book: {
				item: 'blueprint-book',
				version: 562949954076673,
				label: 'Factory Book',
				icons: [{index: 1, signal: {type: 'item', name: 'automation-science-pack'}}],
				active_index: 0,
				blueprints: [
					{
						index: 0,
						blueprint: {
							item: 'blueprint',
							version: 562949954076673,
							label: 'Iron Smelting',
							icons: [{index: 1, signal: {type: 'item', name: 'iron-plate'}}],
						},
					},
					{
						index: 1,
						blueprint: {
							item: 'blueprint',
							version: 562949954076673,
							label: 'Copper Smelting',
							icons: [{index: 1, signal: {type: 'item', name: 'copper-plate'}}],
						},
					},
					{
						index: 2,
						blueprint: {
							item: 'blueprint',
							version: 562949954076673,
							label: 'Steel Smelting',
							icons: [{index: 1, signal: {type: 'item', name: 'steel-plate'}}],
						},
					},
				],
			},
		},
		selectedPath: '',
		onSelect: fn(),
	},
};

export const NestedBlueprintBooks: Story = {
	args: {
		rootBlueprint: {
			blueprint_book: {
				item: 'blueprint-book',
				version: 562949954076673,
				label: 'Master Book',
				icons: [{index: 1, signal: {type: 'item', name: 'logistic-science-pack'}}],
				active_index: 0,
				blueprints: [
					{
						index: 0,
						blueprint_book: {
							item: 'blueprint-book',
							version: 562949954076673,
							label: 'Smelting',
							icons: [{index: 1, signal: {type: 'entity', name: 'electric-furnace'}}],
							blueprints: [
								{
									index: 0,
									blueprint: {
										item: 'blueprint',
										version: 562949954076673,
										label: 'Iron Array',
									},
								},
								{
									index: 1,
									blueprint: {
										item: 'blueprint',
										version: 562949954076673,
										label: 'Copper Array',
									},
								},
							],
						},
					},
					{
						index: 1,
						blueprint: {
							item: 'blueprint',
							version: 562949954076673,
							label: 'Main Bus',
						},
					},
				],
			},
		},
		selectedPath: '0',
		onSelect: fn(),
	},
};

export const WithSelection: Story = {
	args: {
		rootBlueprint: {
			blueprint_book: {
				item: 'blueprint-book',
				version: 562949954076673,
				label: 'Test Book',
				blueprints: [
					{
						index: 0,
						blueprint: {
							item: 'blueprint',
							version: 562949954076673,
							label: 'First',
						},
					},
					{
						index: 1,
						blueprint: {
							item: 'blueprint',
							version: 562949954076673,
							label: 'Selected',
						},
					},
				],
			},
		},
		selectedPath: '1',
		onSelect: fn(),
	},
};

export const Empty: Story = {
	args: {
		rootBlueprint: undefined,
		selectedPath: '',
		onSelect: fn(),
	},
};
