import {fireEvent, render, screen} from '@testing-library/react';
import {expect, test, vi} from 'vite-plus/test';

import {BlueprintEditorToolbar} from '../../src/components/blueprint/panels/transform/BlueprintEditorToolbar';
import type {UpgradeDirection} from '../../src/transform/upgradePlanner';

test('renders the supported Factorio editor action with accessible states and a visible tooltip', () => {
	const onApplyPlacedPlanner = vi.fn<(direction: UpgradeDirection) => void>();
	const onClearPlacedPlanner = vi.fn<() => void>();
	const onDropPlanner = vi.fn<(serializedPlanner: string) => void>();
	const onOpenParameterization = vi.fn<() => void>();
	const onOpenUpgradePlannerSelector = vi.fn<() => void>();
	const {rerender} = render(
		<BlueprintEditorToolbar
			dropError={undefined}
			onApplyPlacedPlanner={onApplyPlacedPlanner}
			onClearPlacedPlanner={onClearPlacedPlanner}
			onDropPlanner={onDropPlanner}
			onOpenParameterization={onOpenParameterization}
			onOpenUpgradePlannerSelector={onOpenUpgradePlannerSelector}
			parameterizationAvailable={false}
			parameterizationDialogId="blueprint-parameterization"
			parameterizationOpen={false}
			placedPlanner={undefined}
			selectorDialogId="upgrade-planner-selector"
			selectorOpen={false}
		/>,
	);

	const toolbar = screen.getByRole('toolbar', {name: 'Blueprint editor actions'});
	const gameActions = screen.getByRole('group', {name: 'Factorio blueprint actions'});
	const websiteActions = screen.getByRole('group', {name: 'Website planner slot'});
	const button = screen.getByRole<HTMLButtonElement>('button', {
		name: 'Upgrade items and entities in the blueprint',
	});
	const heldPlannerSlot = screen.getByRole<HTMLButtonElement>('button', {
		name: 'Choose or drop an upgrade planner to hold',
	});
	const tooltip = screen.getByRole('tooltip');
	const dataTransfer = {
		dropEffect: 'none',
		types: ['text/plain'],
	};
	fireEvent.dragEnter(heldPlannerSlot, {dataTransfer});
	const readyDropState = heldPlannerSlot.dataset.dropState;
	fireEvent.dragOver(heldPlannerSlot, {dataTransfer});
	fireEvent.dragLeave(heldPlannerSlot, {dataTransfer, relatedTarget: document.body});
	fireEvent.click(button);
	const contextMenuAllowed = fireEvent.contextMenu(button);

	expect({
		applyCalls: onApplyPlacedPlanner.mock.calls,
		buttonClass: button.className,
		controls: button.getAttribute('aria-controls'),
		describedBy: button.getAttribute('aria-describedby'),
		expanded: button.getAttribute('aria-expanded'),
		hasPopup: button.getAttribute('aria-haspopup'),
		heldPlannerSlot: {
			dropEffect: dataTransfer.dropEffect,
			dropState: heldPlannerSlot.dataset.dropState,
			pressed: heldPlannerSlot.getAttribute('aria-pressed'),
			readyDropState,
			state: heldPlannerSlot.dataset.plannerState,
		},
		iconSize: button.querySelector('[data-factorio-icon-size]')?.getAttribute('data-factorio-icon-size'),
		icon: button.querySelector('img')?.getAttribute('src'),
		keyshortcuts: button.getAttribute('aria-keyshortcuts'),
		contextMenuAllowed,
		onOpenUpgradePlannerSelectorCalls: onOpenUpgradePlannerSelector.mock.calls,
		sourceContract: {
			actionOrder: toolbar.dataset.factorioActionOrder,
			gameActions: [...gameActions.children].map((control) => ({
				action: control.getAttribute('data-factorio-action'),
				mouseButtons: control.getAttribute('data-factorio-mouse-buttons'),
				order: control.getAttribute('data-factorio-action-order'),
				source: control.getAttribute('data-factorio-source'),
			})),
			source: toolbar.dataset.factorioSource,
			websiteExtension: websiteActions.dataset.websiteExtension,
			widgetStyle: button.dataset.factorioWidgetStyle,
		},
		title: button.title,
		toolbarButtons: [...toolbar.querySelectorAll('button')].map((control) => control.getAttribute('aria-label')),
		tooltip: {id: tooltip.id, text: tooltip.textContent},
	}).toStrictEqual({
		applyCalls: [],
		buttonClass:
			'factorio-button factorio-button--neutral blueprint-editor-toolbar__button blueprint-editor-toolbar__button--upgrade',
		controls: 'upgrade-planner-selector',
		describedBy: tooltip.id,
		expanded: 'false',
		hasPopup: 'dialog',
		heldPlannerSlot: {
			dropEffect: 'copy',
			dropState: 'idle',
			pressed: 'false',
			readyDropState: 'ready',
			state: 'empty',
		},
		icon: 'https://factorio-icon-cdn.pages.dev/item/upgrade-planner.webp',
		iconSize: 'small',
		keyshortcuts: 'Shift+Enter',
		contextMenuAllowed: false,
		onOpenUpgradePlannerSelectorCalls: [[], []],
		sourceContract: {
			actionOrder: 'title,reassign,copy,upgrade,parametrise,export,delete',
			gameActions: [
				{
					action: 'upgrade',
					mouseButtons: 'left,right',
					order: '3',
					source: 'BlueprintSettingsGui::makeUpgradeButton',
				},
			],
			source: 'BlueprintSettingsGui::subheader',
			websiteExtension: 'dropped-upgrade-planner-slot',
			widgetStyle: 'tool_button_green',
		},
		title: 'Upgrade items and entities in the blueprint.',
		toolbarButtons: ['Upgrade items and entities in the blueprint', 'Choose or drop an upgrade planner to hold'],
		tooltip: {id: tooltip.id, text: 'Upgrade items and entities in the blueprint.'},
	});

	rerender(
		<BlueprintEditorToolbar
			dropError={undefined}
			onApplyPlacedPlanner={onApplyPlacedPlanner}
			onClearPlacedPlanner={onClearPlacedPlanner}
			onDropPlanner={onDropPlanner}
			onOpenParameterization={onOpenParameterization}
			onOpenUpgradePlannerSelector={onOpenUpgradePlannerSelector}
			parameterizationAvailable={false}
			parameterizationDialogId="blueprint-parameterization"
			parameterizationOpen={false}
			placedPlanner={undefined}
			selectorDialogId="upgrade-planner-selector"
			selectorOpen={true}
		/>,
	);
	const expandedButton = screen.getByRole('button', {name: 'Upgrade items and entities in the blueprint'});

	expect({
		expanded: expandedButton.getAttribute('aria-expanded'),
		onOpenUpgradePlannerSelectorCalls: onOpenUpgradePlannerSelector.mock.calls,
		tooltip: screen.getByRole('tooltip').textContent,
	}).toStrictEqual({
		expanded: 'true',
		onOpenUpgradePlannerSelectorCalls: [[], []],
		tooltip: 'Upgrade items and entities in the blueprint.',
	});
});

