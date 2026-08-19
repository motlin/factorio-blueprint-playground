import {render, screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {expect, test, vi} from 'vite-plus/test';

import {
	FactorioButton,
	FactorioButtonKind,
	FactorioDialog,
	FactorioDialogBackdrop,
	FactorioTitleBar,
} from '../../src/components/ui/FactorioUi';

test('exposes named modal chrome and an operable close control', async () => {
	const onClose = vi.fn<() => void>();
	const {container} = render(
		<FactorioDialogBackdrop data-testid="dialog-layer">
			<FactorioDialog aria-label="Inventory">
				<FactorioTitleBar>
					<h2>Inventory</h2>
					<FactorioButton kind={FactorioButtonKind.Close} aria-label="Close Inventory" onClick={onClose} />
				</FactorioTitleBar>
				<div className="factorio-dialog__body">Choose an item.</div>
			</FactorioDialog>
		</FactorioDialogBackdrop>,
	);

	const closeButton = screen.getByRole('button', {name: 'Close Inventory'});
	await userEvent.click(closeButton);

	expect({
		backdropLayer: screen.getByTestId('dialog-layer').dataset.factorioDialogLayer,
		closeCalls: onClose.mock.calls,
		dialogLabel: screen.getByRole('dialog', {name: 'Inventory'}).getAttribute('aria-label'),
		dialogModal: screen.getByRole('dialog', {name: 'Inventory'}).getAttribute('aria-modal'),
		headings: screen.getAllByRole('heading').map(({textContent}) => textContent),
		html: container.querySelector('.factorio-dialog')?.className,
	}).toStrictEqual({
		backdropLayer: 'root',
		closeCalls: [[expect.objectContaining({type: 'click'})]],
		dialogLabel: 'Inventory',
		dialogModal: 'true',
		headings: ['Inventory'],
		html: 'factorio-frame factorio-frame--shallow factorio-dialog',
	});
});

test('identifies a nested modal layer without adding an unnamed interaction role', () => {
	render(
		<FactorioDialogBackdrop nested data-testid="nested-layer">
			<FactorioDialog aria-label="Choose an item">
				<FactorioTitleBar>
					<h2>Choose an item</h2>
				</FactorioTitleBar>
			</FactorioDialog>
		</FactorioDialogBackdrop>,
	);

	expect({
		backdropLayer: screen.getByTestId('nested-layer').dataset.factorioDialogLayer,
		dialogs: screen.getAllByRole('dialog').map((dialog) => dialog.getAttribute('aria-label')),
		unnamedButtons: screen.queryAllByRole('button', {name: ''}).length,
	}).toStrictEqual({
		backdropLayer: 'nested',
		dialogs: ['Choose an item'],
		unnamedButtons: 0,
	});
});
