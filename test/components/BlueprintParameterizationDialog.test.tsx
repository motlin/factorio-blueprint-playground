import {StrictMode, useState} from 'react';
import {fireEvent, render, screen, waitFor, within} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {expect, test, vi} from 'vite-plus/test';

import {BlueprintParameterizationDialog} from '../../src/components/blueprint/panels/transform/BlueprintParameterizationDialog';
import type {Parameter} from '../../src/parsing/types';

const parameters: Parameter[] = [
	{
		type: 'id',
		name: 'Plate',
		id: 'iron-plate',
		'quality-condition': {quality: 'normal', comparator: '='},
	},
	{
		type: 'id',
		name: 'Gear',
		id: 'iron-gear-wheel',
		'ingredient-of': 'iron-plate',
	},
	{
		type: 'number',
		name: 'Crafting count',
		number: '24',
		variable: 'N',
		dependent: true,
		formula: 'N * 2',
		'not-parametrised': true,
	},
];

function ParameterizationHarness() {
	const [open, setOpen] = useState(false);

	return (
		<>
			<section role="dialog" aria-label="Blueprint editor">
				<button
					type="button"
					onClick={() => {
						setOpen(true);
					}}
				>
					Edit parameters
				</button>
			</section>
			{open ? (
				<BlueprintParameterizationDialog
					dialogId="blueprint-parameterization"
					onClose={() => {
						setOpen(false);
					}}
					onConfirm={vi.fn<(nextParameters: Parameter[]) => void>()}
					parameters={parameters}
					signalOptions={[
						{type: 'item', name: 'iron-plate'},
						{type: 'item', name: 'iron-gear-wheel'},
					]}
				/>
			) : null}
		</>
	);
}

test('shows editable ID rows and confirms unsupported number parameters unchanged', async () => {
	const user = userEvent.setup();
	const onConfirm = vi.fn<(nextParameters: Parameter[]) => void>();
	render(
		<BlueprintParameterizationDialog
			dialogId="blueprint-parameterization"
			onClose={vi.fn<() => void>()}
			onConfirm={onConfirm}
			parameters={parameters}
			signalOptions={[
				{type: 'item', name: 'iron-plate'},
				{type: 'item', name: 'iron-gear-wheel'},
			]}
		/>,
	);

	const dialog = screen.getByRole('dialog', {name: 'Blueprint parametrisation'});
	const parameterRegion = within(dialog).getByRole('region', {name: 'Blueprint parameters'});
	const orderDescription = within(dialog).getByText('Parameters are evaluated top to bottom.');
	expect({
		add: {
			style: within(dialog).getByRole('button', {name: 'Add parameter'}).dataset.factorioStyle,
			text: within(dialog).getByRole('button', {name: 'Add parameter'}).textContent,
		},
		anchorPlacement: dialog.parentElement?.dataset.anchorPlacement,
		confirm: {
			style: within(dialog).getByRole('button', {name: 'Confirm'}).dataset.factorioStyle,
			text: within(dialog).getByRole('button', {name: 'Confirm'}).textContent,
			title: within(dialog).getByRole('button', {name: 'Confirm'}).title,
		},
		dependencyMode: {
			expanded: within(dialog)
				.getByRole('button', {name: 'Parameter 2 dependency mode: Ingredient of'})
				.getAttribute('aria-expanded'),
			style: within(dialog).getByRole('button', {name: 'Parameter 2 dependency mode: Ingredient of'}).dataset
				.factorioStyle,
			text: within(dialog).getByRole('button', {name: 'Parameter 2 dependency mode: Ingredient of'}).textContent,
		},
		dependencySource: within(dialog)
			.getByRole('button', {name: 'Parameter 2 dependency source: Plate'})
			.getAttribute('aria-invalid'),
		description: dialog.getAttribute('aria-describedby'),
		info: within(dialog).getByRole('button', {
			name: 'Dependencies can only target parameters above them.',
		}).title,
		names: within(dialog)
			.getAllByRole<HTMLInputElement>('textbox')
			.map((input) => input.value),
		orderDescription: orderDescription.id,
		regionClass: parameterRegion.className,
		regionStyle: parameterRegion.dataset.factorioStyle,
		preserved: within(dialog).getByText('1 unsupported parameter is preserved unchanged.').textContent,
		removeStyles: within(dialog)
			.getAllByRole('button', {name: /^Remove parameter /})
			.map((button) => button.dataset.factorioStyle),
		reorderHandles: within(dialog)
			.getAllByRole('button', {name: /^Reorder /})
			.map((button) => ({
				keyshortcuts: button.getAttribute('aria-keyshortcuts'),
				label: button.getAttribute('aria-label'),
				title: button.title,
			})),
		rows: dialog.querySelectorAll('.blueprint-parameterization__row').length,
	}).toStrictEqual({
		add: {style: 'button', text: '+Add parameter'},
		anchorPlacement: 'centered',
		confirm: {style: 'green_button', text: '✓Confirm', title: 'Confirm Blueprint parametrisation'},
		dependencyMode: {
			expanded: 'false',
			style: 'train_schedule_circuit_condition_comparator_dropdown',
			text: 'Ingredient of',
		},
		dependencySource: null,
		description: orderDescription.id,
		info: 'Dependencies can only target parameters above them.',
		names: ['Plate', 'Gear'],
		orderDescription: orderDescription.id,
		regionClass: 'factorio-frame factorio-frame--deep factorio-scroll-frame blueprint-parameterization__body',
		regionStyle: 'deep_slots_scroll_pane',
		preserved: '1 unsupported parameter is preserved unchanged.',
		removeStyles: ['tool_button_red', 'tool_button_red'],
		reorderHandles: [
			{
				keyshortcuts: 'ArrowUp ArrowDown',
				label: 'Reorder Plate. Use Up Arrow or Down Arrow to change its evaluation order.',
				title: 'Drag to reorder. Use Up Arrow or Down Arrow for keyboard reordering.',
			},
			{
				keyshortcuts: 'ArrowUp ArrowDown',
				label: 'Reorder Gear. Use Up Arrow or Down Arrow to change its evaluation order.',
				title: 'Drag to reorder. Use Up Arrow or Down Arrow for keyboard reordering.',
			},
		],
		rows: 2,
	});

	await user.click(within(dialog).getByRole('button', {name: 'Confirm'}));

	expect(onConfirm.mock.calls).toStrictEqual([[parameters]]);
});

