import {render, screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type {MouseEvent} from 'react';
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

test('binds each button variant to its Factorio style and default contents', () => {
	render(
		<>
			<FactorioButton>Neutral</FactorioButton>
			<FactorioButton kind={FactorioButtonKind.Confirm}>Confirm</FactorioButton>
			<FactorioButton kind={FactorioButtonKind.Delete} aria-label="Delete mapping" />
			<FactorioButton kind={FactorioButtonKind.Search} aria-label="Search signals" />
			<FactorioButton kind={FactorioButtonKind.Close} aria-label="Close picker" />
		</>,
	);

	expect(
		screen.getAllByRole('button').map((button) => ({
			ariaDisabled: button.getAttribute('aria-disabled'),
			className: button.className,
			contentsClassName: button.firstElementChild?.className,
			factorioIcon: button.querySelector('[data-factorio-icon]')?.getAttribute('data-factorio-icon'),
			factorioStyle: button.dataset.factorioStyle,
			type: button.getAttribute('type'),
		})),
	).toStrictEqual([
		{
			ariaDisabled: 'false',
			className: 'factorio-button factorio-button--neutral',
			contentsClassName: 'factorio-button__content',
			factorioIcon: undefined,
			factorioStyle: 'button',
			type: 'button',
		},
		{
			ariaDisabled: 'false',
			className: 'factorio-button factorio-button--confirm',
			contentsClassName: 'factorio-button__content',
			factorioIcon: undefined,
			factorioStyle: 'green_button',
			type: 'button',
		},
		{
			ariaDisabled: 'false',
			className: 'factorio-button factorio-button--delete',
			contentsClassName: 'factorio-button__content',
			factorioIcon: 'delete',
			factorioStyle: 'red_button',
			type: 'button',
		},
		{
			ariaDisabled: 'false',
			className: 'factorio-button factorio-button--search',
			contentsClassName: 'factorio-button__content',
			factorioIcon: 'search',
			factorioStyle: 'frame_action_button',
			type: 'button',
		},
		{
			ariaDisabled: 'false',
			className: 'factorio-button factorio-button--close',
			contentsClassName: 'factorio-button__content',
			factorioIcon: 'close',
			factorioStyle: 'frame_action_button',
			type: 'button',
		},
	]);
});

test('keeps native keyboard activation and disabled behavior for every button variant', async () => {
	const user = userEvent.setup();
	const onActivate = vi.fn<(event: MouseEvent<HTMLButtonElement>) => void>();
	render(
		<>
			{Object.values(FactorioButtonKind).map((kind) => (
				<FactorioButton key={kind} kind={kind} aria-label={`${kind} enabled`} onClick={onActivate}>
					{kind}
				</FactorioButton>
			))}
			{Object.values(FactorioButtonKind).map((kind) => (
				<FactorioButton key={kind} kind={kind} aria-label={`${kind} disabled`} disabled onClick={onActivate}>
					{kind}
				</FactorioButton>
			))}
		</>,
	);

	for (const kind of Object.values(FactorioButtonKind)) {
		const button = screen.getByRole('button', {name: `${kind} enabled`});
		button.focus();
		await user.keyboard('{Enter}');
		await user.keyboard(' ');
	}
	for (const kind of Object.values(FactorioButtonKind)) {
		await user.click(screen.getByRole('button', {name: `${kind} disabled`}));
	}

	expect({
		activationEvents: onActivate.mock.calls.map(([event]) => event.type),
		disabledButtons: Object.values(FactorioButtonKind).map((kind) => {
			const button = screen.getByRole('button', {name: `${kind} disabled`});
			return {
				ariaDisabled: button.getAttribute('aria-disabled'),
				disabled: button.hasAttribute('disabled'),
			};
		}),
	}).toStrictEqual({
		activationEvents: ['click', 'click', 'click', 'click', 'click', 'click', 'click', 'click', 'click', 'click'],
		disabledButtons: [
			{ariaDisabled: 'true', disabled: true},
			{ariaDisabled: 'true', disabled: true},
			{ariaDisabled: 'true', disabled: true},
			{ariaDisabled: 'true', disabled: true},
			{ariaDisabled: 'true', disabled: true},
		],
	});
});
