import type {Meta, StoryObj} from '@storybook/react-vite';
import {fn} from 'storybook/test';

import {blueprintComponentRemovalKey} from '../../../../transform/componentRemoval';
import {BlueprintComponentsGrid} from './BlueprintComponentsGrid';
import {transformStoryParameters} from './transformStoryParameters';

const meta = {
	title: 'Blueprint/Panels/Transform/BlueprintComponentsGrid',
	component: BlueprintComponentsGrid,
	args: {
		blueprint: {
			blueprint: {
				item: 'blueprint',
				version: 0,
				entities: [
					{entity_number: 100, name: 'transport-belt', position: {x: 0, y: 0}},
					{entity_number: 200, name: 'transport-belt', position: {x: 1, y: 0}},
					{entity_number: 300, name: 'assembling-machine-2', position: {x: 2, y: 0}},
				],
				tiles: [{name: 'concrete', position: {x: 0, y: 0}}],
			},
		},
		onComponentRemovedChange: fn(),
		removedComponents: new Set(),
	},
	parameters: transformStoryParameters,
	tags: ['autodocs'],
} satisfies Meta<typeof BlueprintComponentsGrid>;

export default meta;
type Story = StoryObj<typeof meta>;

export const InventoryGrid: Story = {};

export const RemovedComponent: Story = {
	args: {
		removedComponents: new Set([blueprintComponentRemovalKey({type: 'entity', name: 'transport-belt'})]),
	},
};
