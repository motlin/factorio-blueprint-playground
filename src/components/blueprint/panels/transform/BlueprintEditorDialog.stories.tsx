import type {Meta, StoryObj} from '@storybook/react-vite';
import {expect, fn, userEvent, within} from 'storybook/test';

import type {BlueprintString} from '../../../../parsing/types';
import {BlueprintEditorSourceMode} from '../../../../transform/blueprintEditor';
import {blueprintFilterAnalysis} from '../../../../transform/strip';
import {BlueprintEditorDialog} from './BlueprintEditorDialog';
import {BlueprintLabelIcons} from './BlueprintLabelIcons';
import {transformStoryParameters} from './transformStoryParameters';
import {BlueprintEditorCommitActionKind, BlueprintEditorCommitState} from './useBlueprintEditorDraft';

const blueprint: BlueprintString = {
	blueprint: {
		item: 'blueprint',
		label: "Alice's reactor block",
		description: 'A deterministic Blueprint Editor fixture.',
		version: 0,
		icons: [{index: 1, signal: {type: 'item', name: 'iron-plate'}}],
		entities: [
			{entity_number: 100, name: 'transport-belt', position: {x: 0, y: 0}},
			{entity_number: 200, name: 'assembling-machine-2', position: {x: 1, y: 0}},
		],
		tiles: [{name: 'concrete', position: {x: 0, y: 0}}],
	},
};

const meta = {
	title: 'Blueprint/Panels/Transform/BlueprintEditorDialog',
	component: BlueprintEditorDialog,
	args: {
		blueprint,
		book: false,
		bookOperationSelected: false,
		breadcrumb: 'Root blueprint',
		closeConfirmationOpen: false,
		commitAction: {
			caption: 'Save blueprint',
			kind: BlueprintEditorCommitActionKind.SaveRoot,
			scopeDescription: 'Saves changes to this loaded root blueprint.',
		},
		commitState: BlueprintEditorCommitState.Clean,
		context: {
			caption: 'Blueprint item',
			contextLabel: 'Existing blueprint',
		},
		description: blueprint.blueprint?.description ?? '',
		filterAnalysis: blueprintFilterAnalysis(blueprint, BlueprintEditorSourceMode.ExistingRecord),
		flattenBookSelected: false,
		icons: (
			<BlueprintLabelIcons
				icons={[{type: 'item', name: 'iron-plate'}]}
				itemName="blueprint"
				onChange={fn()}
				onChoose={fn()}
				signalTitle={(signal) => `${signal.type ?? 'item'}:${signal.name}`}
			/>
		),
		label: blueprint.blueprint?.label ?? '',
		onApplyPlacedPlanner: fn(),
		onApplyPlannerChoice: fn(),
		onClearPlacedPlanner: fn(),
		onClose: fn(),
		onComponentRemovedChange: fn(),
		onCommit: fn(),
		onDescriptionChange: fn(),
		onDiscard: fn(),
		onDropPlanner: fn(),
		onEntitiesIncludedChange: fn(),
		onFuelIncludedChange: fn(),
		onFlattenBookSelectedChange: fn(),
		onKeepEditing: fn(),
		onLabelChange: fn(),
		onModulesIncludedChange: fn(),
		onStationNamesIncludedChange: fn(),
		onParametersChange: fn(),
		onSnapGridChange: fn(),
		onSortBookSelectedChange: fn(),
		onTilesIncludedChange: fn(),
		onTrainsIncludedChange: fn(),
		onVehiclesIncludedChange: fn(),
		parameters: [],
		plannerDropError: undefined,
		placedPlanner: undefined,
		removedComponents: new Set(),
		rootBlueprint: blueprint,
		signalOptions: [{type: 'item', name: 'iron-plate'}],
		snapGrid: {
			absolute: false,
			enabled: true,
			height: 2,
			positionX: 0,
			positionY: 0,
			width: 2,
		},
		sortBookSelected: false,
		stripEntitiesSelected: false,
		stripFuelSelected: false,
		stripModulesSelected: false,
		stripStationNamesSelected: false,
		stripTilesSelected: false,
		stripTrainsSelected: false,
		stripVehiclesSelected: false,
	},
	parameters: transformStoryParameters,
	tags: ['autodocs', 'visual-conformance'],
} satisfies Meta<typeof BlueprintEditorDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

