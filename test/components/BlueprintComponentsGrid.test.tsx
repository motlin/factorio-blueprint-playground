import {fireEvent, render, screen} from '@testing-library/react';
import {expect, test, vi} from 'vite-plus/test';

import {BlueprintComponentsGrid} from '../../src/components/blueprint/panels/transform/BlueprintComponentsGrid';
import {aggregateBlueprintComponents} from '../../src/components/blueprint/panels/transform/blueprintComponents';
import type {BlueprintString} from '../../src/parsing/types';
import {blueprintComponentRemovalKey, type BlueprintComponentIdentity} from '../../src/transform/componentRemoval';

const blueprintWithComponents: BlueprintString = {
	blueprint: {
		item: 'blueprint',
		version: 0,
		entities: [
			{entity_number: 1, name: 'transport-belt', position: {x: 0, y: 0}},
			{entity_number: 2, name: 'transport-belt', position: {x: 1, y: 0}},
			{
				entity_number: 3,
				name: 'assembling-machine-1',
				position: {x: 2, y: 0},
				items: [
					{
						id: {name: 'speed-module', quality: 'rare'},
						items: {
							in_inventory: [
								{inventory: 4, stack: 0, count: 2},
								{inventory: 4, stack: 1},
							],
						},
					},
					{
						id: {name: 'coal'},
						items: {in_inventory: [{inventory: 1, stack: 0, count: 10}]},
					},
				],
			},
			{entity_number: 4, name: 'locomotive', position: {x: 3, y: 0}},
		],
		tiles: [
			{name: 'refined-concrete', position: {x: 0, y: 1}},
			{name: 'refined-concrete', position: {x: 1, y: 1}},
		],
	},
};

test('aggregates inventory components with exact counts and deterministic ordering', () => {
	expect(aggregateBlueprintComponents(blueprintWithComponents)).toStrictEqual([
		{count: 10, name: 'coal', quality: undefined, type: 'item'},
		{count: 3, name: 'speed-module', quality: 'rare', type: 'item'},
		{count: 2, name: 'transport-belt', quality: undefined, type: 'entity'},
		{count: 2, name: 'refined-concrete', quality: undefined, type: 'tile'},
		{count: 1, name: 'locomotive', quality: undefined, type: 'entity'},
		{count: 1, name: 'assembling-machine-1', quality: undefined, type: 'entity'},
	]);
});

test('renders focusable counted slots with readable tooltips and an empty state', () => {
	const onComponentRemovedChange = vi.fn<(component: BlueprintComponentIdentity, removed: boolean) => void>();
	const {rerender} = render(
		<BlueprintComponentsGrid
			blueprint={blueprintWithComponents}
			onComponentRemovedChange={onComponentRemovedChange}
			removedComponents={new Set()}
		/>,
	);
	const transportBelt = screen.getByRole('button', {name: /Transport belt, 2/});
	fireEvent.pointerEnter(transportBelt);
	const tooltip = screen.getByRole('tooltip', {name: /Transport belt/});

	expect({
		describedBy: transportBelt.getAttribute('aria-describedby'),
		count: transportBelt.querySelector('.blueprint-components__count')?.textContent,
		icon: transportBelt.querySelector('img')?.getAttribute('src'),
		keyboardShortcut: transportBelt.getAttribute('aria-keyshortcuts'),
		listSlotCount: screen.getByRole('list', {name: 'Blueprint component slots'}).children.length,
		scrollFrame: {
			source: screen.getByRole('region', {name: 'Blueprint components'}).dataset.factorioSource,
			style: screen.getByRole('region', {name: 'Blueprint components'}).dataset.factorioStyle,
		},
		slotSource: transportBelt.dataset.factorioSource,
		slotState: transportBelt.dataset.componentSlotState,
		slotStyle: transportBelt.dataset.factorioSlotStyle,
		slotLabels: screen.getAllByRole('button').map((slot) => slot.getAttribute('aria-label')),
		tagName: transportBelt.tagName,
		tooltip: {
			open: tooltip.dataset.factorioTooltipOpen,
			text: tooltip.textContent,
		},
	}).toStrictEqual({
		describedBy: tooltip.id,
		count: '2',
		icon: 'https://factorio-icon-cdn.pages.dev/entity/transport-belt.webp',
		keyboardShortcut: 'Delete',
		listSlotCount: 10,
		scrollFrame: {
			source: 'BlueprintSettingsGui::makeComponentsFrame',
			style: 'deep_slots_scroll_pane',
		},
		slotSource: 'BlueprintSettingsGui::updateTotal',
		slotState: 'included',
		slotStyle: 'slot_button',
		slotLabels: [
			'Coal, 10. Right-click or press Delete to remove.',
			'Speed module, 3. Right-click or press Delete to remove.',
			'Transport belt, 2. Right-click or press Delete to remove.',
			'Refined concrete, 2. Right-click or press Delete to remove.',
			'Locomotive, 1. Right-click or press Delete to remove.',
			'Assembling machine 1, 1. Right-click or press Delete to remove.',
		],
		tagName: 'BUTTON',
		tooltip: {
			open: 'true',
			text: 'Transport beltentity:transport-beltRight-click to remove all components of this type.',
		},
	});

	rerender(
		<BlueprintComponentsGrid
			blueprint={{blueprint: {item: 'blueprint', version: 0}}}
			onComponentRemovedChange={onComponentRemovedChange}
			removedComponents={new Set()}
		/>,
	);
	expect({
		emptyMessage: screen.getByText('No components in this blueprint.').textContent,
		gridSlotCount: screen.getByRole('list', {name: 'Blueprint component slots'}).children.length,
		scrollDescription: screen.getByRole('region', {name: 'Blueprint components'}).getAttribute('aria-describedby'),
	}).toStrictEqual({
		emptyMessage: 'No components in this blueprint.',
		gridSlotCount: 10,
		scrollDescription: screen.getByText('No components in this blueprint.').id,
	});
});

