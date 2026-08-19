import {render, screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type {MouseEvent} from 'react';
import {expect, test, vi} from 'vite-plus/test';

import {FactorioIcon} from '../../src/components/core/icons/FactorioIcon';
import {
	FactorioButton,
	FactorioButtonKind,
	FactorioDialog,
	FactorioDialogBackdrop,
	FactorioQualityBadge,
	FactorioTitleBar,
	FactorioTooltip,
	FactorioTooltipPlacement,
	factorioQualityLabel,
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
			className: 'factorio-button factorio-button--delete factorio-button--icon-only',
			contentsClassName: 'factorio-button__content',
			factorioIcon: 'delete',
			factorioStyle: 'tool_button_red',
			type: 'button',
		},
		{
			ariaDisabled: 'false',
			className: 'factorio-button factorio-button--search factorio-button--icon-only',
			contentsClassName: 'factorio-button__content',
			factorioIcon: 'search',
			factorioStyle: 'frame_action_button',
			type: 'button',
		},
		{
			ariaDisabled: 'false',
			className: 'factorio-button factorio-button--close factorio-button--icon-only',
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

test('uses one accessible name for quality icons while keeping overlay images decorative', () => {
	const {container} = render(
		<>
			<FactorioIcon
				id="legendary-item"
				icon={{type: 'item', name: 'assembling-machine-3', quality: 'legendary'}}
				size="large"
			/>
			<FactorioIcon
				id="normal-entity"
				icon={{type: 'entity', name: 'small-biter', quality: 'normal'}}
				size="small"
			/>
			<FactorioIcon
				decorative
				id="decorative-item"
				icon={{type: 'item', name: 'transport-belt', quality: 'rare'}}
				size="large"
			/>
			<FactorioIcon id="utility-icon" icon={{type: 'utility', name: 'parametrise'}} size="small" />
			<FactorioQualityBadge quality="rare" />
			<FactorioQualityBadge quality="epic" aria-hidden="true" />
		</>,
	);

	const legendaryIcon = screen.getByRole('img', {
		name: 'item: assembling-machine-3, Legendary quality',
	});
	const normalIcon = screen.getByRole('img', {name: 'entity: small-biter'});
	const legendaryArtwork = legendaryIcon.querySelector<HTMLImageElement>('[data-testid="icon"]');
	const legendaryQuality = legendaryIcon.querySelector<HTMLImageElement>('[data-testid="quality"]');
	const decorativeIcon = container.querySelector<HTMLElement>('#decorative-item');
	const utilityIcon = screen.getByRole('img', {name: 'utility: parametrise'});
	const utilityArtwork = utilityIcon.querySelector<HTMLImageElement>('[data-testid="icon"]');
	const standaloneQuality = screen.getByRole('img', {name: 'Rare quality'});
	expect({
		decorative: {
			ariaHidden: decorativeIcon?.getAttribute('aria-hidden'),
			ariaLabel: decorativeIcon?.getAttribute('aria-label'),
			role: decorativeIcon?.getAttribute('role'),
		},
		helperLabel: factorioQualityLabel('legendary'),
		legendary: {
			ariaLabel: legendaryIcon.getAttribute('aria-label'),
			artworkAlt: legendaryArtwork?.getAttribute('alt'),
			artworkAriaHidden: legendaryArtwork?.getAttribute('aria-hidden'),
			qualityAlt: legendaryQuality?.getAttribute('alt'),
			qualityAriaHidden: legendaryQuality?.getAttribute('aria-hidden'),
			size: legendaryIcon.dataset.factorioIconSize,
		},
		normal: {
			qualityCount: normalIcon.querySelectorAll('[data-testid="quality"]').length,
			size: normalIcon.dataset.factorioIconSize,
		},
		standalone: {
			alt: standaloneQuality.getAttribute('alt'),
			src: standaloneQuality.getAttribute('src'),
			title: standaloneQuality.getAttribute('title'),
		},
		utility: {
			size: utilityIcon.dataset.factorioIconSize,
			src: utilityArtwork?.getAttribute('src'),
			title: utilityArtwork?.getAttribute('title'),
		},
	}).toStrictEqual({
		decorative: {
			ariaHidden: 'true',
			ariaLabel: null,
			role: null,
		},
		helperLabel: 'Legendary quality',
		legendary: {
			ariaLabel: 'item: assembling-machine-3, Legendary quality',
			artworkAlt: '',
			artworkAriaHidden: 'true',
			qualityAlt: '',
			qualityAriaHidden: 'true',
			size: 'large',
		},
		normal: {
			qualityCount: 0,
			size: 'small',
		},
		standalone: {
			alt: 'Rare quality',
			src: 'https://factorio-icon-cdn.pages.dev/quality/rare.webp',
			title: 'Rare quality',
		},
		utility: {
			size: 'small',
			src: '/assets/factorio/parametrise.png',
			title: 'utility: parametrise',
		},
	});
});

test('rejects qualities that are absent from the pinned game specification', () => {
	expect(() => factorioQualityLabel('mythic')).toThrow('Unknown Factorio 2.1.12 quality: mythic');
});

test('renders a selectable portal tooltip and exposes it from pointer and keyboard triggers', async () => {
	const user = userEvent.setup();
	render(
		<div data-testid="tooltip-trigger">
			<FactorioButton aria-describedby="test-tooltip">Inspect item</FactorioButton>
			<FactorioTooltip id="test-tooltip" heading="Transport belt" placement={FactorioTooltipPlacement.Below}>
				Moves items.
			</FactorioTooltip>
		</div>,
	);

	const button = screen.getByRole('button', {name: 'Inspect item'});
	const tooltip = screen.getByRole('tooltip');
	await user.hover(button);
	expect({
		anchorMarker: screen.getByTestId('tooltip-trigger').querySelector('.factorio-tooltip__anchor-marker')
			?.className,
		body: tooltip.querySelector('.factorio-tooltip__body')?.textContent,
		open: tooltip.dataset.factorioTooltipOpen,
		parent: tooltip.parentElement,
		placement: tooltip.dataset.factorioPlacement,
		title: tooltip.querySelector('.factorio-tooltip__title')?.textContent,
	}).toStrictEqual({
		anchorMarker: 'factorio-tooltip__anchor-marker',
		body: 'Moves items.',
		open: 'true',
		parent: document.body,
		placement: 'below',
		title: 'Transport belt',
	});

	await user.unhover(button);
	button.focus();
	expect({
		description: button.getAttribute('aria-describedby'),
		focused: document.activeElement,
		open: tooltip.dataset.factorioTooltipOpen,
		tooltip: tooltip.id,
	}).toStrictEqual({
		description: tooltip.id,
		focused: button,
		open: 'true',
		tooltip: tooltip.id,
	});
});
