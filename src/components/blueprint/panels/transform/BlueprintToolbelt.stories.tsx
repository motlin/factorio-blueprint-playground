import type {Meta, StoryObj} from '@storybook/react-vite';
import {expect, fn, userEvent, within} from 'storybook/test';

import {BlueprintToolbelt} from './BlueprintToolbelt';
import {transformStoryParameters} from './transformStoryParameters';

const meta = {
	title: 'Blueprint/Panels/Transform/BlueprintToolbelt',
	component: BlueprintToolbelt,
	args: {
		blueprintEditorAvailable: true,
		blueprintEditorOpen: false,
		onOpenBlueprintEditor: fn(),
		onOpenUpgradePlanner: fn(),
		upgradePlannerOpen: false,
	},
	parameters: transformStoryParameters,
	tags: ['autodocs', 'visual-conformance'],
} satisfies Meta<typeof BlueprintToolbelt>;

export default meta;
type Story = StoryObj<typeof meta>;

export const BlueprintTools: Story = {
	play: async ({args, canvasElement}) => {
		const canvas = within(canvasElement);
		const toolbar = canvas.getByRole('toolbar', {name: 'Blueprint tools'});
		const blueprintEditorButton = canvas.getByRole('button', {name: 'Open Blueprint Editor'});
		const blueprintEditorTooltip = document.getElementById(
			blueprintEditorButton.getAttribute('aria-describedby') ?? '',
		);
		if (blueprintEditorTooltip === null) {
			throw new Error('Expected the Blueprint Editor shortcut to reference its tooltip.');
		}

		await expect({
			blueprintEditorIcon: blueprintEditorButton.querySelector('img')?.getAttribute('src'),
			factorioSource: toolbar.dataset.factorioSource,
			factorioStyle: toolbar.dataset.factorioStyle,
			tools: within(toolbar)
				.getAllByRole('button')
				.map((button) => ({
					expanded: button.getAttribute('aria-expanded'),
					label: button.getAttribute('aria-label'),
					shortcut: button.getAttribute('aria-keyshortcuts'),
					shortcutOrder: button.dataset.factorioShortcutOrder,
					sourceStyle: button.dataset.factorioSourceStyle,
				})),
		}).toStrictEqual({
			blueprintEditorIcon: 'https://factorio-icon-cdn.pages.dev/shortcut/give-blueprint.webp',
			factorioSource: 'BottomContainer::updateLocation',
			factorioStyle: 'shortcut_bar_window_frame',
			tools: [
				{
					expanded: 'false',
					label: 'Open Blueprint Editor',
					shortcut: 'B',
					shortcutOrder: 'b[blueprints]-g[blueprint]',
					sourceStyle: 'shortcut_bar_button_blue',
				},
				{
					expanded: 'false',
					label: 'Open Upgrade Planner',
					shortcut: 'U',
					shortcutOrder: 'b[blueprints]-j[upgrade-planner]',
					sourceStyle: 'shortcut_bar_button_green',
				},
			],
		});

		await userEvent.hover(blueprintEditorButton);
		await expect({
			open: blueprintEditorTooltip.dataset.factorioTooltipOpen,
			text: blueprintEditorTooltip.textContent,
		}).toStrictEqual({
			open: 'true',
			text: 'Blueprint EditorOpen this blueprint or book to edit its settings and contents. B',
		});

		await userEvent.unhover(blueprintEditorButton);
		await userEvent.tab();
		await expect({
			focused: document.activeElement,
			open: blueprintEditorTooltip.dataset.factorioTooltipOpen,
		}).toStrictEqual({
			focused: blueprintEditorButton,
			open: 'true',
		});

		await userEvent.click(blueprintEditorButton);
		await userEvent.keyboard('b');
		await userEvent.click(canvas.getByRole('button', {name: 'Open Upgrade Planner'}));
		await expect({
			blueprintEditorCalls: args.onOpenBlueprintEditor.mock.calls,
			upgradePlannerCalls: args.onOpenUpgradePlanner.mock.calls,
		}).toStrictEqual({
			blueprintEditorCalls: [[], []],
			upgradePlannerCalls: [[]],
		});
	},
};

export const UpgradePlannerOnly: Story = {
	args: {
		blueprintEditorAvailable: false,
		upgradePlannerOpen: true,
	},
};
