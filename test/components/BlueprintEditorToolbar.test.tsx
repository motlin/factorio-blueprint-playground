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
	const button = screen.getByRole<HTMLButtonElement>('button', {
		name: 'Upgrade items and entities in the blueprint',
	});
	const tooltip = screen.getByRole('tooltip');
	fireEvent.click(button);

	expect({
		buttonClass: button.className,
		controls: button.getAttribute('aria-controls'),
		describedBy: button.getAttribute('aria-describedby'),
		expanded: button.getAttribute('aria-expanded'),
		hasPopup: button.getAttribute('aria-haspopup'),
		icon: button.querySelector('img')?.getAttribute('src'),
		onOpenUpgradePlannerSelectorCalls: onOpenUpgradePlannerSelector.mock.calls,
		toolbarButtons: [...toolbar.querySelectorAll('button')].map((control) => control.getAttribute('aria-label')),
		tooltip: {id: tooltip.id, text: tooltip.textContent},
	}).toStrictEqual({
		buttonClass:
			'factorio-toolbar-button blueprint-editor-toolbar__button blueprint-editor-toolbar__button--upgrade',
		controls: 'upgrade-planner-selector',
		describedBy: tooltip.id,
		expanded: 'false',
		hasPopup: 'dialog',
		icon: 'https://factorio-icon-cdn.pages.dev/item/upgrade-planner.webp',
		onOpenUpgradePlannerSelectorCalls: [[]],
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
		onOpenUpgradePlannerSelectorCalls: [[]],
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
	fireEvent.click(button);

	expect({
		controls: button.getAttribute('aria-controls'),
		expanded: button.getAttribute('aria-expanded'),
		hasPopup: button.getAttribute('aria-haspopup'),
		icon: button.querySelector('img')?.getAttribute('src'),
		onOpenParameterizationCalls: onOpenParameterization.mock.calls,
		tooltip: screen.getByText('Parametrise/reconfigure the blueprint.').textContent,
	}).toStrictEqual({
		controls: 'blueprint-parameterization',
		expanded: 'false',
		hasPopup: 'dialog',
		icon: 'https://factorio-icon-cdn.pages.dev/item/parameter-.webp',
		onOpenParameterizationCalls: [[]],
		tooltip: 'Parametrise/reconfigure the blueprint.',
	});
});
