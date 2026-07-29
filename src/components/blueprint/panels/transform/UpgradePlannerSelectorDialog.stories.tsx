import type {Meta, StoryObj} from '@storybook/react-vite';
import {expect, fn, within} from 'storybook/test';

import type {BlueprintString, UpgradePlanner} from '../../../../parsing/types';
import {transformStoryParameters} from './transformStoryParameters';
import {UpgradePlannerSelectorDialog} from './UpgradePlannerSelectorDialog';

const sessionPlanner: UpgradePlanner = {
	item: 'upgrade-planner',
	label: "Alice's assembler planner",
	version: 0,
	settings: {
		description: 'Upgrades assembling machines in the example factory.',
		mappers: [
			{
				index: 100,
				from: {type: 'entity', name: 'assembling-machine-1'},
				to: {type: 'entity', name: 'assembling-machine-2'},
			},
		],
	},
};

const rootBlueprint: BlueprintString = {
	blueprint_book: {
		item: 'blueprint-book',
		version: 0,
		blueprints: [
			{
				index: 100,
				upgrade_planner: {
					item: 'upgrade-planner',
					label: "Alice's belt planner",
					version: 0,
					settings: {
						mappers: [
							{
								index: 100,
								from: {type: 'entity', name: 'transport-belt'},
								to: {type: 'entity', name: 'fast-transport-belt'},
							},
						],
					},
				},
			},
		],
	},
};

const meta = {
	title: 'Blueprint/Panels/Transform/UpgradePlannerSelectorDialog',
	component: UpgradePlannerSelectorDialog,
	args: {
		dialogId: 'upgrade-planner-selector-story',
		includeEditingChoices: false,
		onChoose: fn(),
		onClose: fn(),
		rootBlueprint,
		selectedSource: 'suggested',
		sessionChoice: {
			label: "Alice's assembler planner",
			planner: sessionPlanner,
			source: 'session:alice',
		},
	},
	parameters: transformStoryParameters,
	tags: ['autodocs'],
} satisfies Meta<typeof UpgradePlannerSelectorDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

export const ApplyPlanner: Story = {
	play: async () => {
		const page = within(document.body);
		const dialog = page.getByRole('dialog', {name: 'Select the upgrade planner to apply'});

		await expect(dialog).toBeVisible();
		await expect(page.getByRole('button', {name: 'Search upgrade planners'})).toBeVisible();
		await expect(page.getByRole('button', {name: 'Close upgrade planner selector'})).toBeVisible();
		await expect(page.getByRole('button', {name: 'List view'})).toHaveAttribute('aria-pressed', 'true');
		await expect(page.getByRole('button', {name: "Alice's assembler planner"})).toBeVisible();
	},
};

export const LoadPlanner: Story = {
	args: {includeEditingChoices: true},
	play: async () => {
		const page = within(document.body);
		const dialog = page.getByRole('dialog', {name: 'Load an upgrade planner'});

		await expect(dialog).toBeVisible();
		await expect(
			page.getByText('Choose a planner to copy all of its mappings into the editable draft.'),
		).toBeVisible();
		await expect(page.getByRole('button', {name: 'Empty Planner'})).toBeVisible();
		await expect(page.getByRole('button', {name: 'Paste upgrade planner…'})).toBeVisible();
	},
};
