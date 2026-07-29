import type {Meta, StoryObj} from '@storybook/react-vite';
import {expect, fn, userEvent, within} from 'storybook/test';

import {BlueprintEditorToolbar} from './BlueprintEditorToolbar';
import {transformStoryParameters} from './transformStoryParameters';

const meta = {
	title: 'Blueprint/Panels/Transform/BlueprintEditorToolbar',
	component: BlueprintEditorToolbar,
	args: {
		dropError: undefined,
		onApplyPlacedPlanner: fn(),
		onClearPlacedPlanner: fn(),
		onDropPlanner: fn(),
		onOpenParameterization: fn(),
		onOpenUpgradePlannerSelector: fn(),
		parameterizationAvailable: false,
		parameterizationDialogId: 'blueprint-parameterization',
		parameterizationOpen: false,
		placedPlanner: undefined,
		selectorDialogId: 'upgrade-planner-selector',
		selectorOpen: false,
	},
	parameters: transformStoryParameters,
	tags: ['autodocs', 'visual-conformance'],
} satisfies Meta<typeof BlueprintEditorToolbar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Available: Story = {
	play: async ({args, canvasElement}) => {
		const canvas = within(canvasElement);
		const page = within(document.body);
		const toolbar = canvas.getByRole('toolbar', {name: 'Blueprint editor actions'});
		const gameActions = canvas.getByRole('group', {name: 'Factorio blueprint actions'});
		const websiteActions = canvas.getByRole('group', {name: 'Website planner slot'});
		const button = canvas.getByRole('button', {name: 'Upgrade items and entities in the blueprint'});
		const buttonBounds = button.getBoundingClientRect();
		await expect({
			actionOrder: toolbar.dataset.factorioActionOrder,
			gameActions: [...gameActions.children].map((control) => ({
				action: control.getAttribute('data-factorio-action'),
				mouseButtons: control.getAttribute('data-factorio-mouse-buttons'),
			})),
			geometry: {height: buttonBounds.height, width: buttonBounds.width},
			iconSize: button.querySelector('[data-factorio-icon-size]')?.getAttribute('data-factorio-icon-size'),
			toolbarChildren: [...toolbar.children].map((group) => group.className),
			websiteExtension: websiteActions.dataset.websiteExtension,
			widgetStyle: button.dataset.factorioWidgetStyle,
		}).toStrictEqual({
			actionOrder: 'title,reassign,copy,upgrade,parametrise,export,delete',
			gameActions: [{action: 'upgrade', mouseButtons: 'left,right'}],
			geometry: {height: 28, width: 28},
			iconSize: 'small',
			toolbarChildren: ['blueprint-editor-toolbar__game-actions', 'blueprint-editor-toolbar__website-actions'],
			websiteExtension: 'dropped-upgrade-planner-slot',
			widgetStyle: 'tool_button_green',
		});
		await userEvent.hover(button);
		const tooltip = page.getByRole('tooltip');
		await expect({
			open: tooltip.dataset.factorioTooltipOpen,
			text: tooltip.textContent,
		}).toStrictEqual({
			open: 'true',
			text: 'Upgrade items and entities in the blueprint.',
		});
		await userEvent.unhover(button);
		await userEvent.tab();
		await expect(button).toHaveFocus();
		await expect(tooltip.dataset.factorioTooltipOpen).toBe('true');
		await userEvent.click(button);
		await userEvent.pointer({keys: '[MouseRight]', target: button});
		await expect(args.onOpenUpgradePlannerSelector.mock.calls).toStrictEqual([[], []]);
		await expect(args.onApplyPlacedPlanner.mock.calls).toStrictEqual([]);
	},
};