test('renders the source parametrisation launcher and latches it while its child dialog is open', () => {
	const onOpenParameterization = vi.fn<() => void>();
	const {rerender} = render(
		<BlueprintEditorToolbar
			dropError={undefined}
			onApplyPlacedPlanner={vi.fn<(direction: UpgradeDirection) => void>()}
			onClearPlacedPlanner={vi.fn<() => void>()}
			onDropPlanner={vi.fn<(serializedPlanner: string) => void>()}
			onOpenParameterization={onOpenParameterization}
			onOpenUpgradePlannerSelector={vi.fn<() => void>()}
			parameterizationAvailable={true}
			parameterizationDialogId="blueprint-parameterization"
			parameterizationOpen={false}
			placedPlanner={undefined}
			selectorDialogId="upgrade-planner-selector"
			selectorOpen={false}
		/>,
	);

	const button = screen.getByRole('button', {name: 'Parametrise or reconfigure the blueprint'});
	const toolbar = screen.getByRole('toolbar', {name: 'Blueprint editor actions'});
	const gameActions = screen.getByRole('group', {name: 'Factorio blueprint actions'});
	fireEvent.click(button);

	expect({
		className: button.className,
		controls: button.getAttribute('aria-controls'),
		expanded: button.getAttribute('aria-expanded'),
		hasPopup: button.getAttribute('aria-haspopup'),
		icon: button.querySelector('img')?.getAttribute('src'),
		iconSize: button.querySelector('[data-factorio-icon-size]')?.getAttribute('data-factorio-icon-size'),
		gameActions: [...gameActions.children].map((control) => ({
			action: control.getAttribute('data-factorio-action'),
			order: control.getAttribute('data-factorio-action-order'),
			source: control.getAttribute('data-factorio-source'),
		})),
		onOpenParameterizationCalls: onOpenParameterization.mock.calls,
		sourceContract: {
			sprite: button.dataset.factorioSprite,
			toggleState: button.dataset.factorioToggleState,
			widgetStyle: button.dataset.factorioWidgetStyle,
		},
		title: button.title,
		toolbarButtons: [...toolbar.querySelectorAll('button')].map((control) => control.getAttribute('aria-label')),
		tooltip: screen.getByText('Parametrise/reconfigure the blueprint.').textContent,
	}).toStrictEqual({
		className:
			'factorio-button factorio-button--neutral blueprint-editor-toolbar__button blueprint-editor-toolbar__button--parameterization',
		controls: 'blueprint-parameterization',
		expanded: 'false',
		hasPopup: 'dialog',
		icon: '/assets/factorio/parametrise.png',
		iconSize: 'small',
		gameActions: [
			{action: 'upgrade', order: '3', source: 'BlueprintSettingsGui::makeUpgradeButton'},
			{action: 'parametrise', order: '4', source: 'BlueprintSettingsGui::makeParametriseSlot'},
		],
		onOpenParameterizationCalls: [[]],
		sourceContract: {
			sprite: 'utility/parametrise',
			toggleState: 'default',
			widgetStyle: 'tool_button_green',
		},
		title: 'Parametrise/reconfigure the blueprint.',
		toolbarButtons: [
			'Upgrade items and entities in the blueprint',
			'Parametrise or reconfigure the blueprint',
			'Choose or drop an upgrade planner to hold',
		],
		tooltip: 'Parametrise/reconfigure the blueprint.',
	});

	rerender(
		<BlueprintEditorToolbar
			dropError={undefined}
			onApplyPlacedPlanner={vi.fn<(direction: UpgradeDirection) => void>()}
			onClearPlacedPlanner={vi.fn<() => void>()}
			onDropPlanner={vi.fn<(serializedPlanner: string) => void>()}
			onOpenParameterization={onOpenParameterization}
			onOpenUpgradePlannerSelector={vi.fn<() => void>()}
			parameterizationAvailable={true}
			parameterizationDialogId="blueprint-parameterization"
			parameterizationOpen
			placedPlanner={undefined}
			selectorDialogId="upgrade-planner-selector"
			selectorOpen={false}
		/>,
	);

	const expandedButton = screen.getByRole('button', {name: 'Parametrise or reconfigure the blueprint'});
	expect({
		expanded: expandedButton.getAttribute('aria-expanded'),
		toggleState: expandedButton.dataset.factorioToggleState,
	}).toStrictEqual({
		expanded: 'true',
		toggleState: 'selected',
	});
});