async function expectContext(
	canvasElement: HTMLElement,
	expected: {breadcrumb: string; caption: string; contextLabel: string},
) {
	const canvas = within(canvasElement);
	const context = canvas.getByRole('navigation', {name: 'Blueprint context'});
	await expect({
		breadcrumb: within(context).getByText(expected.breadcrumb).textContent,
		caption: canvas.getByRole('heading', {name: expected.caption}).textContent,
		context: [...context.children].map((part) => part.textContent),
	}).toStrictEqual({
		breadcrumb: expected.breadcrumb,
		caption: expected.caption,
		context: [expected.contextLabel, '›', expected.breadcrumb],
	});
}

async function expectCommitAction(
	canvasElement: HTMLElement,
	expected: {
		busy: string;
		caption: string;
		disabled: boolean;
		kind: BlueprintEditorCommitActionKind;
		scope: string;
		state: BlueprintEditorCommitState;
		status: string;
	},
) {
	const canvas = within(canvasElement);
	const footer = canvas.getByRole('contentinfo');
	const action = within(footer).getByRole<HTMLButtonElement>('button', {name: expected.caption});

	await expect({
		actionBusy: action.getAttribute('aria-busy'),
		actionDisabled: action.disabled,
		buttons: within(footer)
			.getAllByRole('button')
			.map((button) => button.textContent),
		kind: footer.dataset.commitKind,
		scope: within(footer).getByText(expected.scope).textContent,
		state: footer.dataset.commitState,
		status: within(footer).getByRole('status').textContent,
	}).toStrictEqual({
		actionBusy: expected.busy,
		actionDisabled: expected.disabled,
		buttons: [expected.caption],
		kind: expected.kind,
		scope: expected.scope,
		state: expected.state,
		status: expected.status,
	});
}

export const Blueprint: Story = {
	play: async ({canvasElement}) => {
		const canvas = within(canvasElement);
		const dialog = canvas.getByRole('dialog', {name: 'Blueprint Editor'});
		const settings = canvas.getByLabelText('Blueprint settings');
		const settingsScroll = settings.querySelector('.blueprint-editor__settings-scroll');
		if (settingsScroll === null) {
			throw new Error('Expected the BlueprintSettingsGui scroll pane.');
		}

		await expect(dialog).toHaveAttribute('data-factorio-source', 'BlueprintSetupGui::BlueprintSetupGui');
		await expect({
			breadcrumb: canvas.getByText('Root blueprint').textContent,
			caption: canvas.getByRole('heading', {name: 'Blueprint item'}).textContent,
			close: canvas.getByRole('button', {name: 'Close Blueprint Editor'}).getAttribute('title'),
			context: canvas.getByText('Existing blueprint').textContent,
		}).toStrictEqual({
			breadcrumb: 'Root blueprint',
			caption: 'Blueprint item',
			close: 'Close Blueprint Editor (asks before discarding changes)',
			context: 'Existing blueprint',
		});
		await expect(settings).toHaveAttribute('data-factorio-source', 'BlueprintSettingsGui::BlueprintSettingsGui');
		await expect(settingsScroll).toHaveAttribute('data-factorio-style', 'scroll_pane_under_subheader');
		await expect(
			[...settingsScroll.querySelectorAll('h4')].map((heading) => heading.textContent.trim()),
		).toStrictEqual(['Icon', 'Description', 'Snap to grid', 'Components', 'Filters']);
		await expect(settingsScroll.querySelector('[data-website-extension="book-operations"]')).toBeNull();
		await expect(canvas.queryByRole('heading', {name: 'Preview'})).not.toBeInTheDocument();
		await expect(dialog.querySelector('[data-blueprint-preview]')).toBeNull();
		await expectCommitAction(canvasElement, {
			busy: 'false',
			caption: 'Save blueprint',
			disabled: true,
			kind: BlueprintEditorCommitActionKind.SaveRoot,
			scope: 'Saves changes to this loaded root blueprint.',
			state: BlueprintEditorCommitState.Clean,
			status: 'No changes to save.',
		});
	},
};