export const ParametrisationAvailable: Story = {
	args: {
		parameterizationAvailable: true,
	},
	play: async ({canvasElement}) => {
		const canvas = within(canvasElement);
		const toolbar = canvas.getByRole('toolbar', {name: 'Blueprint editor actions'});
		const gameActions = canvas.getByRole('group', {name: 'Factorio blueprint actions'});

		await expect({
			gameActions: [...gameActions.children].map((control) => ({
				action: control.getAttribute('data-factorio-action'),
				order: control.getAttribute('data-factorio-action-order'),
			})),
			toolbarButtons: [...toolbar.querySelectorAll('button')].map((button) => button.getAttribute('aria-label')),
		}).toStrictEqual({
			gameActions: [
				{action: 'upgrade', order: '3'},
				{action: 'parametrise', order: '4'},
			],
			toolbarButtons: [
				'Upgrade items and entities in the blueprint',
				'Parametrise or reconfigure the blueprint',
				'Choose or drop an upgrade planner to hold',
			],
		});
	},
};

export const Expanded: Story = {
	args: {
		selectorOpen: true,
	},
	play: async ({canvasElement}) => {
		const canvas = within(canvasElement);
		const button = canvas.getByRole('button', {name: 'Upgrade items and entities in the blueprint'});
		await expect(button).toHaveAttribute('aria-expanded', 'true');
	},
};

export const Placed: Story = {
	args: {
		placedPlanner: {
			choice: {
				label: "Alice's belt planner",
				source: 'book:2',
			},
		},
	},
	play: async ({args, canvasElement}) => {
		const canvas = within(canvasElement);
		const page = within(document.body);
		const applyButton = canvas.getByRole('button', {
			name: 'Upgrade items and entities in the blueprint',
		});
		const heldPlanner = canvas.getByRole('button', {
			name: "Held upgrade planner Alice's belt planner; click to replace",
		});
		await expect({
			clearButton: canvas.queryByRole('button', {name: /Remove Alice's belt planner/}),
			directionArrow: heldPlanner.querySelector('.blueprint-editor-toolbar__planner-direction'),
			iconSize: heldPlanner.querySelector('[data-factorio-icon-size]')?.getAttribute('data-factorio-icon-size'),
			keyshortcuts: heldPlanner.getAttribute('aria-keyshortcuts'),
			pressed: heldPlanner.getAttribute('aria-pressed'),
			plannerState: heldPlanner.dataset.plannerState,
		}).toStrictEqual({
			clearButton: null,
			directionArrow: null,
			iconSize: 'large',
			keyshortcuts: 'Delete Backspace',
			pressed: 'true',
			plannerState: 'held',
		});
		await userEvent.hover(applyButton);
		await expect(page.getByRole('tooltip')).toHaveTextContent(
			"Use Alice's belt planner. Left-click to upgrade; right-click or press Shift+Enter to downgrade.",
		);
		await userEvent.unhover(applyButton);
		await userEvent.click(applyButton);
		await userEvent.pointer({keys: '[MouseRight]', target: applyButton});
		applyButton.focus();
		await userEvent.keyboard('{Shift>}{Enter}{/Shift}');
		await userEvent.pointer({keys: '[MouseRight]', target: heldPlanner});
		await expect(args.onApplyPlacedPlanner.mock.calls).toStrictEqual([['upgrade'], ['downgrade'], ['downgrade']]);
		await expect(args.onClearPlacedPlanner.mock.calls).toStrictEqual([[]]);
	},
};

export const DropTarget: Story = {
	play: async ({canvasElement}) => {
		const canvas = within(canvasElement);
		const slot = canvas.getByRole('button', {name: 'Choose or drop an upgrade planner to hold'});
		slot.dataset.dropState = 'ready';

		await expect({
			dropState: slot.dataset.dropState,
			plannerState: slot.dataset.plannerState,
			pressed: slot.getAttribute('aria-pressed'),
			title: slot.title,
		}).toStrictEqual({
			dropState: 'ready',
			plannerState: 'empty',
			pressed: 'false',
			title: 'Choose or drop an upgrade planner to hold for the Upgrade button.',
		});
	},
};