test('uses left and secondary activation for direction while the held planner clears from the slot', () => {
	const onApplyPlacedPlanner = vi.fn<(direction: UpgradeDirection) => void>();
	const onClearPlacedPlanner = vi.fn<() => void>();
	const onOpenUpgradePlannerSelector = vi.fn<() => void>();
	render(
		<BlueprintEditorToolbar
			dropError={undefined}
			onApplyPlacedPlanner={onApplyPlacedPlanner}
			onClearPlacedPlanner={onClearPlacedPlanner}
			onDropPlanner={vi.fn<(serializedPlanner: string) => void>()}
			onOpenParameterization={vi.fn<() => void>()}
			onOpenUpgradePlannerSelector={onOpenUpgradePlannerSelector}
			parameterizationAvailable={false}
			parameterizationDialogId="blueprint-parameterization"
			parameterizationOpen={false}
			placedPlanner={{
				choice: {label: 'Belt planner', source: 'book:1'},
			}}
			selectorDialogId="upgrade-planner-selector"
			selectorOpen={false}
		/>,
	);

	const apply = screen.getByRole('button', {name: 'Upgrade items and entities in the blueprint'});
	const heldPlanner = screen.getByRole('button', {
		name: 'Held upgrade planner Belt planner; click to replace',
	});
	const gameActions = screen.getByRole('group', {name: 'Factorio blueprint actions'});
	const websiteActions = screen.getByRole('group', {name: 'Website planner slot'});
	fireEvent.click(apply);
	const contextMenuAllowed = fireEvent.contextMenu(apply);
	fireEvent.keyDown(apply, {key: 'Enter', shiftKey: true});
	fireEvent.click(heldPlanner);
	const clearContextMenuAllowed = fireEvent.contextMenu(heldPlanner);
	fireEvent.keyDown(heldPlanner, {key: 'Delete'});
	fireEvent.keyDown(heldPlanner, {key: 'Backspace'});

	expect({
		applyCalls: onApplyPlacedPlanner.mock.calls,
		applyLabel: apply.getAttribute('aria-label'),
		applyKeyshortcuts: apply.getAttribute('aria-keyshortcuts'),
		applyTooltip: apply.getAttribute('title'),
		clearCalls: onClearPlacedPlanner.mock.calls,
		clearContextMenuAllowed,
		contextMenuAllowed,
		heldPlanner: {
			clearButton: screen.queryByRole('button', {name: /Remove Belt planner/}),
			directionArrow: heldPlanner.querySelector('.blueprint-editor-toolbar__planner-direction'),
			iconSize: heldPlanner.querySelector('[data-factorio-icon-size]')?.getAttribute('data-factorio-icon-size'),
			keyshortcuts: heldPlanner.getAttribute('aria-keyshortcuts'),
			pressed: heldPlanner.getAttribute('aria-pressed'),
			plannerState: heldPlanner.dataset.plannerState,
			source: heldPlanner.dataset.factorioSource,
			title: heldPlanner.title,
		},
		groups: {
			game: [...gameActions.querySelectorAll('button')].map((button) => button.getAttribute('aria-label')),
			website: [...websiteActions.querySelectorAll('button')].map((button) => button.getAttribute('aria-label')),
		},
		openSelectorCalls: onOpenUpgradePlannerSelector.mock.calls,
	}).toStrictEqual({
		applyCalls: [['upgrade'], ['downgrade'], ['downgrade']],
		applyLabel: 'Upgrade items and entities in the blueprint',
		applyKeyshortcuts: 'Shift+Enter',
		applyTooltip: 'Use Belt planner. Left-click to upgrade; right-click or press Shift+Enter to downgrade.',
		clearCalls: [[], [], []],
		clearContextMenuAllowed: false,
		contextMenuAllowed: false,
		heldPlanner: {
			clearButton: null,
			directionArrow: null,
			iconSize: 'large',
			keyshortcuts: 'Delete Backspace',
			pressed: 'true',
			plannerState: 'held',
			source: 'PlayerInputSource::processClickOnUpgradeSlot',
			title: 'Belt planner is held for the Upgrade button. Left-click to replace it. Right-click or press Delete to clear it.',
		},
		groups: {
			game: ['Upgrade items and entities in the blueprint'],
			website: ['Held upgrade planner Belt planner; click to replace'],
		},
		openSelectorCalls: [[]],
	});
});
