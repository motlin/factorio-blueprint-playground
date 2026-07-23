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
	expect({
		add: within(dialog).getByRole('button', {name: '+ Add parameter'}).textContent,
		dependencyMode: within(dialog).getByRole<HTMLSelectElement>('combobox', {
			name: 'Parameter 2 dependency mode',
		}).value,
		names: within(dialog)
			.getAllByRole<HTMLInputElement>('textbox')
			.map((input) => input.value),
		preserved: within(dialog).getByText('1 unsupported parameter is preserved unchanged.').textContent,
		rows: dialog.querySelectorAll('.blueprint-parameterization__row').length,
	}).toStrictEqual({
		add: '+ Add parameter',
		dependencyMode: 'ingredient-of',
		names: ['Plate', 'Gear'],
		preserved: '1 unsupported parameter is preserved unchanged.',
		rows: 2,
	});

	await user.click(within(dialog).getByRole('button', {name: 'Confirm'}));

	expect(onConfirm.mock.calls).toStrictEqual([[parameters]]);
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
	await user.click(screen.getByRole('button', {name: 'Choose value for parameter 1 Cable'}));
	const picker = screen.getByRole('dialog', {name: 'Choose value for Cable'});
	await user.click(within(picker).getByRole('button', {name: 'Choose Copper cable'}));
	await user.click(within(picker).getByRole('button', {name: 'Rare quality'}));
	await user.selectOptions(within(picker).getByRole('combobox', {name: 'Quality comparison'}), '≥');
	await user.click(within(picker).getByRole('button', {name: 'Confirm'}));

	await user.selectOptions(screen.getByRole('combobox', {name: 'Parameter 2 dependency mode'}), 'product-of');
	await user.selectOptions(screen.getByRole('combobox', {name: 'Parameter 2 dependency source'}), 'copper-cable');
	await user.click(screen.getByRole('button', {name: '+ Add parameter'}));
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
	const valueInvoker = within(parameterDialog).getByRole('button', {name: 'Choose value for parameter 1 Plate'});
	expect({
		activeElement: document.activeElement,
		editorAriaHidden: editor.getAttribute('aria-hidden'),
		editorInert: editor.inert,
		parameterInert: parameterDialog.inert,
	}).toStrictEqual({
		activeElement: firstName,
		editorAriaHidden: 'true',
		editorInert: true,
		parameterInert: false,
	});

	await user.click(valueInvoker);
	const picker = screen.getByRole('dialog', {name: 'Choose value for Plate'});
	const search = within(picker).getByRole('searchbox', {name: 'Search'});
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
