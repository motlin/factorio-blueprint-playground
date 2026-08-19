import type {Meta, StoryObj} from '@storybook/react-vite';
import {fn} from 'storybook/test';

import type {BlueprintString} from '../../../../parsing/types';
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
		description: blueprint.blueprint?.description ?? '',
		dirty: false,
		draftBlueprint: blueprint,
		filters: {entities: true, modules: false, tiles: true, trains: false},
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
		onClearPlacedPlanner: fn(),
		onClose: fn(),
		onComponentRemovedChange: fn(),
		onDescriptionChange: fn(),
		onDiscard: fn(),
		onDropPlanner: fn(),
		onEntitiesIncludedChange: fn(),
		onFlattenBookSelectedChange: fn(),
		onKeepEditing: fn(),
		onLabelChange: fn(),
		onModulesIncludedChange: fn(),
		onParametersChange: fn(),
		onPlannerPlace: fn(),
		onSaved: fn(),
		onSnapGridChange: fn(),
		onSortBookSelectedChange: fn(),
		onTilesIncludedChange: fn(),
		onTrainsIncludedChange: fn(),
		parameters: [],
		plannerDropError: undefined,
		placedPlanner: undefined,
		removedComponents: new Set(),
		rootBlueprint: blueprint,
		selectedPath: '',
		signalOptions: [{type: 'item', name: 'iron-plate'}],
		snapGrid: undefined,
		sortBookSelected: false,
		stripEntitiesSelected: false,
		stripModulesSelected: false,
		stripTilesSelected: false,
		stripTrainsSelected: false,
	},
	parameters: transformStoryParameters,
	tags: ['autodocs'],
} satisfies Meta<typeof BlueprintEditorDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Blueprint: Story = {};
