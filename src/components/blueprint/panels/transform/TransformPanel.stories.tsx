import type {Meta, StoryObj} from '@storybook/react-vite';
import {createMemoryHistory, createRootRoute, createRouter, RouterProvider} from '@tanstack/react-router';

import type {BlueprintString} from '../../../../parsing/types';
import {TransformPanel} from './TransformPanel';

const meta: Meta<typeof TransformPanel> = {
	title: 'Blueprint/Panels/Transform/TransformPanel',
	component: TransformPanel,
	parameters: {
		layout: 'centered',
	},
	tags: ['autodocs'],
	decorators: [
		(StoryComponent) => {
			const rootRoute = createRootRoute({
				component: () => (
					<div style={{minWidth: '500px'}}>
						<StoryComponent />
					</div>
				),
			});
			const router = createRouter({routeTree: rootRoute, history: createMemoryHistory({initialEntries: ['/']})});

			return <RouterProvider router={router} />;
		},
	],
};

export default meta;
type Story = StoryObj<typeof TransformPanel>;

const planner: BlueprintString = {
	upgrade_planner: {
		item: 'upgrade-planner',
		label: "Alice's belt planner",
		version: 0,
		settings: {
			mappers: [
				{
					index: 100,
					from: {type: 'entity', name: 'transport-belt'},
					to: {type: 'entity', name: 'express-transport-belt'},
				},
			],
		},
	},
};

const plannerBook: BlueprintString = {
	blueprint_book: {
		item: 'blueprint-book',
		version: 0,
		blueprints: [
			{
				index: 100,
				blueprint: {
					item: 'blueprint',
					version: 0,
					entities: [{entity_number: 100, name: 'transport-belt', position: {x: 0, y: 0}}],
				},
			},
			{index: 200, ...planner},
		],
	},
};

export const Blueprint: Story = {
	args: {
		blueprint: {
			blueprint: {
				item: 'blueprint',
				label: 'Belt test',
				version: 0,
				entities: [{entity_number: 1, name: 'transport-belt', position: {x: 0, y: 0}}],
			},
		},
	},
};

export const BlueprintBook: Story = {
	args: {
		blueprint: {
			blueprint_book: {
				item: 'blueprint-book',
				label: 'Factory test book',
				version: 0,
				blueprints: [],
			},
		},
	},
};

export const Planner: Story = {
	args: {
		blueprint: planner,
		rootBlueprint: plannerBook,
		selectedPath: '2',
	},
};
