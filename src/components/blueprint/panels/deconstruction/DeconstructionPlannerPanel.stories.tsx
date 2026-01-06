import type {Meta, StoryObj} from '@storybook/react-vite';

import {DeconstructionPlannerPanel} from './DeconstructionPlannerPanel';

const meta: Meta<typeof DeconstructionPlannerPanel> = {
	title: 'Blueprint/Panels/Deconstruction/DeconstructionPlannerPanel',
	component: DeconstructionPlannerPanel,
	parameters: {
		layout: 'centered',
	},
	tags: ['autodocs'],
	decorators: [
		(StoryComponent) => (
			<div style={{minWidth: '600px'}}>
				<StoryComponent />
			</div>
		),
	],
};

export default meta;
type Story = StoryObj<typeof DeconstructionPlannerPanel>;

export const Default: Story = {
	args: {
		blueprint: {
			deconstruction_planner: {
				item: 'deconstruction-planner',
				version: 562949954076673,
				label: 'Basic Deconstruction',
				settings: {},
			},
		},
	},
};

export const TreesAndRocksOnly: Story = {
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

export const WithEntityFilters: Story = {
	args: {
		blueprint: {
			deconstruction_planner: {
				item: 'deconstruction-planner',
				version: 562949954076673,
				label: 'Entity Filter',
				settings: {
					entity_filter_mode: 0,
					entity_filters: [
						{index: 1, name: 'inserter'},
						{index: 2, name: 'fast-inserter'},
						{index: 3, name: 'stack-inserter'},
					],
				},
			},
		},
	},
};

export const WithBannedList: Story = {
	args: {
		blueprint: {
			deconstruction_planner: {
				item: 'deconstruction-planner',
				version: 562949954076673,
				label: 'Banned Entities',
				settings: {
					entity_filter_mode: 1,
					entity_filters: [
						{index: 1, name: 'roboport'},
						{index: 2, name: 'radar'},
					],
				},
			},
		},
	},
};

export const WithTileFilters: Story = {
	args: {
		blueprint: {
			deconstruction_planner: {
				item: 'deconstruction-planner',
				version: 562949954076673,
				label: 'Tile Filter',
				settings: {
					tile_selection_mode: 3,
					tile_filters: [
						{index: 1, name: 'stone-path'},
						{index: 2, name: 'concrete'},
					],
				},
			},
		},
	},
};

export const NeverDeconstructTiles: Story = {
	args: {
		blueprint: {
			deconstruction_planner: {
				item: 'deconstruction-planner',
				version: 562949954076673,
				label: 'No Tiles',
				settings: {
					tile_selection_mode: 2,
				},
			},
		},
	},
};

export const NotDeconstructionPlanner: Story = {
	args: {
		blueprint: {
			blueprint: {
				item: 'blueprint',
				version: 562949954076673,
			},
		},
	},
};
