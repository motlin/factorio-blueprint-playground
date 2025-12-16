import type {Meta, StoryObj} from '@storybook/react-vite';

import {BlueprintInfoPanels} from './BlueprintInfoPanels';

const meta: Meta<typeof BlueprintInfoPanels> = {
	title: 'Blueprint/Panels/BlueprintInfoPanels',
	component: BlueprintInfoPanels,
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
type Story = StoryObj<typeof BlueprintInfoPanels>;

export const BlueprintWithContents: Story = {
	args: {
		blueprint: {
			blueprint: {
				item: 'blueprint',
				version: 562949954076673,
				entities: [
					{entity_number: 1, name: 'assembling-machine-3', position: {x: 0, y: 0}},
					{entity_number: 2, name: 'assembling-machine-3', position: {x: 3, y: 0}},
					{entity_number: 3, name: 'electric-furnace', position: {x: 6, y: 0}},
				],
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
					mappers: [
						{
							index: 0,
							from: {type: 'entity', name: 'transport-belt'},
							to: {type: 'entity', name: 'fast-transport-belt'},
						},
						{
							index: 1,
							from: {type: 'entity', name: 'inserter'},
							to: {type: 'entity', name: 'fast-inserter'},
						},
					],
				},
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
					trees_and_rocks_only: true,
				},
			},
		},
	},
};

export const EmptyBlueprint: Story = {
	args: {
		blueprint: {
			blueprint: {
				item: 'blueprint',
				version: 562949954076673,
			},
		},
	},
};

export const NoBlueprint: Story = {
	args: {
		blueprint: undefined,
	},
};
