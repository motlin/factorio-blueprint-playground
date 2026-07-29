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
		icons: [
			{index: 100, signal: {type: 'entity', name: 'assembling-machine-3', quality: 'rare'}},
			{index: 200, signal: {type: 'item', name: 'speed-module-3', quality: 'legendary'}},
		],
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
	tags: ['autodocs', 'visual-conformance'],
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
		const grid = page.getByRole('grid', {name: 'Upgrade planners'});

		await expect({
			columns: grid.getAttribute('data-factorio-columns'),
			dialogVisible: dialog.getClientRects().length > 0,
			instructions: page.getByText('Choose a planner to copy all of its mappings into the editable draft.')
				.textContent,
			tiles: within(grid)
				.getAllByRole('button')
				.map((tile) => ({
					choiceKind: tile.getAttribute('data-choice-kind'),
					label: tile.getAttribute('aria-label'),
					pressed: tile.getAttribute('aria-pressed'),
					websiteExtension: tile.getAttribute('data-website-extension'),
				})),
		}).toStrictEqual({
			columns: '6',
			dialogVisible: true,
			instructions: 'Choose a planner to copy all of its mappings into the editable draft.',
			tiles: [
				{choiceKind: 'default', label: 'Default Upgrade', pressed: 'true', websiteExtension: null},
				{
					choiceKind: 'saved',
					label: "Alice's assembler planner",
					pressed: 'false',
					websiteExtension: null,
				},
				{
					choiceKind: 'saved',
					label: "Alice's belt planner",
					pressed: 'false',
					websiteExtension: null,
				},
				{
					choiceKind: 'empty',
					label: 'Empty Planner',
					pressed: 'false',
					websiteExtension: 'empty-upgrade-planner',
				},
				{
					choiceKind: 'paste',
					label: 'Paste upgrade planner…',
					pressed: 'false',
					websiteExtension: 'paste-upgrade-planner',
				},
			],
		});
	},
};

export const LoadSavedPlanner: Story = {
	args: {includeEditingChoices: true, selectedSource: 'session:alice'},
	play: async () => {
		const page = within(document.body);
		const tile = page.getByRole('button', {name: "Alice's assembler planner"});
		const icon = tile.querySelector('.upgrade-planner-selector__record-icon');

		await expect({
			activeElement: document.activeElement?.getAttribute('aria-label'),
			factorioSource: tile.getAttribute('data-factorio-source'),
			images: Array.from(icon?.querySelectorAll('img') ?? []).map((image) => image.getAttribute('src')),
			pressed: tile.getAttribute('aria-pressed'),
			previewIconCount: icon?.getAttribute('data-preview-icon-count'),
		}).toStrictEqual({
			activeElement: "Alice's assembler planner",
			factorioSource: 'BlueprintsList::addItem',
			images: [
				'https://factorio-icon-cdn.pages.dev/item/upgrade-planner.webp',
				'https://factorio-icon-cdn.pages.dev/entity/assembling-machine-3.webp',
				'https://factorio-icon-cdn.pages.dev/quality/rare.webp',
				'https://factorio-icon-cdn.pages.dev/item/speed-module-3.webp',
				'https://factorio-icon-cdn.pages.dev/quality/legendary.webp',
			],
			pressed: 'true',
			previewIconCount: '2',
		});
	},
};

export const LoadEmptyPlanner: Story = {
	args: {includeEditingChoices: true, selectedSource: 'custom'},
	play: async () => {
		const page = within(document.body);
		const tile = page.getByRole('button', {name: 'Empty Planner'});

		await expect({
			activeElement: document.activeElement?.getAttribute('aria-label'),
			extension: tile.getAttribute('data-website-extension'),
			label: within(tile).getByText('Website extension').textContent,
			pressed: tile.getAttribute('aria-pressed'),
			websiteAction: tile.querySelector('svg')?.getAttribute('data-website-action'),
		}).toStrictEqual({
			activeElement: 'Empty Planner',
			extension: 'empty-upgrade-planner',
			label: 'Website extension',
			pressed: 'true',
			websiteAction: 'empty',
		});
	},
};

export const LoadPastePlannerFocused: Story = {
	args: {includeEditingChoices: true, selectedSource: 'custom'},
	play: async () => {
		const page = within(document.body);
		const emptyTile = page.getByRole('button', {name: 'Empty Planner'});
		const pasteTile = page.getByRole('button', {name: 'Paste upgrade planner…'});

		pasteTile.focus();
		await expect({
			activeElement: document.activeElement?.getAttribute('aria-label'),
			emptyPressed: emptyTile.getAttribute('aria-pressed'),
			pasteExtension: pasteTile.getAttribute('data-website-extension'),
			pastePressed: pasteTile.getAttribute('aria-pressed'),
			websiteAction: pasteTile.querySelector('svg')?.getAttribute('data-website-action'),
		}).toStrictEqual({
			activeElement: 'Paste upgrade planner…',
			emptyPressed: 'true',
			pasteExtension: 'paste-upgrade-planner',
			pastePressed: 'false',
			websiteAction: 'paste',
		});
	},
};