test('suppresses context menus and supports pointer and keyboard removal restoration', () => {
	const onComponentRemovedChange = vi.fn<(component: BlueprintComponentIdentity, removed: boolean) => void>();
	const {rerender} = render(
		<BlueprintComponentsGrid
			blueprint={blueprintWithComponents}
			onComponentRemovedChange={onComponentRemovedChange}
			removedComponents={new Set()}
		/>,
	);

	const activeTransportBelt = screen.getByRole('button', {name: /Transport belt, 2/});
	const contextMenuAllowed = fireEvent.contextMenu(activeTransportBelt);
	rerender(
		<BlueprintComponentsGrid
			blueprint={blueprintWithComponents}
			onComponentRemovedChange={onComponentRemovedChange}
			removedComponents={new Set([blueprintComponentRemovalKey({name: 'transport-belt', type: 'entity'})])}
		/>,
	);
	const removedTransportBelt = screen.getByRole('button', {name: /Transport belt, removed/});
	removedTransportBelt.focus();
	const tooltip = screen.getByRole('tooltip', {name: /Transport belt/});

	expect({
		contextMenuAllowed,
		count: removedTransportBelt.querySelector('.blueprint-components__count')?.textContent,
		keyboardShortcut: removedTransportBelt.getAttribute('aria-keyshortcuts'),
		parentClassName: removedTransportBelt.parentElement?.className,
		slotState: removedTransportBelt.dataset.componentSlotState,
		slotStyle: removedTransportBelt.dataset.factorioSlotStyle,
		tooltip: {
			open: tooltip.dataset.factorioTooltipOpen,
			text: tooltip.textContent,
		},
	}).toStrictEqual({
		contextMenuAllowed: false,
		count: '0',
		keyboardShortcut: 'Enter',
		parentClassName: 'blueprint-components__slot blueprint-components__slot--removed',
		slotState: 'removed',
		slotStyle: 'red_slot_button',
		tooltip: {
			open: 'true',
			text: 'Transport beltentity:transport-beltLeft-click to add all components of this type back.',
		},
	});

	const removedContextMenuAllowed = fireEvent.contextMenu(removedTransportBelt);
	fireEvent.click(removedTransportBelt);
	rerender(
		<BlueprintComponentsGrid
			blueprint={blueprintWithComponents}
			onComponentRemovedChange={onComponentRemovedChange}
			removedComponents={new Set()}
		/>,
	);
	fireEvent.keyDown(screen.getByRole('button', {name: /Transport belt, 2/}), {key: 'Delete'});
	rerender(
		<BlueprintComponentsGrid
			blueprint={blueprintWithComponents}
			onComponentRemovedChange={onComponentRemovedChange}
			removedComponents={new Set([blueprintComponentRemovalKey({name: 'transport-belt', type: 'entity'})])}
		/>,
	);
	fireEvent.keyDown(screen.getByRole('button', {name: /Transport belt, removed/}), {key: 'Enter'});

	expect({
		calls: onComponentRemovedChange.mock.calls,
		removedContextMenuAllowed,
	}).toStrictEqual({
		calls: [
			[{name: 'transport-belt', type: 'entity'}, true],
			[{name: 'transport-belt', type: 'entity'}, false],
			[{name: 'transport-belt', type: 'entity'}, true],
			[{name: 'transport-belt', type: 'entity'}, false],
		],
		removedContextMenuAllowed: false,
	});
});
