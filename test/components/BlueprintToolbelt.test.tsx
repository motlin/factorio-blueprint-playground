import {fireEvent, render, screen} from '@testing-library/react';
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
			<div aria-label="Editable" contentEditable="true" />
		</>,
	);
	return {onOpenBlueprintEditor, onOpenUpgradePlanner};
}

describe('BlueprintToolbelt', () => {
	test('renders the game tools in Factorio order with accessible shortcut tooltips', () => {
		renderToolbelt();

		expect(
			[...screen.getByRole('toolbar', {name: 'Blueprint tools'}).querySelectorAll('button')].map((button) => ({
				expanded: button.getAttribute('aria-expanded'),
				icon: button.querySelector('img')?.getAttribute('src'),
				label: button.getAttribute('aria-label'),
				shortcut: button.getAttribute('aria-keyshortcuts'),
				tooltip: button.getAttribute('title'),
			})),
		).toStrictEqual([
			{
				expanded: 'false',
				icon: 'https://factorio-icon-cdn.pages.dev/item/blueprint.webp',
				label: 'Open Blueprint Editor',
				shortcut: 'B',
				tooltip: 'Blueprint Editor (B)',
			},
			{
				expanded: 'true',
				icon: 'https://factorio-icon-cdn.pages.dev/item/upgrade-planner.webp',
				label: 'Open Upgrade Planner',
				shortcut: 'U',
				tooltip: 'Upgrade Planner (U)',
			},
		]);
	});

	test('opens tools on click or an unmodified shortcut', () => {
		const {onOpenBlueprintEditor, onOpenUpgradePlanner} = renderToolbelt();

		fireEvent.click(screen.getByRole('button', {name: 'Open Blueprint Editor'}));
		fireEvent.click(screen.getByRole('button', {name: 'Open Upgrade Planner'}));
		fireEvent.keyDown(window, {code: 'KeyB'});
		fireEvent.keyDown(window, {code: 'KeyU'});

		expect({
			blueprintEditorCalls: onOpenBlueprintEditor.mock.calls,
			upgradePlannerCalls: onOpenUpgradePlanner.mock.calls,
		}).toStrictEqual({blueprintEditorCalls: [[], []], upgradePlannerCalls: [[], []]});
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

	test('ignores shortcuts while a nested picker is open', () => {
		const {onOpenBlueprintEditor, onOpenUpgradePlanner} = renderToolbelt();
		render(
			<>
				<section role="dialog" aria-label="Blueprint Editor" />
				<section role="dialog" aria-label="Choose label icon" />
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
