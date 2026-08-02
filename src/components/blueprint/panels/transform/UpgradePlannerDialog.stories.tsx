import type {Meta, StoryObj} from '@storybook/react-vite';
import {useState, type ComponentProps} from 'react';
import {expect, fn, userEvent, within} from 'storybook/test';

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
		recordTools: {
			deleteKind: 'local',
			onCopy: fn(async () => {
				await Promise.resolve();
				return true;
			}),
			onDelete: fn(async () => {
				await Promise.resolve();
			}),
			onExport: fn(),
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

function InteractiveScopePlanner(args: ComponentProps<typeof UpgradePlannerDialog>) {
	const [scope, setScope] = useState(args.scope);
	return (
		<UpgradePlannerDialog
			{...args}
			scope={scope}
			onScopeChange={(nextScope) => {
				args.onScopeChange(nextScope);
				setScope(nextScope);
			}}
		/>
	);
}

export const EditablePlanner: Story = {
	play: async () => {
		const dialog = within(document.body).getByRole('dialog', {name: 'Upgrade Planner'});
		const editor = within(dialog).getByRole('region', {name: 'Upgrade planner editor'});
		const context = within(dialog).getByRole('navigation', {name: 'Upgrade planner blueprint context'});
		const recordTools = within(dialog).getByRole('toolbar', {name: 'Planner record tools'});
		const scope = within(dialog).getByRole('radiogroup', {name: 'Apply mappings to'});
		const source = within(dialog).getByLabelText('Draft source: Default Upgrade');
		const sourceButton = within(dialog).getByRole('button', {name: 'Load planner to replace draft'});
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
			nativeScopeSelect: within(dialog).queryByRole('combobox', {name: 'Apply to'}),
			pairWidth: firstPair.getBoundingClientRect().width,
			plannerContext: context.textContent,
			recordTools: within(recordTools)
				.getAllByRole('button')
				.map((button) => ({label: button.getAttribute('aria-label'), style: button.dataset.factorioStyle})),
			source: {
				buttonText: sourceButton.textContent,
				describedBy: sourceButton.getAttribute('aria-describedby'),
				expanded: sourceButton.getAttribute('aria-expanded'),
				label: source.querySelector('strong')?.textContent,
				websiteAction: sourceButton.dataset.websiteAction,
			},
			scopeExtension: scope.dataset.websiteExtension,
			scopeOptions: within(scope)
				.getAllByRole<HTMLInputElement>('radio')
				.map((radio) => ({
					checked: radio.checked,
					disabled: radio.disabled,
					label: radio.parentElement?.textContent,
					value: radio.value,
				})),
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
			nativeScopeSelect: null,
			pairWidth: 80,
			plannerContext: "Selected blueprint›Alice's blueprint",
			recordTools: [
				{label: 'Copy planner string', style: 'button'},
				{label: 'Export planner string', style: 'button'},
				{label: 'Discard local planner', style: 'red_button'},
			],
			source: {
				buttonText: 'Load planner…',
				describedBy: source.id,
				expanded: 'false',
				label: 'Default Upgrade',
				websiteAction: 'replace-planner-draft',
			},
			scopeExtension: 'planner-application-scope',
			scopeOptions: [
				{
					checked: true,
					disabled: false,
					label: 'Current selectionSelected blueprint',
					value: 'selection',
				},
			],
			slotCount: 16,
		});
	},
};

export const MetadataEditor: Story = {
	play: async () => {
		const planner = within(document.body).getByRole('dialog', {name: 'Upgrade Planner'});
		await userEvent.click(within(planner).getByRole('button', {name: 'Edit planner name'}));
		const editor = within(document.body).getByRole('dialog', {name: 'Edit upgrade planner'});
		await expect(planner).toHaveAttribute('inert');
		await expect(within(editor).getByRole('textbox', {name: 'Name'})).toHaveValue('Starter belt upgrades');
		await expect(within(editor).getByRole('textbox', {name: 'Planner description'})).toHaveValue(
			'Upgrade the starter belt line.',
		);
		await expect(within(editor).getByRole('img', {name: 'Upgrade planner icon preview'})).toHaveAttribute(
			'data-preview-icon-count',
			'1',
		);
		await expect(within(editor).getAllByRole('button', {name: /preview icon/})).toHaveLength(4);
		await expect(within(editor).getByRole('button', {name: 'Confirm planner metadata'})).toHaveAttribute(
			'data-factorio-style',
			'green_button',
		);
	},
};

