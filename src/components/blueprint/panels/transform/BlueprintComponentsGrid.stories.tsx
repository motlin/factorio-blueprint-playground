import type {Meta, StoryObj} from '@storybook/react-vite';
import {expect, fn, within} from 'storybook/test';

import {blueprintComponentRemovalKey} from '../../../../transform/componentRemoval';
import type {BlueprintString} from '../../../../parsing/types';
import {BlueprintComponentsGrid} from './BlueprintComponentsGrid';
import {transformStoryParameters} from './transformStoryParameters';

const emptyBlueprint: BlueprintString = {
	blueprint: {
		item: 'blueprint',
		version: 0,
	},
};

const multipleRowsBlueprint: BlueprintString = {
	blueprint: {
		item: 'blueprint',
		version: 0,
		entities: [
			{entity_number: 1, name: 'transport-belt', position: {x: 0, y: 0}},
			{entity_number: 2, name: 'fast-transport-belt', position: {x: 1, y: 0}},
			{entity_number: 3, name: 'express-transport-belt', position: {x: 2, y: 0}},
			{entity_number: 4, name: 'underground-belt', position: {x: 3, y: 0}},
			{entity_number: 5, name: 'fast-underground-belt', position: {x: 4, y: 0}},
			{entity_number: 6, name: 'express-underground-belt', position: {x: 5, y: 0}},
			{entity_number: 7, name: 'splitter', position: {x: 6, y: 0}},
			{entity_number: 8, name: 'fast-splitter', position: {x: 7, y: 0}},
			{entity_number: 9, name: 'express-splitter', position: {x: 8, y: 0}},
			{entity_number: 10, name: 'inserter', position: {x: 9, y: 0}},
			{entity_number: 11, name: 'fast-inserter', position: {x: 10, y: 0}},
			{entity_number: 12, name: 'bulk-inserter', position: {x: 11, y: 0}},
			{entity_number: 13, name: 'assembling-machine-2', position: {x: 12, y: 0}},
			{entity_number: 14, name: 'electric-mining-drill', position: {x: 13, y: 0}},
		],
		tiles: [
			{name: 'concrete', position: {x: 0, y: 1}},
			{name: 'refined-concrete', position: {x: 1, y: 1}},
		],
	},
};

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
	decorators: [
		(StoryComponent) => (
			<div style={{width: 'min(432px, 100vw)'}}>
				<StoryComponent />
			</div>
		),
	],
	tags: ['autodocs', 'visual-conformance'],
} satisfies Meta<typeof BlueprintComponentsGrid>;

export default meta;
type Story = StoryObj<typeof meta>;

export const InventoryGrid: Story = {
	play: async ({canvasElement}) => {
		const canvas = within(canvasElement);
		const section = canvas.getByRole('region', {name: 'Blueprint components'}).closest('section');
		const scroll = canvas.getByRole('region', {name: 'Blueprint components'});
		const grid = canvas.getByRole('list', {name: 'Blueprint component slots'});
		if (section === null) {
			throw new Error('Expected the components frame.');
		}
		await expect({
			columns: getComputedStyle(grid).gridTemplateColumns.split(' ').length,
			frameSource: section.dataset.factorioSource,
			frameStyle: section.dataset.factorioStyle,
			gridWidth: grid.getBoundingClientRect().width,
			scrollSource: scroll.dataset.factorioSource,
			scrollStyle: scroll.dataset.factorioStyle,
			slotCount: grid.children.length,
		}).toStrictEqual({
			columns: 10,
			frameSource: 'BlueprintSettingsGui::makeComponentsFrame',
			frameStyle: 'bordered_frame',
			gridWidth: 400,
			scrollSource: 'BlueprintSettingsGui::makeComponentsFrame',
			scrollStyle: 'deep_slots_scroll_pane',
			slotCount: 10,
		});
	},
};

export const RemovedComponent: Story = {
	args: {
		removedComponents: new Set([blueprintComponentRemovalKey({type: 'entity', name: 'transport-belt'})]),
	},
};

export const Empty: Story = {
	args: {
		blueprint: emptyBlueprint,
	},
	play: async ({canvasElement}) => {
		const canvas = within(canvasElement);
		const scroll = canvas.getByRole('region', {name: 'Blueprint components'});
		const grid = canvas.getByRole('list', {name: 'Blueprint component slots'});
		await expect({
			description: scroll.getAttribute('aria-describedby'),
			emptySlots: grid.querySelectorAll('.blueprint-components__slot--empty').length,
			slotCount: grid.children.length,
		}).toStrictEqual({
			description: canvas.getByText('No components in this blueprint.').id,
			emptySlots: 10,
			slotCount: 10,
		});
	},
};

export const MultipleRows: Story = {
	args: {
		blueprint: multipleRowsBlueprint,
	},
	play: async ({canvasElement}) => {
		const canvas = within(canvasElement);
		const grid = canvas.getByRole('list', {name: 'Blueprint component slots'});
		await expect({
			columns: getComputedStyle(grid).gridTemplateColumns.split(' ').length,
			rows: getComputedStyle(grid).gridTemplateRows.split(' ').length,
			slotCount: grid.children.length,
		}).toStrictEqual({
			columns: 10,
			rows: 2,
			slotCount: 20,
		});
	},
};
