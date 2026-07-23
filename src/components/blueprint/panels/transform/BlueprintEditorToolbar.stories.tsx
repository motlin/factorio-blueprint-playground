import type {Meta, StoryObj} from '@storybook/react-vite';
import {expect, fn, userEvent, within} from 'storybook/test';

import {BlueprintEditorToolbar} from './BlueprintEditorToolbar';

const meta = {
	title: 'Blueprint/Panels/Transform/BlueprintEditorToolbar',
	component: BlueprintEditorToolbar,
	args: {
		onOpenUpgradePlannerSelector: fn(),
		selectorDialogId: 'upgrade-planner-selector',
		selectorOpen: false,
	},
	parameters: {
		layout: 'centered',
	},
	tags: ['autodocs'],
} satisfies Meta<typeof BlueprintEditorToolbar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Available: Story = {
	play: async ({args, canvasElement}) => {
		const canvas = within(canvasElement);
		const button = canvas.getByRole('button', {name: 'Upgrade items and entities in the blueprint'});
		await userEvent.hover(button);
		await expect(canvas.getByRole('tooltip')).toBeVisible();
		await userEvent.unhover(button);
		await userEvent.tab();
		await expect(button).toHaveFocus();
		await expect(canvas.getByRole('tooltip')).toBeVisible();
		await userEvent.click(button);
		await expect(args.onOpenUpgradePlannerSelector.mock.calls).toStrictEqual([[]]);
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
