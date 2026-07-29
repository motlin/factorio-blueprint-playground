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
	tags: ['autodocs'],
} satisfies Meta<typeof BlueprintToolbelt>;

export default meta;
type Story = StoryObj<typeof meta>;

export const BlueprintTools: Story = {
	play: async ({args, canvasElement}) => {
		const canvas = within(canvasElement);
		const toolbar = canvas.getByRole('toolbar', {name: 'Blueprint tools'});

		await expect({
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

		await userEvent.click(canvas.getByRole('button', {name: 'Open Blueprint Editor'}));
		await userEvent.click(canvas.getByRole('button', {name: 'Open Upgrade Planner'}));
		await expect({
			blueprintEditorCalls: args.onOpenBlueprintEditor.mock.calls,
			upgradePlannerCalls: args.onOpenUpgradePlanner.mock.calls,
		}).toStrictEqual({
			blueprintEditorCalls: [[]],
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
