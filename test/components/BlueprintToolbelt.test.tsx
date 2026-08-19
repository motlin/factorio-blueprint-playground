import {fireEvent, render, screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {describe, expect, test, vi} from 'vite-plus/test';

import {BlueprintToolbelt} from '../../src/components/blueprint/panels/transform/BlueprintToolbelt';

function renderToolbelt() {
	const onOpenBlueprintEditor = vi.fn<() => void>();
	const onOpenUpgradePlanner = vi.fn<() => void>();
	render(
		<>
			<BlueprintToolbelt
				blueprintEditorAvailable={true}
				blueprintEditorOpen={false}
				onOpenBlueprintEditor={onOpenBlueprintEditor}
				onOpenUpgradePlanner={onOpenUpgradePlanner}
				upgradePlannerOpen={true}
			/>
			<input aria-label="Input" />
			<textarea aria-label="Textarea" />
			<select aria-label="Select" />
			<div contentEditable="true">
				<span aria-label="Editable">Editable</span>
			</div>
		</>,
	);
	return {onOpenBlueprintEditor, onOpenUpgradePlanner};
}

describe('BlueprintToolbelt', () => {
	test('renders the game tools in Factorio order without nested icon names or titles', () => {
		renderToolbelt();

		expect(
			[...screen.getByRole('toolbar', {name: 'Blueprint tools'}).querySelectorAll('button')].map((button) => ({
				expanded: button.getAttribute('aria-expanded'),
				icon: button.querySelector('img')?.getAttribute('src'),
				iconAlt: button.querySelector('img')?.getAttribute('alt'),
				iconTitle: button.querySelector('img')?.getAttribute('title'),
				label: button.getAttribute('aria-label'),
				shortcut: button.getAttribute('aria-keyshortcuts'),
				tooltip: document.getElementById(button.getAttribute('aria-describedby') ?? '')?.textContent.trim(),
			})),
		).toStrictEqual([
			{
				expanded: 'false',
				icon: 'https://factorio-icon-cdn.pages.dev/item/blueprint.webp',
				iconAlt: '',
				iconTitle: null,
				label: 'Open Blueprint Editor',
				shortcut: 'B',
				tooltip: 'Blueprint EditorEdit this blueprint or book. B',
			},
			{
				expanded: 'true',
				icon: 'https://factorio-icon-cdn.pages.dev/item/upgrade-planner.webp',
				iconAlt: '',
				iconTitle: null,
				label: 'Open Upgrade Planner',
				shortcut: 'U',
				tooltip: 'Upgrade PlannerCreate, edit, and apply upgrade mappings. U',
			},
		]);
	});

	test('exposes the Upgrade Planner action tooltip on hover and keyboard focus', async () => {
		const user = userEvent.setup();
		renderToolbelt();
		const button = screen.getByRole('button', {name: 'Open Upgrade Planner'});
		const control = button.closest('.factorio-toolbar-control');
		if (!(control instanceof HTMLElement)) {
			throw new Error('Expected the Upgrade Planner control to wrap its Factorio tooltip.');
		}

		await user.hover(button);
		const tooltipId = button.getAttribute('aria-describedby');
		const tooltip = document.getElementById(tooltipId ?? '');
		if (tooltip === null) {
			throw new Error('Expected the Upgrade Planner button to reference its tooltip.');
		}
		expect({
			open: tooltip.dataset.factorioTooltipOpen,
			text: tooltip.textContent,
		}).toStrictEqual({
			open: 'true',
			text: 'Upgrade PlannerCreate, edit, and apply upgrade mappings. U',
		});

		await user.unhover(button);
		await user.tab();
		await user.tab();
		expect({
			description: button.getAttribute('aria-describedby'),
			focused: document.activeElement,
			open: tooltip.dataset.factorioTooltipOpen,
			tooltip: tooltip.id,
		}).toStrictEqual({
			description: tooltip.id,
			focused: button,
			open: 'true',
			tooltip: tooltip.id,
		});
	});

	test('opens tools on click or an unmodified shortcut and focuses shortcut invokers', () => {
		const {onOpenBlueprintEditor, onOpenUpgradePlanner} = renderToolbelt();

		fireEvent.click(screen.getByRole('button', {name: 'Open Blueprint Editor'}));
		fireEvent.click(screen.getByRole('button', {name: 'Open Upgrade Planner'}));
		fireEvent.keyDown(window, {code: 'KeyB'});
		expect(document.activeElement).toBe(screen.getByRole('button', {name: 'Open Blueprint Editor'}));
		fireEvent.keyDown(window, {code: 'KeyU'});

		expect({
			focused: document.activeElement,
			blueprintEditorCalls: onOpenBlueprintEditor.mock.calls,
			upgradePlannerCalls: onOpenUpgradePlanner.mock.calls,
		}).toStrictEqual({
			focused: screen.getByRole('button', {name: 'Open Upgrade Planner'}),
			blueprintEditorCalls: [[], []],
			upgradePlannerCalls: [[], []],
		});
	});

	test('ignores modified shortcuts and text-editing targets', () => {
		const {onOpenBlueprintEditor, onOpenUpgradePlanner} = renderToolbelt();

		fireEvent.keyDown(window, {altKey: true, code: 'KeyB'});
		fireEvent.keyDown(window, {code: 'KeyU', ctrlKey: true});
		fireEvent.keyDown(window, {code: 'KeyB', metaKey: true});
		fireEvent.keyDown(window, {code: 'KeyU', shiftKey: true});
		for (const name of ['Input', 'Textarea', 'Select', 'Editable']) {
			fireEvent.keyDown(screen.getByLabelText(name), {code: 'KeyB'});
			fireEvent.keyDown(screen.getByLabelText(name), {code: 'KeyU'});
		}

		expect({
			blueprintEditorCalls: onOpenBlueprintEditor.mock.calls,
			upgradePlannerCalls: onOpenUpgradePlanner.mock.calls,
		}).toStrictEqual({blueprintEditorCalls: [], upgradePlannerCalls: []});
	});

	test('ignores shortcuts while a nested dialog or alert dialog owns the keyboard', () => {
		const {onOpenBlueprintEditor, onOpenUpgradePlanner} = renderToolbelt();
		render(
			<>
				<section role="dialog" aria-modal="true" aria-label="Blueprint Editor" />
				<section role="alertdialog" aria-modal="true" aria-label="Discard changes" />
			</>,
		);

		fireEvent.keyDown(window, {code: 'KeyB'});
		fireEvent.keyDown(window, {code: 'KeyU'});

		expect({
			blueprintEditorCalls: onOpenBlueprintEditor.mock.calls,
			upgradePlannerCalls: onOpenUpgradePlanner.mock.calls,
		}).toStrictEqual({blueprintEditorCalls: [], upgradePlannerCalls: []});
	});
});
