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
	const tooltip = screen.getByRole('tooltip');
	fireEvent.click(button);
	const contextMenuAllowed = fireEvent.contextMenu(button);

	expect({
		applyCalls: onApplyPlacedPlanner.mock.calls,
		buttonClass: button.className,
		controls: button.getAttribute('aria-controls'),
		describedBy: button.getAttribute('aria-describedby'),
		expanded: button.getAttribute('aria-expanded'),
		hasPopup: button.getAttribute('aria-haspopup'),
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
		toolbarButtons: ['Upgrade items and entities in the blueprint', 'Choose upgrade planner for toolbar slot'],
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

test('opens Blueprint parametrisation only when the current format supports it', () => {
	const onOpenParameterization = vi.fn<() => void>();
	render(
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
		controls: button.getAttribute('aria-controls'),
		expanded: button.getAttribute('aria-expanded'),
		hasPopup: button.getAttribute('aria-haspopup'),
		icon: button.querySelector('img')?.getAttribute('src'),
		gameActions: [...gameActions.children].map((control) => ({
			action: control.getAttribute('data-factorio-action'),
			order: control.getAttribute('data-factorio-action-order'),
		})),
		onOpenParameterizationCalls: onOpenParameterization.mock.calls,
		toolbarButtons: [...toolbar.querySelectorAll('button')].map((control) => control.getAttribute('aria-label')),
		tooltip: screen.getByText('Parametrise/reconfigure the blueprint.').textContent,
	}).toStrictEqual({
		controls: 'blueprint-parameterization',
		expanded: 'false',
		hasPopup: 'dialog',
		icon: 'https://factorio-icon-cdn.pages.dev/virtual-signal/signal-item-parameter.webp',
		gameActions: [
			{action: 'upgrade', order: '3'},
			{action: 'parametrise', order: '4'},
		],
		onOpenParameterizationCalls: [[]],
		toolbarButtons: [
			'Upgrade items and entities in the blueprint',
			'Parametrise or reconfigure the blueprint',
			'Choose upgrade planner for toolbar slot',
		],
		tooltip: 'Parametrise/reconfigure the blueprint.',
	});
});

test('uses left for upgrade and secondary activation for downgrade regardless of stored direction', () => {
	const onApplyPlacedPlanner = vi.fn<(direction: UpgradeDirection) => void>();
	render(
		<BlueprintEditorToolbar
			dropError={undefined}
			onApplyPlacedPlanner={onApplyPlacedPlanner}
			onClearPlacedPlanner={vi.fn<() => void>()}
			onDropPlanner={vi.fn<(serializedPlanner: string) => void>()}
			onOpenParameterization={vi.fn<() => void>()}
			onOpenUpgradePlannerSelector={vi.fn<() => void>()}
			parameterizationAvailable={false}
			parameterizationDialogId="blueprint-parameterization"
			parameterizationOpen={false}
			placedPlanner={{
				choice: {label: 'Belt planner', source: 'book:1'},
				direction: 'upgrade',
			}}
			selectorDialogId="upgrade-planner-selector"
			selectorOpen={false}
		/>,
	);

	const apply = screen.getByRole('button', {name: 'Upgrade items and entities in the blueprint'});
	const change = screen.getByRole('button', {
		name: 'Change placed upgrade planner, currently Belt planner',
	});
	const remove = screen.getByRole('button', {name: 'Remove Belt planner from toolbar slot'});
	const gameActions = screen.getByRole('group', {name: 'Factorio blueprint actions'});
	const websiteActions = screen.getByRole('group', {name: 'Website planner slot'});
	fireEvent.click(apply);
	const contextMenuAllowed = fireEvent.contextMenu(apply);
	fireEvent.keyDown(apply, {key: 'Enter', shiftKey: true});

	expect({
		applyCalls: onApplyPlacedPlanner.mock.calls,
		applyLabel: apply.getAttribute('aria-label'),
		applyKeyshortcuts: apply.getAttribute('aria-keyshortcuts'),
		applyTooltip: apply.getAttribute('title'),
		changeTooltip: change.getAttribute('title'),
		contextMenuAllowed,
		groups: {
			game: [...gameActions.querySelectorAll('button')].map((button) => button.getAttribute('aria-label')),
			website: [...websiteActions.querySelectorAll('button')].map((button) => button.getAttribute('aria-label')),
		},
		removeTooltip: remove.getAttribute('title'),
	}).toStrictEqual({
		applyCalls: [['upgrade'], ['downgrade'], ['downgrade']],
		applyLabel: 'Upgrade items and entities in the blueprint',
		applyKeyshortcuts: 'Shift+Enter',
		applyTooltip: 'Upgrade items and entities in the blueprint.',
		changeTooltip: 'Change placed upgrade planner, currently Belt planner',
		contextMenuAllowed: false,
		groups: {
			game: ['Upgrade items and entities in the blueprint'],
			website: ['Change placed upgrade planner, currently Belt planner', 'Remove Belt planner from toolbar slot'],
		},
		removeTooltip: 'Remove Belt planner from toolbar slot',
	});
});
