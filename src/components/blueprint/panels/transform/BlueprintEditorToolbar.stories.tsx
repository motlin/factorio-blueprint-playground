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
