import type {Meta, StoryObj} from '@storybook/react-vite';
import {fn} from 'storybook/test';

import type {BlueprintString} from '../../../../parsing/types';
import {transformStoryParameters} from './transformStoryParameters';
import {UpgradePlannerDialog} from './UpgradePlannerDialog';

const rootBlueprint: BlueprintString = {
	blueprint: {
		item: 'blueprint',
		version: 0,
		entities: [
			{entity_number: 100, name: 'transport-belt', position: {x: 0, y: 0}},
			{entity_number: 200, name: 'underground-belt', position: {x: 1, y: 0}},
		],
	},
};

const meta = {
	title: 'Blueprint/Panels/Transform/UpgradePlannerDialog',
	component: UpgradePlannerDialog,
	args: {
		breadcrumb: "Alice's blueprint",
		canChooseRootScope: false,
		mappings: {
			candidates: [
				{
					count: 1,
					from: {type: 'entity', name: 'transport-belt'},
					preserveQuality: true,
					to: {type: 'entity', name: 'fast-transport-belt'},
				},
			],
			error: undefined,
			excludedSources: new Set(),
			manualRules: [],
			onAddManualRule: fn(),
			onChangeManualRule: fn(),
			onPlannerLoad: fn(),
			onPlannerInputChange: fn(),
			onRemoveRule: fn(),
			onTargetChange: fn(),
			plannerInput: '',
			rootBlueprint,
			source: 'suggested',
			sourceLabel: 'Default Upgrade',
			sourceOptions: [
				{type: 'entity', name: 'transport-belt'},
				{type: 'entity', name: 'fast-transport-belt'},
			],
		},
		matchCount: 1,
		onClose: fn(),
		onSave: fn(),
		onScopeChange: fn(),
		replacements: {
			iconMappingCount: 1,
			iconReplacementCount: 2,
			metadataFind: 'Alice',
			metadataReplace: 'Bob',
			metadataReplacementCount: 1,
			onIconReplacementsOpen: fn(),
			onMetadataFindChange: fn(),
			onMetadataReplaceChange: fn(),
			onTextReplacementEnabledChange: fn(),
			textReplacementEnabled: true,
		},
		saveDisabled: false,
		scope: 'selection',
		selectionScopeDisabled: false,
		selectionScopeLabel: 'Selected blueprint',
	},
	parameters: transformStoryParameters,
	tags: ['autodocs'],
} satisfies Meta<typeof UpgradePlannerDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

export const EditablePlanner: Story = {};
