import {fireEvent, render, screen} from '@testing-library/react';
import {expect, test, vi} from 'vite-plus/test';

import {BlueprintEditorToolbar} from '../../src/components/blueprint/panels/transform/BlueprintEditorToolbar';

test('renders the supported Factorio editor action with accessible states and a visible tooltip', () => {
	const onOpenUpgradePlanner = vi.fn<() => void>();
	const {rerender} = render(<BlueprintEditorToolbar disabled={false} onOpenUpgradePlanner={onOpenUpgradePlanner} />);

	const toolbar = screen.getByRole('toolbar', {name: 'Blueprint editor actions'});
	const button = screen.getByRole<HTMLButtonElement>('button', {
		name: 'Upgrade items and entities in the blueprint',
	});
	const tooltip = screen.getByRole('tooltip');
	fireEvent.click(button);

	expect({
		buttonClass: button.className,
		describedBy: button.getAttribute('aria-describedby'),
		disabled: button.disabled,
		icon: button.querySelector('img')?.getAttribute('src'),
		onOpenUpgradePlannerCalls: onOpenUpgradePlanner.mock.calls,
		toolbarButtons: [...toolbar.querySelectorAll('button')].map((control) => control.getAttribute('aria-label')),
		tooltip: {id: tooltip.id, text: tooltip.textContent},
	}).toStrictEqual({
		buttonClass: 'factorio-toolbar-button blueprint-editor-toolbar__button',
		describedBy: tooltip.id,
		disabled: false,
		icon: 'https://factorio-icon-cdn.pages.dev/item/upgrade-planner.webp',
		onOpenUpgradePlannerCalls: [[]],
		toolbarButtons: ['Upgrade items and entities in the blueprint'],
		tooltip: {id: tooltip.id, text: 'Upgrade items and entities in the blueprint.'},
	});

	rerender(<BlueprintEditorToolbar disabled={true} onOpenUpgradePlanner={onOpenUpgradePlanner} />);
	const disabledButton = screen.getByRole<HTMLButtonElement>('button', {
		name: 'Upgrade items and entities in the blueprint',
	});
	fireEvent.click(disabledButton);

	expect({
		disabled: disabledButton.disabled,
		onOpenUpgradePlannerCalls: onOpenUpgradePlanner.mock.calls,
		tooltip: screen.getByRole('tooltip').textContent,
	}).toStrictEqual({
		disabled: true,
		onOpenUpgradePlannerCalls: [[]],
		tooltip: 'Save or cancel your Blueprint Editor changes before opening the Upgrade Planner.',
	});
});
