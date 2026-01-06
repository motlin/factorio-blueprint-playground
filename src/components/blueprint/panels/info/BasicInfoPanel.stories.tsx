import type {Meta, StoryObj} from '@storybook/react-vite';

import {BasicInfoPanel} from './BasicInfoPanel';

const meta: Meta<typeof BasicInfoPanel> = {
	title: 'Blueprint/Panels/Info/BasicInfoPanel',
	component: BasicInfoPanel,
	parameters: {
		layout: 'centered',
	},
	tags: ['autodocs'],
	decorators: [
		(StoryComponent) => (
			<div style={{minWidth: '500px'}}>
				<StoryComponent />
			</div>
		),
	],
};

export default meta;
type Story = StoryObj<typeof BasicInfoPanel>;

export const FullBlueprint: Story = {
	args: {
		blueprint: {
			blueprint: {
				item: 'blueprint',
				version: 562949954076673,
				label: 'Iron Smelting Setup',
				description: 'A basic iron smelting array with 48 furnaces',
				icons: [
					{index: 1, signal: {type: 'item', name: 'iron-plate'}},
					{index: 2, signal: {type: 'entity', name: 'electric-furnace'}},
					{index: 3, signal: {type: 'item', name: 'iron-ore'}},
				],
			},
		},
	},
};

export const MinimalBlueprint: Story = {
	args: {
		blueprint: {
			blueprint: {
				item: 'blueprint',
				version: 562949954076673,
			},
		},
	},
};

export const BlueprintBook: Story = {
	args: {
		blueprint: {
			blueprint_book: {
				item: 'blueprint-book',
				version: 562949954076673,
				label: 'Factory Collection',
				description: 'Collection of production blueprints',
				icons: [
					{index: 1, signal: {type: 'item', name: 'automation-science-pack'}},
					{index: 2, signal: {type: 'item', name: 'logistic-science-pack'}},
				],
				blueprints: [],
			},
		},
	},
};

export const DeconstructionPlanner: Story = {
	args: {
		blueprint: {
			deconstruction_planner: {
				item: 'deconstruction-planner',
				version: 562949954076673,
				label: 'Clear Trees',
				settings: {
					description: 'Removes all trees and rocks from an area',
				},
			},
		},
	},
};

export const UpgradePlanner: Story = {
	args: {
		blueprint: {
			upgrade_planner: {
				item: 'upgrade-planner',
				version: 562949954076673,
				label: 'Belt Upgrade',
				settings: {
					description: 'Upgrades yellow belts to red belts',
					mappers: [],
				},
			},
		},
	},
};

export const WithRichTextLabel: Story = {
	args: {
		blueprint: {
			blueprint: {
				item: 'blueprint',
				version: 562949954076673,
				label: '[color=green]Green Circuit[/color] Factory',
				description: 'Produces [item=electronic-circuit] at 100/min',
				icons: [{index: 1, signal: {type: 'item', name: 'electronic-circuit'}}],
			},
		},
	},
};

export const AllFourIcons: Story = {
	args: {
		blueprint: {
			blueprint: {
				item: 'blueprint',
				version: 562949954076673,
				label: 'Four Icons',
				icons: [
					{index: 1, signal: {type: 'item', name: 'iron-plate'}},
					{index: 2, signal: {type: 'item', name: 'copper-plate'}},
					{index: 3, signal: {type: 'item', name: 'steel-plate'}},
					{index: 4, signal: {type: 'fluid', name: 'water'}},
				],
			},
		},
	},
};

export const NoBlueprint: Story = {
	args: {
		blueprint: undefined,
	},
};
