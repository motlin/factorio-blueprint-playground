import type {Meta, StoryObj} from '@storybook/react-vite';
import {expect, fn, within} from 'storybook/test';

import type {BlueprintString} from '../../../../parsing/types';
import {BlueprintEditorSourceMode} from '../../../../transform/blueprintEditor';
import {blueprintFilterAnalysis} from '../../../../transform/strip';
import {BlueprintEditorDialog} from './BlueprintEditorDialog';
import {BlueprintLabelIcons} from './BlueprintLabelIcons';
import {transformStoryParameters} from './transformStoryParameters';

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
			caption: 'Save Blueprint',
			scopeDescription: 'Commits changes to the existing blueprint record.',
		},
		commitDisabled: true,
		description: blueprint.blueprint?.description ?? '',
		filterAnalysis: blueprintFilterAnalysis(blueprint, BlueprintEditorSourceMode.ExistingRecord),
		flattenBookSelected: false,
		icons: (
			<BlueprintLabelIcons
				icons={[{type: 'item', name: 'iron-plate'}]}
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
		await expect(settings).toHaveAttribute('data-factorio-source', 'BlueprintSettingsGui::BlueprintSettingsGui');
		await expect(settingsScroll).toHaveAttribute('data-factorio-style', 'scroll_pane_under_subheader');
		await expect(
			[...settingsScroll.querySelectorAll('h4')].map((heading) => heading.textContent.trim()),
		).toStrictEqual(['Icon', 'Description', 'Snap to grid', 'Components', 'Filters']);
		await expect(canvas.queryByRole('heading', {name: 'Preview'})).not.toBeInTheDocument();
		await expect(dialog.querySelector('[data-blueprint-preview]')).toBeNull();
	},
};
