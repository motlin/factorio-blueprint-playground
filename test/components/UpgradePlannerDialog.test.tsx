import type {ComponentProps} from 'react';
import {render, screen, within} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {describe, expect, test, vi} from 'vite-plus/test';

import {UpgradePlannerDialog} from '../../src/components/blueprint/panels/transform/UpgradePlannerDialog';
import type {BlueprintString, UpgradeTargetSignal} from '../../src/parsing/types';

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

function renderDialog(
	target: UpgradeTargetSignal = {type: 'entity', name: 'assembling-machine-3', module_slots: modulePlan},
) {
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
					to: target,
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

	test('does not leak one mapping’s pending module plan into another mapping’s target picker', async () => {
		renderDialog();

		const {picker, user} = await openTargetPicker();
		const slotsCheckbox = within(picker).getByRole('checkbox', {name: 'Module slots'});
		await user.click(slotsCheckbox);
		await user.click(slotsCheckbox);
		await user.click(within(picker).getByRole('button', {name: 'Close Select upgrade'}));
		await user.click(screen.getAllByRole('button', {name: 'Choose target for new mapping'})[0]);
		const emptyPicker = screen.getByRole('dialog', {name: 'Select upgrade'});
		await user.click(within(emptyPicker).getByRole('button', {name: 'Choose Assembling machine 3'}));
		const extras = within(emptyPicker).getByRole('region', {name: 'Entity settings'});

		expect({
			enabled: within(extras).getByRole<HTMLInputElement>('checkbox', {name: 'Module slots'}).checked,
			slots: within(extras)
				.queryAllByRole('button')
				.map((slot) => slot.getAttribute('aria-label')),
		}).toStrictEqual({
			enabled: false,
			slots: [],
		});
	});

	test('grows the slot editor to the capacity of a roomier destination', async () => {
		renderDialog({
			type: 'entity',
			name: 'assembling-machine-2',
			module_slots: [{type: 'item', name: 'speed-module-3'}, {}],
		});

		const {picker, user} = await openTargetPicker();
		await user.click(within(picker).getByRole('button', {name: 'Choose Assembling machine 3'}));
		const extras = within(picker).getByRole('region', {name: 'Entity settings'});

		expect(
			within(extras)
				.queryAllByRole('button')
				.map((slot) => slot.getAttribute('aria-label')),
		).toStrictEqual([
			'Edit module slot 1, currently Speed module 3',
			'Choose module for slot 2',
			'Choose module for slot 3',
			'Choose module for slot 4',
		]);
	});

	test('keeps a module chosen for a slot the previous destination did not have', async () => {
		const {onTargetChange} = renderDialog({
			type: 'entity',
			name: 'assembling-machine-2',
			module_slots: [{type: 'item', name: 'speed-module-3'}, {}],
		});

		const {picker, user} = await openTargetPicker();
		await user.click(within(picker).getByRole('button', {name: 'Choose Assembling machine 3'}));
		await user.click(within(picker).getByRole('button', {name: 'Choose module for slot 4'}));
		const modulePicker = screen.getByRole('dialog', {name: 'Choose module'});
		await user.click(within(modulePicker).getByRole('button', {name: 'Choose Efficiency module 3'}));
		await user.click(within(picker).getByRole('button', {name: 'Confirm'}));

		expect(onTargetChange.mock.calls).toStrictEqual([
			[
				'mapping-assembler',
				0,
				{
					type: 'entity',
					name: 'assembling-machine-3',
					quality: 'normal',
					module_limit: undefined,
					module_slots: [
						{type: 'item', name: 'speed-module-3'},
						{},
						{},
						{type: 'item', name: 'efficiency-module-3'},
					],
				},
			],
		]);
	});
});
