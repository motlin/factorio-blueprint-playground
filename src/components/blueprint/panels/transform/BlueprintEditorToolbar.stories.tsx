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
		await expect({
			actionOrder: toolbar.dataset.factorioActionOrder,
			gameActions: [...gameActions.children].map((control) => control.getAttribute('data-factorio-action')),
			toolbarChildren: [...toolbar.children].map((group) => group.className),
			websiteExtension: websiteActions.dataset.websiteExtension,
		}).toStrictEqual({
			actionOrder: 'title,reassign,copy,upgrade,parametrise,export,delete',
			gameActions: ['upgrade'],
			toolbarChildren: ['blueprint-editor-toolbar__game-actions', 'blueprint-editor-toolbar__website-actions'],
			websiteExtension: 'dropped-upgrade-planner-slot',
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
		await expect(args.onOpenUpgradePlannerSelector.mock.calls).toStrictEqual([[]]);
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
				'Choose upgrade planner for toolbar slot',
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
			direction: 'upgrade',
		},
	},
	play: async ({args, canvasElement}) => {
		const canvas = within(canvasElement);
		const applyButton = canvas.getByRole('button', {name: "Apply Alice's belt planner as upgrade"});
		await expect(
			canvas.getByRole('button', {
				name: "Change placed upgrade planner, currently Alice's belt planner",
			}),
		).toBeVisible();
		await userEvent.click(applyButton);
		await expect(args.onApplyPlacedPlanner.mock.calls).toStrictEqual([['upgrade']]);
	},
};