test('reorders complete parameter rows by drag handle or keyboard in evaluation order', async () => {
	const user = userEvent.setup();
	const onConfirm = vi.fn<(nextParameters: Parameter[]) => void>();
	const independentParameters: Parameter[] = [
		parameters[0],
		parameters[2],
		{
			type: 'id',
			name: 'Gear',
			id: 'iron-gear-wheel',
		},
	];
	render(
		<BlueprintParameterizationDialog
			dialogId="blueprint-parameterization"
			onClose={vi.fn<() => void>()}
			onConfirm={onConfirm}
			parameters={independentParameters}
			signalOptions={[
				{type: 'item', name: 'iron-plate'},
				{type: 'item', name: 'iron-gear-wheel'},
			]}
		/>,
	);

	const dialog = screen.getByRole('dialog', {name: 'Blueprint parametrisation'});
	const plateHandle = within(dialog).getByRole('button', {name: /^Reorder Plate\./});
	expect({
		draggable: plateHandle.draggable,
		rowStyle: plateHandle.closest('.blueprint-parameterization__row')?.getAttribute('data-factorio-style'),
	}).toStrictEqual({
		draggable: true,
		rowStyle: 'blueprint_parameter_frame',
	});

	plateHandle.focus();
	await user.keyboard('{ArrowDown}');
	await waitFor(() => {
		expect(
			within(dialog)
				.getAllByRole<HTMLInputElement>('textbox')
				.map((input) => input.value),
		).toStrictEqual(['Gear', 'Plate']);
		expect(document.activeElement?.getAttribute('aria-label')).toBe(
			'Reorder Plate. Use Up Arrow or Down Arrow to change its evaluation order.',
		);
	});

	const data = new Map<string, string>();
	const dataTransfer = {
		dropEffect: 'none',
		effectAllowed: 'none',
		getData: (format: string) => data.get(format) ?? '',
		setData: (format: string, value: string) => {
			data.set(format, value);
		},
	};
	const movedPlateHandle = within(dialog).getByRole('button', {name: /^Reorder Plate\./});
	const gearRow = within(dialog)
		.getByRole('button', {name: /^Reorder Gear\./})
		.closest<HTMLElement>('.blueprint-parameterization__row');
	if (gearRow === null) {
		throw new Error('Expected Gear parameter row');
	}
	fireEvent.dragStart(movedPlateHandle, {dataTransfer});
	fireEvent.dragOver(gearRow, {dataTransfer});
	expect({
		dragging: movedPlateHandle.closest<HTMLElement>('.blueprint-parameterization__row')?.dataset.dragState,
		dropEffect: dataTransfer.dropEffect,
		target: gearRow.dataset.dragState,
	}).toStrictEqual({
		dragging: 'dragging',
		dropEffect: 'move',
		target: 'target',
	});
	fireEvent.drop(gearRow, {dataTransfer});

	await user.click(within(dialog).getByRole('button', {name: 'Confirm'}));
	expect(onConfirm.mock.calls).toStrictEqual([[independentParameters]]);
});