export const MetadataDescriptionEditing: Story = {
	play: async () => {
		await userEvent.click(within(document.body).getByRole('button', {name: 'Edit planner name'}));
		const description = within(document.body).getByRole('textbox', {name: 'Planner description'});
		await userEvent.click(description);
		await userEvent.type(description, ' Updated.');
		await expect(description).toHaveFocus();
	},
};

export const MetadataIconPicker: Story = {
	play: async () => {
		await userEvent.click(within(document.body).getByRole('button', {name: 'Edit planner name'}));
		await userEvent.click(within(document.body).getByRole('button', {name: 'Choose preview icon 2'}));
		await expect(document.querySelector('.upgrade-planner-metadata')).toHaveAttribute('inert');
		await expect(within(document.body).getByRole('dialog', {name: 'Choose planner preview icon 2'})).toBeVisible();
	},
};

export const SavedDeleteConfirmation: Story = {
	args: {
		recordTools: {...meta.args.recordTools, deleteKind: 'saved'},
		savedRecordName: 'Starter belt upgrades',
	},
	play: async () => {
		await userEvent.click(
			within(document.body).getByRole('button', {name: 'Delete planner from Blueprint Library'}),
		);
		const confirmation = within(document.body).getByRole('alertdialog', {name: 'Delete saved planner?'});
		await expect(within(confirmation).getByRole('button', {name: 'Delete from Library'})).toHaveAttribute(
			'data-factorio-style',
			'red_button',
		);
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
		const scope = within(dialog).getByRole('radiogroup', {name: 'Apply mappings to'});
		await expect({
			applicationStatus: within(dialog).getByLabelText('153 matches').textContent,
			context: within(dialog).getByRole('navigation', {name: 'Upgrade planner blueprint context'}).textContent,
			contextExtension: dialog
				.querySelector('.upgrade-planner-dialog__context-strip')
				?.getAttribute('data-website-extension'),
			libraryState: within(dialog).getByLabelText('Planner library status').textContent,
			scopeOptions: within(scope)
				.getAllByRole<HTMLInputElement>('radio')
				.map((radio) => ({
					checked: radio.checked,
					disabled: radio.disabled,
					label: radio.parentElement?.textContent,
					value: radio.value,
				})),
		}).toStrictEqual({
			applicationStatus: '153 matches',
			context: "Entire root book›Alice's belt book › Smelting",
			contextExtension: 'planner-context',
			libraryState: 'Blueprint Library › Starter belt upgrades',
			scopeOptions: [
				{
					checked: false,
					disabled: false,
					label: 'Current selectionSelected blueprint',
					value: 'selection',
				},
				{
					checked: true,
					disabled: false,
					label: 'Entire bookEvery blueprint in the loaded root book',
					value: 'root',
				},
			],
		});
	},
};

export const ApplicationScopeKeyboard: Story = {
	args: {
		canChooseRootScope: true,
	},
	render: (args) => <InteractiveScopePlanner {...args} />,
	play: async ({args}) => {
		const scope = within(document.body).getByRole('radiogroup', {name: 'Apply mappings to'});
		const currentSelection = within(scope).getByRole<HTMLInputElement>('radio', {
			name: 'Current selection Selected blueprint',
		});
		const entireBook = within(scope).getByRole<HTMLInputElement>('radio', {
			name: 'Entire book Every blueprint in the loaded root book',
		});
		currentSelection.focus();
		await userEvent.keyboard('{ArrowRight}');
		await expect({
			calls: args.onScopeChange.mock.calls,
			currentSelection: {checked: currentSelection.checked, focused: document.activeElement === currentSelection},
			entireBook: {checked: entireBook.checked, focused: document.activeElement === entireBook},
		}).toStrictEqual({
			calls: [['root']],
			currentSelection: {checked: false, focused: false},
			entireBook: {checked: true, focused: true},
		});
	},
};

export const ForcedEntireBookScope: Story = {
	args: {
		scope: 'root',
		selectionScopeDisabled: true,
	},
	play: async () => {
		const scope = within(document.body).getByRole('radiogroup', {name: 'Apply mappings to'});
		await expect(
			within(scope)
				.getAllByRole<HTMLInputElement>('radio')
				.map((radio) => ({
					checked: radio.checked,
					disabled: radio.disabled,
					value: radio.value,
				})),
		).toStrictEqual([
			{checked: false, disabled: true, value: 'selection'},
			{checked: true, disabled: false, value: 'root'},
		]);
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
