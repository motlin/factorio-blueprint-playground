import type {Meta, StoryObj} from '@storybook/react-vite';
import {expect, fn, within} from 'storybook/test';

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
			mappings: [
				{
					count: 1,
					from: {type: 'entity', name: 'transport-belt'},
					mappingId: 'mapping-belt',
					slotIndex: 0,
					to: {type: 'entity', name: 'fast-transport-belt'},
				},
			],
			error: undefined,
			onClearEndpoint: fn(),
			onMove: fn(),
			onPlannerLoad: fn(),
			onPlannerInputChange: fn(),
			onSourceChange: fn(),
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
		onApply: fn(),
		onClose: fn(),
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
		recordMetadata: {
			description: 'Upgrade the starter belt line.',
			icons: [{type: 'entity', name: 'fast-transport-belt'}],
			label: 'Starter belt upgrades',
			onDescriptionChange: fn(),
			onIconsChange: fn(),
			onLabelChange: fn(),
		},
		saveDisabled: false,
		savePrompt: {
			label: 'Starter belt upgrades',
			onCancel: fn(),
			onOpen: fn(),
			onSaveAsNew: fn(),
			open: false,
			pending: false,
		},
		scope: 'selection',
		selectionScopeDisabled: false,
		selectionScopeLabel: 'Selected blueprint',
	},
	parameters: transformStoryParameters,
	tags: ['autodocs', 'visual-conformance'],
} satisfies Meta<typeof UpgradePlannerDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

export const EditablePlanner: Story = {
	play: async () => {
		const dialog = within(document.body).getByRole('dialog', {name: 'Upgrade Planner'});
		const editor = within(dialog).getByRole('region', {name: 'Upgrade planner editor'});
		const context = within(dialog).getByRole('navigation', {name: 'Upgrade planner blueprint context'});
		const mapperScroll = within(editor).getByRole('region', {name: 'Upgrade mappings'});
		const grid = mapperScroll.querySelector<HTMLElement>('.upgrade-mapping-grid');
		const firstPair = mapperScroll.querySelector<HTMLElement>('.upgrade-mapping-grid__slots > li');
		const firstEndpoint = mapperScroll.querySelector<HTMLElement>('.transform-signal-slot');
		if (grid === null || firstPair === null || firstEndpoint === null) {
			throw new Error('Expected the Upgrade Planner mapping geometry.');
		}
		await expect({
			applicationInsideEditor: editor.querySelector('[data-website-extension="planner-application"]'),
			bodyOrder: [...(editor.parentElement?.children ?? [])].map(
				(element) =>
					element.getAttribute('data-factorio-style') ?? element.getAttribute('data-website-extension'),
			),
			endpointWidth: firstEndpoint.getBoundingClientRect().width,
			gridWidth: grid.getBoundingClientRect().width,
			headingGroups: mapperScroll.querySelectorAll('.upgrade-mapping-grid__headings > div').length,
			headerIcon: dialog.querySelector('.upgrade-planner-dialog__identity-icon img')?.getAttribute('src'),
			libraryState: within(dialog).getByLabelText('Planner library status').textContent,
			mapperStyle: mapperScroll.dataset.factorioStyle,
			mappingCount: mapperScroll.querySelectorAll('[data-mapping-key]').length,
			pairWidth: firstPair.getBoundingClientRect().width,
			plannerContext: context.textContent,
			slotCount: mapperScroll.querySelectorAll('[data-upgrade-mapping-slot]').length,
		}).toStrictEqual({
			applicationInsideEditor: null,
			bodyOrder: ['entity_frame', 'planner-application', null],
			endpointWidth: 40,
			gridWidth: 400,
			headingGroups: 4,
			headerIcon: 'https://factorio-icon-cdn.pages.dev/item/upgrade-planner.webp',
			libraryState: 'Local draft · not in Blueprint Library',
			mapperStyle: 'mappers_scroll_pane',
			mappingCount: 1,
			pairWidth: 80,
			plannerContext: "Selected blueprint›Alice's blueprint",
			slotCount: 16,
		});
	},
};

export const SavedPlannerRootScope: Story = {
	args: {
		breadcrumb: "Alice's belt book › Smelting",
		canChooseRootScope: true,
		matchCount: 153,
		savedRecordName: 'Starter belt upgrades',
		scope: 'root',
	},
	play: async () => {
		const dialog = within(document.body).getByRole('dialog', {name: 'Upgrade Planner'});
		await expect({
			applicationStatus: within(dialog).getByLabelText('153 matches').textContent,
			context: within(dialog).getByRole('navigation', {name: 'Upgrade planner blueprint context'}).textContent,
			contextExtension: dialog
				.querySelector('.upgrade-planner-dialog__context-strip')
				?.getAttribute('data-website-extension'),
			libraryState: within(dialog).getByLabelText('Planner library status').textContent,
		}).toStrictEqual({
			applicationStatus: '153 matches',
			context: "Entire root book›Alice's belt book › Smelting",
			contextExtension: 'planner-context',
			libraryState: 'Blueprint Library › Starter belt upgrades',
		});
	},
};

export const EmptyPlanner: Story = {
	args: {
		mappings: {
			...meta.args.mappings,
			mappings: [],
		},
		matchCount: 0,
	},
	play: async () => {
		const mapperScroll = within(document.body).getByRole('region', {name: 'Upgrade mappings'});
		await expect({
			mappingCount: mapperScroll.querySelectorAll('[data-mapping-key]').length,
			slotCount: mapperScroll.querySelectorAll('[data-upgrade-mapping-slot]').length,
		}).toStrictEqual({mappingCount: 0, slotCount: 16});
	},
};

export const ScrollablePlanner: Story = {
	args: {
		mappings: {
			...meta.args.mappings,
			mappings: Array.from({length: 17}, (_, index) => ({
				count: index + 1,
				from: {type: 'entity' as const, name: 'transport-belt'},
				mappingId: `mapping-${index.toString()}`,
				slotIndex: index,
				to: {type: 'entity' as const, name: 'fast-transport-belt'},
			})),
		},
		matchCount: 153,
	},
	play: async () => {
		const mapperScroll = within(document.body).getByRole('region', {name: 'Upgrade mappings'});
		await expect({
			mappingCount: mapperScroll.querySelectorAll('[data-mapping-key]').length,
			slotCount: mapperScroll.querySelectorAll('[data-upgrade-mapping-slot]').length,
		}).toStrictEqual({mappingCount: 17, slotCount: 24});
	},
};