test('edits signal, quality, dependencies, and row membership before confirming', async () => {
	const user = userEvent.setup();
	const onConfirm = vi.fn<(nextParameters: Parameter[]) => void>();
	render(
		<BlueprintParameterizationDialog
			dialogId="blueprint-parameterization"
			onClose={vi.fn<() => void>()}
			onConfirm={onConfirm}
			parameters={parameters}
			signalOptions={[
				{type: 'item', name: 'iron-plate'},
				{type: 'item', name: 'iron-gear-wheel'},
				{type: 'item', name: 'copper-cable'},
			]}
		/>,
	);

	await user.clear(screen.getByRole('textbox', {name: 'Parameter 1 name'}));
	await user.type(screen.getByRole('textbox', {name: 'Parameter 1 name'}), 'Cable');
	await user.click(screen.getByRole('button', {name: 'Edit value for parameter 1 Cable'}));
	const picker = screen.getByRole('dialog', {name: 'Choose value for Cable'});
	await user.click(within(picker).getByRole('button', {name: 'Choose Copper cable'}));
	await user.click(within(picker).getByRole('button', {name: 'Rare quality'}));
	await user.click(within(picker).getByRole('button', {name: 'Quality comparison: ='}));
	await user.click(screen.getByRole('menuitemradio', {name: '≥'}));
	await user.click(within(picker).getByRole('button', {name: 'Confirm'}));

	await user.click(screen.getByRole('button', {name: 'Parameter 2 dependency mode: Ingredient of'}));
	await user.click(screen.getByRole('option', {name: 'Product of'}));
	await user.click(screen.getByRole('button', {name: 'Parameter 2 dependency source: iron-plate unavailable'}));
	await user.click(screen.getByRole('option', {name: /Cable$/}));
	await user.click(screen.getByRole('button', {name: 'Add parameter'}));
	await user.click(screen.getByRole('button', {name: 'Remove parameter 3 Parameter 1'}));
	await user.click(screen.getByRole('button', {name: 'Confirm'}));

	expect(onConfirm.mock.calls).toStrictEqual([
		[
			[
				{
					type: 'id',
					name: 'Cable',
					id: 'copper-cable',
					'quality-condition': {quality: 'rare', comparator: '≥'},
				},
				{
					type: 'id',
					name: 'Gear',
					id: 'iron-gear-wheel',
					'product-of': 'copper-cable',
				},
				parameters[2],
			],
		],
	]);
});

