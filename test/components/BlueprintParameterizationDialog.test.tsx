import {render, screen, within} from '@testing-library/react';
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
