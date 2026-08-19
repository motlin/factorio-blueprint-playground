import type {Meta, StoryObj} from '@storybook/react-vite';
import {fn} from 'storybook/test';

import type {BlueprintString} from '../../../../parsing/types';
import {transformStoryParameters} from './transformStoryParameters';
import {UpgradePlannerSelectorDialog} from './UpgradePlannerSelectorDialog';

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
	},
	parameters: transformStoryParameters,
	tags: ['autodocs'],
} satisfies Meta<typeof UpgradePlannerSelectorDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

export const ApplyPlanner: Story = {};

export const LoadPlanner: Story = {
	args: {includeEditingChoices: true},
};
