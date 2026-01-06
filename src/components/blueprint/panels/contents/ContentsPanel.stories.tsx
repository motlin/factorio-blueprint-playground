import type {Meta, StoryObj} from '@storybook/react-vite';

import {ContentsPanel} from './ContentsPanel';

const meta: Meta<typeof ContentsPanel> = {
	title: 'Blueprint/Panels/Contents/ContentsPanel',
	component: ContentsPanel,
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
type Story = StoryObj<typeof ContentsPanel>;

export const WithEntities: Story = {
	args: {
		blueprint: {
			blueprint: {
				item: 'blueprint',
				version: 562949954076673,
				entities: [
					{entity_number: 1, name: 'assembling-machine-3', position: {x: 0, y: 0}},
					{entity_number: 2, name: 'assembling-machine-3', position: {x: 3, y: 0}},
					{entity_number: 3, name: 'electric-furnace', position: {x: 6, y: 0}},
					{entity_number: 4, name: 'beacon', position: {x: 0, y: 3}},
					{entity_number: 5, name: 'beacon', position: {x: 3, y: 3}},
				],
			},
		},
	},
};

export const WithTiles: Story = {
	args: {
		blueprint: {
			blueprint: {
				item: 'blueprint',
				version: 562949954076673,
				entities: [{entity_number: 1, name: 'assembling-machine-1', position: {x: 0, y: 0}}],
				tiles: [
					{position: {x: 0, y: 0}, name: 'refined-concrete'},
					{position: {x: 1, y: 0}, name: 'refined-concrete'},
					{position: {x: 0, y: 1}, name: 'refined-concrete'},
					{position: {x: 1, y: 1}, name: 'concrete'},
				],
			},
		},
	},
};

export const WithRecipes: Story = {
	args: {
		blueprint: {
			blueprint: {
				item: 'blueprint',
				version: 562949954076673,
				entities: [
					{
						entity_number: 1,
						name: 'assembling-machine-3',
						position: {x: 0, y: 0},
						recipe: 'electronic-circuit',
					},
					{
						entity_number: 2,
						name: 'assembling-machine-3',
						position: {x: 3, y: 0},
						recipe: 'electronic-circuit',
					},
					{entity_number: 3, name: 'chemical-plant', position: {x: 6, y: 0}, recipe: 'sulfuric-acid'},
				],
			},
		},
	},
};

export const Empty: Story = {
	args: {
		blueprint: {
			blueprint: {
				item: 'blueprint',
				version: 562949954076673,
			},
		},
	},
};

export const NonBlueprintType: Story = {
	args: {
		blueprint: {
			deconstruction_planner: {
				item: 'deconstruction-planner',
				version: 562949954076673,
				label: 'Deconstruction',
				settings: {},
			},
		},
	},
};