export const NewBlueprint: Story = {
	args: {
		breadcrumb: "Alice's reactor block",
		commitAction: {
			caption: 'Create blueprint',
			kind: BlueprintEditorCommitActionKind.Create,
			scopeDescription: 'Creates this captured draft as the loaded root blueprint.',
		},
		commitState: BlueprintEditorCommitState.Ready,
		context: {
			caption: 'Set up new blueprint',
			contextLabel: 'New blueprint',
		},
	},
	play: async ({canvasElement}) => {
		await expectContext(canvasElement, {
			breadcrumb: "Alice's reactor block",
			caption: 'Set up new blueprint',
			contextLabel: 'New blueprint',
		});
		await expectCommitAction(canvasElement, {
			busy: 'false',
			caption: 'Create blueprint',
			disabled: false,
			kind: BlueprintEditorCommitActionKind.Create,
			scope: 'Creates this captured draft as the loaded root blueprint.',
			state: BlueprintEditorCommitState.Ready,
			status: 'Blueprint is ready to create.',
		});
	},
};

export const BlueprintLibraryBook: Story = {
	args: {
		book: true,
		breadcrumb: "Alice's blueprint book",
		context: {
			caption: 'Blueprint book in the blueprint library',
			contextLabel: 'Blueprint library record',
		},
	},
	play: async ({canvasElement}) => {
		await expectContext(canvasElement, {
			breadcrumb: "Alice's blueprint book",
			caption: 'Blueprint book in the blueprint library',
			contextLabel: 'Blueprint library record',
		});
		const canvas = within(canvasElement);
		const operations = canvas.getByRole('region', {name: 'Book operations'});
		const flatten = canvas.getByRole<HTMLInputElement>('checkbox', {name: 'Flatten nested books'});
		const sort = canvas.getByRole<HTMLInputElement>('checkbox', {name: 'Sort entries by label'});
		const flattenDescriptionId = flatten.getAttribute('aria-describedby');
		if (flattenDescriptionId === null) {
			throw new Error('Expected the flatten operation to describe its website-only effect.');
		}
		await expect({
			extension: operations.dataset.websiteExtension,
			factorioSource: operations.dataset.factorioSource,
			factorioStyle: operations.dataset.factorioStyle,
			flattenChecked: flatten.checked,
			flattenDescription: document.getElementById(flattenDescriptionId)?.textContent,
			sortChecked: sort.checked,
			state: operations.dataset.operationState,
			status: within(operations).getByText('0 of 2 enabled').textContent,
		}).toStrictEqual({
			extension: 'book-operations',
			factorioSource: undefined,
			factorioStyle: undefined,
			flattenChecked: false,
			flattenDescription: 'Move nested blueprints into this book as one flat list.',
			sortChecked: false,
			state: 'available',
			status: '0 of 2 enabled',
		});
	},
};

export const BookOperationsEnabledAndDisabled: Story = {
	args: {
		book: true,
		bookOperationSelected: true,
		breadcrumb: "Alice's blueprint book",
		context: {
			caption: 'Blueprint book in the blueprint library',
			contextLabel: 'Blueprint library record',
		},
		flattenBookSelected: true,
	},
	play: async ({args, canvasElement}) => {
		const canvas = within(canvasElement);
		const operations = canvas.getByRole('region', {name: 'Book operations'});
		const flatten = canvas.getByRole<HTMLInputElement>('checkbox', {name: 'Flatten nested books'});
		const sort = canvas.getByRole<HTMLInputElement>('checkbox', {name: 'Sort entries by label'});

		await expect({
			flattenChecked: flatten.checked,
			flattenDescription: canvas.getByText('Move nested blueprints into this book as one flat list.').textContent,
			sortChecked: sort.checked,
			sortDescription: canvas.getByText("Order this book's entries by label.").textContent,
			state: operations.dataset.operationState,
			status: within(operations).getByText('1 of 2 enabled').textContent,
		}).toStrictEqual({
			flattenChecked: true,
			flattenDescription: 'Move nested blueprints into this book as one flat list.',
			sortChecked: false,
			sortDescription: "Order this book's entries by label.",
			state: 'enabled',
			status: '1 of 2 enabled',
		});

		await userEvent.click(sort);
		await expect(args.onSortBookSelectedChange.mock.calls).toStrictEqual([[true]]);
	},
};

