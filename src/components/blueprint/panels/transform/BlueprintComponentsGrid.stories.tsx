import type {Meta, StoryObj} from '@storybook/react-vite';
import {useState} from 'react';
import {expect, fn, userEvent, within} from 'storybook/test';

import {blueprintComponentRemovalKey} from '../../../../transform/componentRemoval';
import type {BlueprintString} from '../../../../parsing/types';
import type {BlueprintComponentRemovalKey} from '../../../../transform/componentRemoval';
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

export const HoveredComponentTooltip: Story = {
	play: async ({canvasElement}) => {
		const canvas = within(canvasElement);
		const documentBody = within(canvasElement.ownerDocument.body);
		const transportBelt = canvas.getByRole('button', {name: /Transport belt, 2/});
		await userEvent.hover(transportBelt);
		const tooltip = documentBody.getByRole('tooltip', {name: /Transport belt/});
		await expect({
			action: tooltip.textContent,
			open: tooltip.dataset.factorioTooltipOpen,
			selectable: getComputedStyle(tooltip).userSelect,
			triggerDescription: transportBelt.getAttribute('aria-describedby'),
		}).toStrictEqual({
			action: 'Transport beltentity:transport-beltRight-click to remove all components of this type.',
			open: 'true',
			selectable: 'text',
			triggerDescription: tooltip.id,
		});
	},
};

export const RemovedComponent: Story = {
	args: {
		removedComponents: new Set([blueprintComponentRemovalKey({type: 'entity', name: 'transport-belt'})]),
	},
	play: async ({canvasElement}) => {
		const canvas = within(canvasElement);
		const documentBody = within(canvasElement.ownerDocument.body);
		const transportBelt = canvas.getByRole('button', {name: /Transport belt, removed/});
		transportBelt.focus();
		const tooltip = documentBody.getByRole('tooltip', {name: /Transport belt/});
		await expect({
			count: transportBelt.querySelector('.blueprint-components__count')?.textContent,
			open: tooltip.dataset.factorioTooltipOpen,
			slotState: transportBelt.dataset.componentSlotState,
			slotStyle: transportBelt.dataset.factorioSlotStyle,
			tooltip: tooltip.textContent,
		}).toStrictEqual({
			count: '0',
			open: 'true',
			slotState: 'removed',
			slotStyle: 'red_slot_button',
			tooltip: 'Transport beltentity:transport-beltLeft-click to add all components of this type back.',
		});
	},
};

function InteractiveComponentsGrid({blueprint}: {blueprint: BlueprintString}) {
	const [removedComponents, setRemovedComponents] = useState<ReadonlySet<BlueprintComponentRemovalKey>>(new Set());
	return (
		<BlueprintComponentsGrid
			blueprint={blueprint}
			removedComponents={removedComponents}
			onComponentRemovedChange={(component, removed) => {
				const key = blueprintComponentRemovalKey(component);
				setRemovedComponents((current) => {
					const next = new Set(current);
					if (removed) {
						next.add(key);
					} else {
						next.delete(key);
					}
					return next;
				});
			}}
		/>
	);
}

export const MouseAndKeyboardInteractions: Story = {
	render: ({blueprint}) => <InteractiveComponentsGrid blueprint={blueprint} />,
	play: async ({canvasElement}) => {
		const canvas = within(canvasElement);
		const included = canvas.getByRole('button', {name: /Transport belt, 2/});
		await userEvent.pointer({keys: '[MouseRight]', target: included});
		const removedByMouse = canvas.getByRole('button', {name: /Transport belt, removed/});
		await expect(removedByMouse.querySelector('.blueprint-components__count')).toHaveTextContent('0');
		await userEvent.click(removedByMouse);

		const restoredByMouse = canvas.getByRole('button', {name: /Transport belt, 2/});
		restoredByMouse.focus();
		await userEvent.keyboard('{Delete}');
		const removedByKeyboard = canvas.getByRole('button', {name: /Transport belt, removed/});
		removedByKeyboard.focus();
		await userEvent.keyboard('{Enter}');
		await expect(canvas.getByRole('button', {name: /Transport belt, 2/})).toHaveAttribute(
			'data-component-slot-state',
			'included',
		);
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
