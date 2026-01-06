import type {Meta, StoryObj} from '@storybook/react-vite';

import {UpgradePlannerPanel} from './UpgradePlannerPanel';

const meta: Meta<typeof UpgradePlannerPanel> = {
	title: 'Blueprint/Panels/Upgrade/UpgradePlannerPanel',
	component: UpgradePlannerPanel,
	parameters: {
		layout: 'centered',
	},
	tags: ['autodocs'],
	decorators: [
		(StoryComponent) => (
			<div style={{minWidth: '400px'}}>
				<StoryComponent />
			</div>
		),
	],
};

export default meta;
type Story = StoryObj<typeof UpgradePlannerPanel>;

export const SingleMapping: Story = {
	args: {
		blueprint: {
			upgrade_planner: {
				item: 'upgrade-planner',
				version: 562949954076673,
				label: 'Upgrade Inserters',
				settings: {
					mappers: [
						{
							index: 0,
							from: {type: 'entity', name: 'inserter'},
							to: {type: 'entity', name: 'fast-inserter'},
						},
					],
				},
			},
		},
	},
};

export const MultipleMappings: Story = {
	args: {
		blueprint: {
			upgrade_planner: {
				item: 'upgrade-planner',
				version: 562949954076673,
				label: 'Factory Upgrade',
				settings: {
					mappers: [
						{
							index: 0,
							from: {type: 'entity', name: 'assembling-machine-1'},
							to: {type: 'entity', name: 'assembling-machine-2'},
						},
						{
							index: 1,
							from: {type: 'entity', name: 'assembling-machine-2'},
							to: {type: 'entity', name: 'assembling-machine-3'},
						},
						{
							index: 2,
							from: {type: 'entity', name: 'stone-furnace'},
							to: {type: 'entity', name: 'electric-furnace'},
						},
					],
				},
			},
		},
	},
};

export const BeltUpgrade: Story = {
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
							from: {type: 'entity', name: 'underground-belt'},
							to: {type: 'entity', name: 'fast-underground-belt'},
						},
						{
							index: 2,
							from: {type: 'entity', name: 'splitter'},
							to: {type: 'entity', name: 'fast-splitter'},
						},
					],
				},
			},
		},
	},
};

export const EmptyMappings: Story = {
	args: {
		blueprint: {
			upgrade_planner: {
				item: 'upgrade-planner',
				version: 562949954076673,
				label: 'Empty Planner',
				settings: {
					mappers: [],
				},
			},
		},
	},
};

export const NotUpgradePlanner: Story = {
	args: {
		blueprint: {
			blueprint: {
				item: 'blueprint',
				version: 562949954076673,
			},
		},
	},
};