export const ChildBlueprint: Story = {
	args: {
		breadcrumb: "Alice's blueprint book › Reactor block",
		commitAction: {
			caption: 'Save blueprint',
			kind: BlueprintEditorCommitActionKind.SaveChild,
			scopeDescription: 'Saves this child in its containing book. The whole book remains the loaded result.',
		},
		commitState: BlueprintEditorCommitState.Ready,
		context: {
			caption: 'Blueprint in the blueprint library',
			contextLabel: 'Child blueprint record',
		},
	},
	play: async ({canvasElement}) => {
		await expectContext(canvasElement, {
			breadcrumb: "Alice's blueprint book › Reactor block",
			caption: 'Blueprint in the blueprint library',
			contextLabel: 'Child blueprint record',
		});
		await expectCommitAction(canvasElement, {
			busy: 'false',
			caption: 'Save blueprint',
			disabled: false,
			kind: BlueprintEditorCommitActionKind.SaveChild,
			scope: 'Saves this child in its containing book. The whole book remains the loaded result.',
			state: BlueprintEditorCommitState.Ready,
			status: 'Changes are ready to save.',
		});
	},
};

export const ExistingRootDirty: Story = {
	args: {
		commitState: BlueprintEditorCommitState.Ready,
	},
	play: async ({canvasElement}) => {
		await expectCommitAction(canvasElement, {
			busy: 'false',
			caption: 'Save blueprint',
			disabled: false,
			kind: BlueprintEditorCommitActionKind.SaveRoot,
			scope: 'Saves changes to this loaded root blueprint.',
			state: BlueprintEditorCommitState.Ready,
			status: 'Changes are ready to save.',
		});
	},
};

export const CommitPending: Story = {
	args: {
		commitState: BlueprintEditorCommitState.Pending,
	},
	play: async ({canvasElement}) => {
		await expectCommitAction(canvasElement, {
			busy: 'true',
			caption: 'Save blueprint',
			disabled: true,
			kind: BlueprintEditorCommitActionKind.SaveRoot,
			scope: 'Saves changes to this loaded root blueprint.',
			state: BlueprintEditorCommitState.Pending,
			status: 'Saving changes…',
		});
	},
};

export const InvalidDraft: Story = {
	args: {
		commitState: BlueprintEditorCommitState.Invalid,
	},
	play: async ({canvasElement}) => {
		await expectCommitAction(canvasElement, {
			busy: 'false',
			caption: 'Save blueprint',
			disabled: true,
			kind: BlueprintEditorCommitActionKind.SaveRoot,
			scope: 'Saves changes to this loaded root blueprint.',
			state: BlueprintEditorCommitState.Invalid,
			status: 'This draft cannot be saved.',
		});
	},
};

export const DirtyCloseConfirmation: Story = {
	args: {
		closeConfirmationOpen: true,
		commitState: BlueprintEditorCommitState.Ready,
	},
	play: async ({canvasElement}) => {
		const canvas = within(canvasElement);
		const confirmation = within(document.body).getByRole('alertdialog', {
			name: 'There are uncommitted changes',
		});

		await expect(
			within(confirmation)
				.getAllByRole('button')
				.map((button) => button.textContent),
		).toStrictEqual(['Keep Editing', 'Discard Changes']);
		await expect(canvas.getByRole('button', {hidden: true, name: 'Save blueprint'})).toBeInTheDocument();
	},
};
