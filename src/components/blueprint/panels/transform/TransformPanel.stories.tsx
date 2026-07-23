import type {Meta, StoryObj} from '@storybook/react-vite';
import {createMemoryHistory, createRootRoute, createRouter, RouterProvider} from '@tanstack/react-router';
import {expect, userEvent, within} from 'storybook/test';

import type {BlueprintString} from '../../../../parsing/types';
import {TransformPanel} from './TransformPanel';

const meta: Meta<typeof TransformPanel> = {
	title: 'Blueprint/Panels/Transform/TransformPanel',
	component: TransformPanel,
	parameters: {
		layout: 'centered',
	},
	tags: ['autodocs'],
	decorators: [
		(StoryComponent) => {
			const rootRoute = createRootRoute({
				component: () => (
					<div style={{minWidth: '500px'}}>
						<StoryComponent />
					</div>
				),
			});
			const router = createRouter({routeTree: rootRoute, history: createMemoryHistory({initialEntries: ['/']})});

			return <RouterProvider router={router} />;
		},
	],
};

export default meta;
type Story = StoryObj<typeof TransformPanel>;

const planner: BlueprintString = {
	upgrade_planner: {
		item: 'upgrade-planner',
		label: "Alice's belt planner",
		version: 0,
		settings: {
			mappers: [
				{
					index: 100,
					from: {type: 'entity', name: 'transport-belt'},
					to: {type: 'entity', name: 'express-transport-belt'},
				},
			],
		},
	},
};

const plannerBook: BlueprintString = {
	blueprint_book: {
		item: 'blueprint-book',
		version: 0,
		blueprints: [
			{
				index: 100,
				blueprint: {
					item: 'blueprint',
					version: 0,
					entities: [{entity_number: 100, name: 'transport-belt', position: {x: 0, y: 0}}],
				},
			},
			{index: 200, ...planner},
		],
	},
};

export const Blueprint: Story = {
	args: {
		blueprint: {
			blueprint: {
				item: 'blueprint',
				label: 'Belt test',
				description: '[item=transport-belt] Belt test\nKeeps rich-text strings unchanged.',
				version: 0,
				'snap-to-grid': {x: 32, y: 64},
				'absolute-snapping': true,
				'position-relative-to-grid': {x: 0, y: -16},
				entities: [{entity_number: 1, name: 'transport-belt', position: {x: 0, y: 0}}],
			},
		},
	},
};

export const UpgradePlanner: Story = {
	args: Blueprint.args,
	play: async ({canvasElement}) => {
		const canvas = within(canvasElement);
		await userEvent.click(canvas.getByRole('button', {name: 'Open Upgrade Planner'}));

		await expect(canvas.getByRole('dialog', {name: 'Upgrade Planner'})).toHaveAttribute('aria-modal', 'true');
		await expect(canvas.getByRole('region', {name: 'Upgrade Planner configuration'})).toBeVisible();
		await expect(canvas.getByRole('heading', {name: 'Upgrade mappings'})).toBeVisible();
		await expect(canvas.getByRole('group', {name: 'From and To mappings'})).toBeVisible();
		await expect(canvas.getByRole('group', {name: 'Add mapping'})).toBeVisible();
		await expect(canvas.getByRole('button', {name: 'Choose source for new mapping'})).toBeVisible();
		await expect(canvas.getByText('Website extension')).toBeVisible();
		await expect(canvas.getByRole('heading', {name: 'Book-wide replacements'})).toBeVisible();
		await expect(
			canvas.getByText(
				'Always applies to titles, descriptions, and label icons throughout the entire root book, regardless of the selected blueprint.',
			),
		).toBeVisible();
		await expect(canvas.queryByText('Live result')).not.toBeInTheDocument();
		await expect(canvas.queryByRole('heading', {name: 'Preview'})).not.toBeInTheDocument();
		await expect(canvas.queryByRole('button', {name: 'Strip quality'})).not.toBeInTheDocument();
		await userEvent.click(canvas.getByRole('button', {name: /Load planner, currently Default Upgrade/}));
		await expect(canvas.getByRole('dialog', {name: 'Load an upgrade planner'})).toBeVisible();
		await expect(canvas.getByRole('button', {name: 'Default Upgrade'})).toBeVisible();
		await expect(canvas.getByRole('button', {name: 'Empty planner'})).toBeVisible();
		await expect(canvas.getByRole('button', {name: 'Paste upgrade planner…'})).toBeVisible();
	},
};

export const BlueprintEditor: Story = {
	args: Blueprint.args,
	play: async ({canvasElement}) => {
		const canvas = within(canvasElement);
		await userEvent.click(canvas.getByRole('button', {name: 'Open Blueprint Editor'}));

		await expect(canvas.getByRole('dialog', {name: 'Blueprint Editor'})).toHaveAttribute('aria-modal', 'true');
		await expect(canvas.getByText('Belt test')).toHaveClass('blueprint-editor__title');
		await expect(canvas.getByRole('button', {name: 'Edit blueprint title'})).toBeVisible();
		await expect(canvas.queryByRole('heading', {name: 'Book-wide replacements'})).not.toBeInTheDocument();
		await expect(canvas.queryByRole('button', {name: /Icon replacements/})).not.toBeInTheDocument();
		await expect(canvas.getByRole('textbox', {name: 'Blueprint description'})).toHaveValue(
			'[item=transport-belt] Belt test\nKeeps rich-text strings unchanged.',
		);
		await expect(canvas.getByRole('checkbox', {name: 'Snap to grid'})).toBeChecked();
		await expect(canvas.getByRole('spinbutton', {name: 'Width'})).toHaveValue(32);
		await expect(canvas.getByRole('spinbutton', {name: 'Height'})).toHaveValue(64);
		await expect(canvas.getByRole('spinbutton', {name: 'X'})).toHaveValue(0);
		await expect(canvas.getByRole('spinbutton', {name: 'Y'})).toHaveValue(-16);
		await expect(canvas.getByRole('radio', {name: 'Absolute'})).toBeChecked();
		await expect(canvas.getByRole('heading', {name: 'Components'})).toBeVisible();
		await expect(canvas.getByRole('button', {name: /Transport belt, 1/})).toBeVisible();
		await expect(canvas.getByRole('button', {name: 'Save blueprint'})).toBeDisabled();
		await expect(
			canvas.getByText(
				'Saves changes to the loaded blueprint. Export and Open in Playground use the saved blueprint.',
			),
		).toBeVisible();
		await expect(canvas.queryByRole('heading', {name: 'Preview'})).not.toBeInTheDocument();
		await userEvent.click(canvas.getByRole('button', {name: 'Upgrade items and entities in the blueprint'}));
		await expect(canvas.getByRole('dialog', {name: 'Select the upgrade planner to apply'})).toBeVisible();
		await expect(canvas.getByRole('button', {name: 'Default Upgrade'})).toBeVisible();
	},
};

export const BlueprintBook: Story = {
	args: {
		blueprint: {
			blueprint_book: {
				item: 'blueprint-book',
				label: 'Factory test book',
				version: 0,
				blueprints: [],
			},
		},
	},
};

export const Planner: Story = {
	args: {
		blueprint: planner,
		rootBlueprint: plannerBook,
		selectedPath: '2',
	},
};
