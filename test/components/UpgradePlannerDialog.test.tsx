import type {ComponentProps} from 'react';
import {render, screen, within} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {describe, expect, test, vi} from 'vite-plus/test';

import {UpgradePlannerDialog} from '../../src/components/blueprint/panels/transform/UpgradePlannerDialog';
import type {BlueprintString} from '../../src/parsing/types';

const rootBlueprint: BlueprintString = {
	blueprint: {
		item: 'blueprint',
		version: 0,
		entities: [{entity_number: 100, name: 'assembling-machine-2', position: {x: 0, y: 0}}],
	},
};

const modulePlan = [
	{type: 'item' as const, name: 'speed-module-3'},
	{},
	{type: 'item' as const, name: 'productivity-module-3'},
	{},
];

function renderDialog(overrides: Partial<ComponentProps<typeof UpgradePlannerDialog>> = {}) {
	const onTargetChange = vi.fn<ComponentProps<typeof UpgradePlannerDialog>['mappings']['onTargetChange']>();
	const properties: ComponentProps<typeof UpgradePlannerDialog> = {
		breadcrumb: "Alice's blueprint",
		canChooseRootScope: false,
		mappings: {
			error: undefined,
			mappings: [
				{
					count: 1,
					from: {type: 'entity', name: 'assembling-machine-2'},
					mappingId: 'mapping-assembler',
					slotIndex: 0,
					to: {type: 'entity', name: 'assembling-machine-3', module_slots: modulePlan},
				},
			],
			onClearEndpoint: vi.fn<() => void>(),
			onMove: vi.fn<() => void>(),
			onPlannerLoad: vi.fn<() => void>(),
			onPlannerInputChange: vi.fn<() => void>(),
			onSourceChange: vi.fn<() => void>(),
			onTargetChange,
			plannerInput: '',
			plannerInputError: undefined,
			rootBlueprint,
			source: 'suggested',
			sourceLabel: 'Default Upgrade',
			sourceOptions: [
				{type: 'entity', name: 'assembling-machine-2'},
				{type: 'entity', name: 'assembling-machine-3'},
			],
		},
		matchCount: 1,
		onApply: vi.fn<() => void>(),
		onClose: vi.fn<() => void>(),
		onScopeChange: vi.fn<() => void>(),
		replacements: {
			iconMappingCount: 0,
			iconReplacementCount: 0,
			metadataFind: '',
			metadataReplace: '',
			metadataReplacementCount: 0,
			onIconReplacementsOpen: vi.fn<() => void>(),
			onMetadataFindChange: vi.fn<() => void>(),
			onMetadataReplaceChange: vi.fn<() => void>(),
			onTextReplacementEnabledChange: vi.fn<() => void>(),
			textReplacementEnabled: false,
		},
		recordMetadata: {
			description: '',
			icons: [{type: 'entity', name: 'assembling-machine-3'}],
			label: 'Assembler upgrades',
			onDescriptionChange: vi.fn<() => void>(),
			onIconsChange: vi.fn<() => void>(),
			onLabelChange: vi.fn<() => void>(),
		},
		recordTools: {
			deleteKind: 'local',
			onCopy: vi.fn<() => Promise<boolean>>(async () => Promise.resolve(true)),
			onDelete: vi.fn<() => Promise<void>>(async () => Promise.resolve()),
			onExport: vi.fn<() => void>(),
		},
		saveDisabled: false,
		savePrompt: {
			label: 'Assembler upgrades',
			onCancel: vi.fn<() => void>(),
			onOpen: vi.fn<() => void>(),
			onSaveAsNew: vi.fn<() => void>(),
			open: false,
			pending: false,
		},
		scope: 'selection',
		selectionScopeDisabled: false,
		selectionScopeLabel: 'Selected blueprint',
		...overrides,
	};
	render(<UpgradePlannerDialog {...properties} />);
	return {onTargetChange};
}

async function openTargetPicker() {
	const user = userEvent.setup();
	const row = document.querySelector<HTMLElement>('[data-mapping-key="mapping-assembler"]');
	if (row === null) {
		throw new Error('Expected the assembler mapping row.');
	}
	await user.click(within(row).getByRole('button', {name: 'Choose target for Assembling machine 2'}));
	return {picker: screen.getByRole('dialog', {name: 'Select upgrade'}), user};
}

describe('UpgradePlannerDialog module-slot plans', () => {
	test('seeds the Entity settings editor from the existing target module plan', async () => {
		renderDialog();

		const {picker} = await openTargetPicker();
		const extras = within(picker).getByRole('region', {name: 'Entity settings'});

		expect({
			enabled: within(extras).getByRole<HTMLInputElement>('checkbox', {name: 'Module slots'}).checked,
			slots: within(extras)
				.queryAllByRole('button')
				.map((slot) => slot.getAttribute('aria-label')),
		}).toStrictEqual({
			enabled: true,
			slots: [
				'Edit module slot 1, currently Speed module 3',
				'Choose module for slot 2',
				'Edit module slot 3, currently Productivity module 3',
				'Choose module for slot 4',
			],
		});
	});

	test('preserves the module plan when only the target quality changes', async () => {
		const {onTargetChange} = renderDialog();

		const {picker, user} = await openTargetPicker();
		await user.click(within(picker).getByRole('button', {name: 'Rare quality'}));
		await user.click(within(picker).getByRole('button', {name: 'Confirm'}));

		expect(onTargetChange.mock.calls).toStrictEqual([
			[
				'mapping-assembler',
				0,
				{
					type: 'entity',
					name: 'assembling-machine-3',
					quality: 'rare',
					module_limit: undefined,
					module_slots: modulePlan,
				},
			],
		]);
	});
});