test('uses game dependency controls with explicit source validation and disabled parameter state', async () => {
	const user = userEvent.setup();
	const onConfirm = vi.fn<(nextParameters: Parameter[]) => void>();
	render(
		<BlueprintParameterizationDialog
			dialogId="blueprint-parameterization"
			onClose={vi.fn<() => void>()}
			onConfirm={onConfirm}
			parameters={[
				{type: 'id', id: 'iron-plate', name: 'Plate'},
				{type: 'id', id: 'iron-gear-wheel', name: 'Gear'},
			]}
			signalOptions={[
				{type: 'item', name: 'iron-plate'},
				{type: 'item', name: 'iron-gear-wheel'},
			]}
		/>,
	);

	const dialog = screen.getByRole('dialog', {name: 'Blueprint parametrisation'});
	const enabled = within(dialog).getByRole<HTMLInputElement>('checkbox', {name: 'Parameter 2 enabled'});
	const confirm = within(dialog).getByRole('button', {name: 'Confirm'});
	const initialMode = within(dialog).getByRole('button', {
		name: 'Parameter 2 dependency mode: Independent',
	});
	expect({
		checked: enabled.checked,
		modeDisabled: initialMode.hasAttribute('disabled'),
		modeStyle: initialMode.dataset.factorioStyle,
		source: within(dialog).queryByRole('button', {name: /^Parameter 2 dependency source:/}),
	}).toStrictEqual({
		checked: true,
		modeDisabled: false,
		modeStyle: 'train_schedule_circuit_condition_comparator_dropdown',
		source: null,
	});

	await user.click(initialMode);
	const modeList = within(dialog).getByRole('listbox', {name: 'Dependency mode for parameter 2'});
	expect(
		within(modeList)
			.getAllByRole('option')
			.map((option) => option.textContent),
	).toStrictEqual([
		'Independent',
		'Ingredient of',
		'Item ingredient of',
		'Fluid ingredient of',
		'Product of',
		'Item product of',
		'Fluid product of',
	]);
	await user.click(within(modeList).getByRole('option', {name: 'Product of'}));

	const emptySource = within(dialog).getByRole('button', {
		name: 'Parameter 2 dependency source: None',
	});
	expect({
		confirmDisabled: confirm.hasAttribute('disabled'),
		confirmError: document.getElementById(confirm.getAttribute('aria-describedby') ?? '')?.textContent,
		confirmTitle: confirm.title,
		dependencyNumber: dialog.querySelector('.blueprint-parameterization__dependency-number')?.textContent,
		error: within(dialog).getByRole('alert').textContent,
		invalid: emptySource.getAttribute('aria-invalid'),
	}).toStrictEqual({
		confirmDisabled: true,
		confirmError: "Source of dependency isn't above.",
		confirmTitle: "Source of dependency isn't above.",
		dependencyNumber: '#',
		error: "Source of dependency isn't above.",
		invalid: 'true',
	});

	await user.click(emptySource);
	const sourceList = within(dialog).getByRole('listbox', {name: 'Dependency source for parameter 2'});
	await user.click(within(sourceList).getByRole('option', {name: 'Plate'}));
	const selectedSource = within(dialog).getByRole('button', {
		name: 'Parameter 2 dependency source: Plate',
	});
	expect({
		confirmDisabled: confirm.hasAttribute('disabled'),
		confirmError: confirm.getAttribute('aria-describedby'),
		confirmTitle: confirm.title,
		dependencyNumber: within(dialog).getByTitle('Dependency #1').textContent,
		invalid: selectedSource.getAttribute('aria-invalid'),
	}).toStrictEqual({
		confirmDisabled: false,
		confirmError: null,
		confirmTitle: 'Confirm Blueprint parametrisation',
		dependencyNumber: '#1',
		invalid: null,
	});

	selectedSource.focus();
	await user.keyboard('{Delete}');
	expect(within(dialog).getByRole('button', {name: 'Confirm'}).hasAttribute('disabled')).toBe(true);

	await user.click(enabled);
	const disabledMode = within(dialog).getByRole('button', {
		name: 'Parameter 2 dependency mode: Independent',
	});
	expect({
		checked: enabled.checked,
		modeDisabled: disabledMode.hasAttribute('disabled'),
		source: within(dialog).queryByRole('button', {name: /^Parameter 2 dependency source:/}),
	}).toStrictEqual({checked: false, modeDisabled: true, source: null});

	await user.click(enabled);
	await user.click(within(dialog).getByRole('button', {name: 'Confirm'}));
	expect(onConfirm.mock.calls).toStrictEqual([
		[
			[
				{type: 'id', id: 'iron-plate', name: 'Plate'},
				{type: 'id', id: 'iron-gear-wheel', name: 'Gear'},
			],
		],
	]);
});

test('keeps nested picker focus in the top layer and returns it through the dialog stack', async () => {
	const user = userEvent.setup();
	render(
		<StrictMode>
			<ParameterizationHarness />
		</StrictMode>,
	);

	const editor = screen.getByRole('dialog', {name: 'Blueprint editor'});
	const parameterInvoker = screen.getByRole('button', {name: 'Edit parameters'});
	await user.click(parameterInvoker);

	const parameterDialog = screen.getByRole('dialog', {name: 'Blueprint parametrisation'});
	const firstName = within(parameterDialog).getByRole('textbox', {name: 'Parameter 1 name'});
	const valueInvoker = within(parameterDialog).getByRole('button', {name: 'Edit value for parameter 1 Plate'});
	expect({
		activeElement: document.activeElement,
		anchorPlacement: parameterDialog.parentElement?.dataset.anchorPlacement,
		anchoredPosition: {
			left: parameterDialog.style.left,
			top: parameterDialog.style.top,
		},
		editorAriaHidden: editor.getAttribute('aria-hidden'),
		editorInert: editor.inert,
		parameterInert: parameterDialog.inert,
	}).toStrictEqual({
		activeElement: firstName,
		anchorPlacement: 'anchored',
		anchoredPosition: {
			left: '24px',
			top: '24px',
		},
		editorAriaHidden: 'true',
		editorInert: true,
		parameterInert: false,
	});

	await user.click(valueInvoker);
	const picker = screen.getByRole('dialog', {name: 'Choose value for Plate'});
	const search = within(picker).getByRole('button', {name: 'Search'});
	const confirm = within(picker).getByRole('button', {name: 'Confirm'});
	expect({
		activeElement: document.activeElement,
		editorInert: editor.inert,
		parameterAriaHidden: parameterDialog.getAttribute('aria-hidden'),
		parameterInert: parameterDialog.inert,
		pickerInert: picker.inert,
	}).toStrictEqual({
		activeElement: search,
		editorInert: true,
		parameterAriaHidden: 'true',
		parameterInert: true,
		pickerInert: false,
	});

	confirm.focus();
	await user.tab();
	expect(document.activeElement).toBe(search);

	fireEvent.keyDown(search, {key: 'Escape'});
	await waitFor(() => {
		expect(screen.queryByRole('dialog', {name: 'Choose value for Plate'})).toBeNull();
		expect(document.activeElement).toBe(valueInvoker);
	});
	expect({
		editorInert: editor.inert,
		parameterAriaHidden: parameterDialog.getAttribute('aria-hidden'),
		parameterInert: parameterDialog.inert,
	}).toStrictEqual({
		editorInert: true,
		parameterAriaHidden: null,
		parameterInert: false,
	});

	fireEvent.keyDown(valueInvoker, {key: 'Escape'});
	await waitFor(() => {
		expect(screen.queryByRole('dialog', {name: 'Blueprint parametrisation'})).toBeNull();
		expect(document.activeElement).toBe(parameterInvoker);
	});
	expect({
		editorAriaHidden: editor.getAttribute('aria-hidden'),
		editorInert: editor.inert,
	}).toStrictEqual({
		editorAriaHidden: null,
		editorInert: false,
	});
});

test('presents source-order name and value controls with keyboard edit, clear, and confirm semantics', async () => {
	const user = userEvent.setup();
	const onConfirm = vi.fn<(nextParameters: Parameter[]) => void>();
	render(
		<BlueprintParameterizationDialog
			dialogId="blueprint-parameterization"
			onClose={vi.fn<() => void>()}
			onConfirm={onConfirm}
			parameters={[{type: 'id', id: 'parameter-0', name: 'Input'}]}
			signalOptions={[{type: 'item', name: 'iron-plate'}]}
		/>,
	);

	const dialog = screen.getByRole('dialog', {name: 'Blueprint parametrisation'});
	const row = dialog.querySelector<HTMLElement>('.blueprint-parameterization__primary');
	const name = within(dialog).getByRole<HTMLInputElement>('textbox', {name: 'Parameter 1 name'});
	const value = within(dialog).getByRole('button', {name: 'Edit value for parameter 1 Input'});
	const parameterArtwork = within(value).getByTestId('icon');
	expect({
		controlOrder: [...(row?.children ?? [])].map((child) => child.textContent),
		parameterArtwork: {
			nodeName: parameterArtwork.nodeName,
			source: parameterArtwork.getAttribute('src'),
			text: parameterArtwork.textContent,
		},
		shortcuts: value.getAttribute('aria-keyshortcuts'),
		size: value.style.width,
	}).toStrictEqual({
		controlOrder: ['Name: for parameter 1', '', 'Value:', '0', ''],
		parameterArtwork: {nodeName: 'SPAN', source: null, text: '0'},
		shortcuts: 'Enter Space Delete Backspace',
		size: 'calc(28px * var(--factorio-ui-density, 1))',
	});

	value.focus();
	await user.keyboard('{Delete}');
	const emptyValue = within(dialog).getByRole('button', {name: 'Choose value for parameter 1 Input'});
	expect({
		activeElement: document.activeElement,
		shortcuts: emptyValue.getAttribute('aria-keyshortcuts'),
		text: emptyValue.textContent,
	}).toStrictEqual({
		activeElement: emptyValue,
		shortcuts: 'Enter Space',
		text: '+',
	});

	await user.keyboard('{Enter}');
	expect(screen.getByRole('dialog', {name: 'Choose value for Input'}).getAttribute('aria-modal')).toBe('true');
	await user.keyboard('{Escape}');
	await waitFor(() => {
		expect(document.activeElement).toBe(emptyValue);
	});

	name.focus();
	await user.keyboard('{Enter}');
	expect(onConfirm.mock.calls).toStrictEqual([[[{type: 'id', name: 'Input'}]]]);
});
