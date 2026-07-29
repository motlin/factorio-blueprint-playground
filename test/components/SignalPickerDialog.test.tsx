import {fireEvent, render, screen, within} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {useState} from 'react';
import {describe, expect, test, vi} from 'vite-plus/test';

import {
	SignalPickerDialog,
	type SignalPickerDialogProps,
} from '../../src/components/blueprint/panels/transform/SignalPickerDialog';
import type {SignalID} from '../../src/parsing/types';

const categorizedOptions: SignalID[] = [
	{type: 'item', name: 'iron-plate'},
	{type: 'entity', name: 'transport-belt'},
	{type: 'recipe', name: 'advanced-oil-processing'},
	{type: 'fluid', name: 'water'},
	{type: 'virtual', name: 'signal-red'},
	{type: 'planet', name: 'nauvis'},
	{type: 'technology', name: 'automation'},
];

const qualitySignal = {type: 'entity', name: 'test-entity'} as const;

function accessibleName(element: Element | null | undefined): string | null {
	if (element === null || element === undefined) {
		return null;
	}
	const explicitLabel = element.getAttribute('aria-label');
	if (explicitLabel !== null) {
		return explicitLabel;
	}
	const labelledBy = element.getAttribute('aria-labelledby');
	if (labelledBy !== null) {
		return document.getElementById(labelledBy)?.textContent ?? null;
	}
	if (
		element instanceof HTMLButtonElement ||
		element instanceof HTMLInputElement ||
		element instanceof HTMLSelectElement ||
		element instanceof HTMLTextAreaElement
	) {
		return element.labels?.[0]?.textContent ?? element.textContent;
	}
	return element.textContent;
}

test('groups only caller-supplied game signals and confirms a selected icon', async () => {
	const user = userEvent.setup();
	const onChoose = vi.fn<SignalPickerDialogProps['onChoose']>();
	render(
		<SignalPickerDialog
			confirmationMode="required"
			title="Choose test signal"
			options={categorizedOptions}
			onChoose={onChoose}
			onClose={vi.fn<() => void>()}
		/>,
	);

	const tabs = screen.getByRole('tablist', {name: 'Signal categories'});
	const dialog = screen.getByRole('dialog', {name: 'Choose test signal'});
	const heading = screen.getByRole('heading', {name: 'Choose test signal'});
	const searchToggle = screen.getByRole('button', {name: 'Search'});
	const close = screen.getByRole('button', {name: 'Close Choose test signal'});
	const confirm = screen.getByRole<HTMLButtonElement>('button', {name: 'Confirm'});
	const footer = document.querySelector<HTMLElement>('.transform-picker__footer');
	expect({
		activeTab: within(tabs).getByRole('tab', {name: 'Logistics'}).getAttribute('aria-selected'),
		backdropLayer: dialog.parentElement?.getAttribute('data-factorio-dialog-layer'),
		closeTooltip: close.getAttribute('title'),
		closeStyle: close.getAttribute('data-factorio-style'),
		confirmControlStyle: confirm.getAttribute('data-factorio-control-style'),
		confirmDisabled: confirm.disabled,
		confirmStyle: confirm.getAttribute('data-factorio-style'),
		dialogLabelledBy: dialog.getAttribute('aria-labelledby'),
		footerStyle: footer?.getAttribute('data-factorio-style'),
		headingId: heading.id,
		initialFocusIsSearch: document.activeElement === searchToggle,
		searchExpanded: searchToggle.getAttribute('aria-expanded'),
		searchField: screen.queryByRole('searchbox', {name: 'Search'}),
		searchStyle: searchToggle.getAttribute('data-factorio-style'),
		tabColumns: tabs.style.gridTemplateColumns,
		tabRows: tabs.style.gridTemplateRows,
		tabLabels: within(tabs)
			.getAllByRole('tab')
			.map((tab) => tab.textContent),
		visibleChoices: within(screen.getByRole('region', {name: 'Logistics choices'}))
			.getAllByRole('button')
			.map((choice) => choice.getAttribute('aria-label')),
	}).toStrictEqual({
		activeTab: 'true',
		backdropLayer: 'nested',
		closeTooltip: 'Close Choose test signal',
		closeStyle: 'frame_action_button',
		confirmControlStyle: 'item_and_count_select_confirm',
		initialFocusIsSearch: true,
		confirmDisabled: true,
		confirmStyle: 'green_button',
		dialogLabelledBy: heading.id,
		footerStyle: 'subfooter_frame',
		headingId: heading.id,
		searchExpanded: 'false',
		searchField: null,
		searchStyle: 'frame_action_button',
		tabColumns: 'repeat(6, 71px)',
		tabRows: '',
		tabLabels: ['Logistics', 'Intermediate products', 'Fluids', 'Signals', 'Unsorted'],
		visibleChoices: ['Choose Transport belt'],
	});

	await user.click(searchToggle);
	await user.type(screen.getByRole('searchbox', {name: 'Search'}), 'belt');
	await user.click(screen.getByRole('button', {name: 'Choose Transport belt'}));
	expect({
		chooseCalls: onChoose.mock.calls,
		confirmDisabled: screen.getByRole<HTMLButtonElement>('button', {name: 'Confirm'}).disabled,
		selected: screen.getByRole('button', {name: 'Choose Transport belt'}).getAttribute('aria-pressed'),
		tooltip: screen.getByRole('button', {name: 'Choose Transport belt'}).getAttribute('title'),
	}).toStrictEqual({
		chooseCalls: [],
		confirmDisabled: false,
		selected: 'true',
		tooltip: 'Transport belt\nentity:transport-belt',
	});

	await user.click(screen.getByRole('button', {name: 'Confirm'}));
	expect(onChoose.mock.calls).toStrictEqual([[{type: 'entity', name: 'transport-belt'}]]);
});

test('preserves initial selection and quality while supporting keyboard grid navigation', async () => {
	const user = userEvent.setup();
	const onChoose = vi.fn<SignalPickerDialogProps['onChoose']>();
	const options: SignalID[] = Array.from({length: 12}, (_, index) => ({
		type: 'entity',
		name: `test-entity-${index.toString()}`,
	}));
	render(
		<SignalPickerDialog
			confirmationMode="required"
			title="Choose keyboard signal"
			options={options}
			initialSignal={options[0]}
			initialQuality="rare"
			qualityMode="target"
			onChoose={onChoose}
			onClose={vi.fn<() => void>()}
		/>,
	);

	const firstOption = screen.getByRole('button', {name: 'Choose Test entity 0'});
	firstOption.focus();
	fireEvent.keyDown(firstOption, {key: 'ArrowDown'});
	expect(document.activeElement?.getAttribute('aria-label')).toBe('Choose Test entity 10');

	await user.click(screen.getByRole('button', {name: 'Choose Test entity 10'}));
	await user.click(screen.getByRole('button', {name: 'Confirm'}));
	expect(onChoose.mock.calls).toStrictEqual([[{type: 'entity', name: 'test-entity-10', quality: 'rare'}]]);
});

test('moves keyboard focus by grid geometry while skipping inaccessible targets', () => {
	const options: SignalID[] = Array.from({length: 22}, (_, index) => ({
		type: 'entity',
		name: `test-entity-${index.toString()}`,
	}));
	render(
		<SignalPickerDialog
			confirmationMode="required"
			title="Choose spatial signal"
			options={options}
			initialSignal={options[0]}
			isSelectionAllowed={(signal) => signal.name !== 'test-entity-10'}
			onChoose={vi.fn<SignalPickerDialogProps['onChoose']>()}
			onClose={vi.fn<() => void>()}
		/>,
	);

	const firstOption = screen.getByRole('button', {name: 'Choose Test entity 0'});
	firstOption.focus();
	fireEvent.keyDown(firstOption, {key: 'ArrowDown'});
	expect(document.activeElement?.getAttribute('aria-label')).toBe('Choose Test entity 11');

	const eleventhOption = screen.getByRole('button', {name: 'Choose Test entity 11'});
	fireEvent.keyDown(eleventhOption, {key: 'ArrowDown'});
	expect(document.activeElement?.getAttribute('aria-label')).toBe('Choose Test entity 21');

	const disabledOption = screen.getByRole<HTMLButtonElement>('button', {name: 'Choose Test entity 10'});
	expect({
		ariaDisabled: disabledOption.getAttribute('aria-disabled'),
		disabled: disabledOption.disabled,
		tabIndex: disabledOption.tabIndex,
	}).toStrictEqual({
		ariaDisabled: 'true',
		disabled: true,
		tabIndex: -1,
	});
});

test('stages on one click and confirms the clicked option on a double click', async () => {
	const user = userEvent.setup();
	const onChoose = vi.fn<SignalPickerDialogProps['onChoose']>();
	render(
		<SignalPickerDialog
			confirmationMode="required"
			title="Choose with double click"
			options={[
				{type: 'item', name: 'iron-plate'},
				{type: 'item', name: 'copper-plate'},
			]}
			onChoose={onChoose}
			onClose={vi.fn<() => void>()}
		/>,
	);

	const copper = screen.getByRole('button', {name: 'Choose Copper plate'});
	await user.click(copper);
	expect({
		chooseCalls: onChoose.mock.calls,
		selected: copper.getAttribute('aria-pressed'),
	}).toStrictEqual({
		chooseCalls: [],
		selected: 'true',
	});

	const iron = screen.getByRole('button', {name: 'Choose Iron plate'});
	await user.dblClick(iron);
	expect(onChoose.mock.calls).toStrictEqual([[{type: 'item', name: 'iron-plate'}]]);
});

test('exposes rest, selected, disabled, and quality-badge option states', () => {
	render(
		<SignalPickerDialog
			confirmationMode="required"
			title="Signal option states"
			initialSignal={{type: 'item', name: 'advanced-circuit', quality: 'rare'}}
			options={[
				{type: 'item', name: 'iron-plate'},
				{type: 'item', name: 'advanced-circuit', quality: 'rare'},
				{type: 'item', name: 'processing-unit', quality: 'epic'},
			]}
			isSelectionAllowed={(signal) => signal.name !== 'processing-unit'}
			onChoose={vi.fn<SignalPickerDialogProps['onChoose']>()}
			onClose={vi.fn<() => void>()}
		/>,
	);

	const rest = screen.getByRole('button', {name: 'Choose Iron plate'});
	const selected = screen.getByRole('button', {name: 'Choose Advanced circuit'});
	const disabled = screen.getByRole<HTMLButtonElement>('button', {name: 'Choose Processing unit'});
	expect({
		disabled: {
			ariaDisabled: disabled.getAttribute('aria-disabled'),
			disabled: disabled.disabled,
			quality: within(disabled).getByTestId('quality').getAttribute('src'),
			tabIndex: disabled.tabIndex,
		},
		rest: {
			factorioStyle: rest.getAttribute('data-factorio-style'),
			selected: rest.getAttribute('aria-pressed'),
		},
		selected: {
			quality: within(selected).getByTestId('quality').getAttribute('src'),
			selected: selected.getAttribute('aria-pressed'),
		},
	}).toStrictEqual({
		disabled: {
			ariaDisabled: 'true',
			disabled: true,
			quality: 'https://factorio-icon-cdn.pages.dev/quality/epic.webp',
			tabIndex: -1,
		},
		rest: {
			factorioStyle: 'slot_button',
			selected: 'false',
		},
		selected: {
			quality: 'https://factorio-icon-cdn.pages.dev/quality/rare.webp',
			selected: 'true',
		},
	});
});

test('keeps an empty constrained picker usable without offering an excluded initial signal', () => {
	render(
		<SignalPickerDialog
			confirmationMode="required"
			title="Choose unavailable signal"
			options={[]}
			initialSignal={{type: 'item', name: 'excluded-item'}}
			onChoose={vi.fn<SignalPickerDialogProps['onChoose']>()}
			onClose={vi.fn<() => void>()}
		/>,
	);

	expect({
		confirmDisabled: screen.getByRole<HTMLButtonElement>('button', {name: 'Confirm'}).disabled,
		emptyMessage: screen.getByRole('status', {name: 'Nothing found'}).textContent,
		inspectedSignal: document.querySelector('.transform-picker__signal-name')?.textContent,
		tabs: screen.queryAllByRole('tab').map((tab) => tab.textContent),
	}).toStrictEqual({
		confirmDisabled: true,
		emptyMessage: 'Nothing found',
		inspectedSignal: '\u00a0',
		tabs: [],
	});
});

test('shows an explicit empty search without activating a guessed category or choice', () => {
	render(
		<SignalPickerDialog
			confirmationMode="required"
			title="Search without matches"
			initialSearch="spidertron"
			initialSignal={{type: 'item', name: 'iron-plate'}}
			options={[
				{type: 'item', name: 'iron-plate'},
				{type: 'fluid', name: 'water'},
			]}
			onChoose={vi.fn<SignalPickerDialogProps['onChoose']>()}
			onClose={vi.fn<() => void>()}
		/>,
	);

	const grid = screen.getByRole('region', {name: 'Signal choices'});
	expect({
		choices: within(grid)
			.queryAllByRole('button')
			.map((button) => button.getAttribute('aria-label')),
		emptyMessage: within(grid).getByRole('status', {name: 'Nothing found'}).textContent,
		selectedTabs: screen.getAllByRole('tab').map((tab) => tab.getAttribute('aria-selected')),
		stagedSelectionStillConfirmable: screen.getByRole<HTMLButtonElement>('button', {name: 'Confirm'}).disabled,
	}).toStrictEqual({
		choices: [],
		emptyMessage: 'Nothing found',
		selectedTabs: ['false', 'false'],
		stagedSelectionStillConfirmable: false,
	});
});

test('shows source quality controls with the Factorio comparators and quality icons', () => {
	render(
		<SignalPickerDialog
			confirmationMode="required"
			title="Choose source signal"
			options={[qualitySignal]}
			initialSignal={qualitySignal}
			qualityMode="source"
			onChoose={vi.fn<SignalPickerDialogProps['onChoose']>()}
			onClose={vi.fn<() => void>()}
		/>,
	);

	const qualityBar = screen.getByRole('group', {name: 'Source quality'});
	expect({
		qualityButtons: within(qualityBar)
			.getAllByRole('button')
			.map((button) => button.getAttribute('aria-label') ?? button.textContent),
		qualityIcons: [
			...qualityBar.querySelectorAll('.upgrade-quality-controls__quality > .factorio-quality-badge'),
		].map((icon) => icon.getAttribute('src')),
	}).toStrictEqual({
		qualityButtons: [
			'Any quality',
			'Normal quality',
			'Uncommon quality',
			'Rare quality',
			'Epic quality',
			'Legendary quality',
		],
		qualityIcons: [
			'https://factorio-icon-cdn.pages.dev/quality/normal.webp',
			'https://factorio-icon-cdn.pages.dev/quality/uncommon.webp',
			'https://factorio-icon-cdn.pages.dev/quality/rare.webp',
			'https://factorio-icon-cdn.pages.dev/quality/epic.webp',
			'https://factorio-icon-cdn.pages.dev/quality/legendary.webp',
		],
	});
});

describe('SignalPickerDialog golden quality and comparator source contracts', () => {
	test.each([
		['=', '='],
		['≠', '≠'],
		['<', '<'],
		['≤', '≤'],
		['>', '>'],
		['≥', '≥'],
	] as const)('serializes the %s source quality comparator', async (_label, comparator) => {
		const user = userEvent.setup();
		const onChoose = vi.fn<SignalPickerDialogProps['onChoose']>();
		render(
			<SignalPickerDialog
				confirmationMode="required"
				title="Choose source signal"
				options={[qualitySignal]}
				initialSignal={qualitySignal}
				qualityMode="source"
				onChoose={onChoose}
				onClose={vi.fn<() => void>()}
			/>,
		);

		await user.click(screen.getByRole('button', {name: 'Rare quality'}));
		await user.click(screen.getByRole('button', {name: 'Quality comparison: ='}));
		await user.click(screen.getByRole('menuitemradio', {name: comparator}));
		await user.click(screen.getByRole('button', {name: 'Confirm'}));

		expect(onChoose.mock.calls).toStrictEqual([
			[{type: 'entity', name: 'test-entity', quality: 'rare', comparator}],
		]);
	});

	test('does not serialize the source no-quality sentinel or a stale comparator', async () => {
		const user = userEvent.setup();
		const onChoose = vi.fn<SignalPickerDialogProps['onChoose']>();
		const initialSignal = {...qualitySignal, quality: 'rare', comparator: '>'} as const;
		render(
			<SignalPickerDialog
				confirmationMode="required"
				title="Choose source signal"
				options={[initialSignal]}
				initialSignal={initialSignal}
				qualityMode="source"
				onChoose={onChoose}
				onClose={vi.fn<() => void>()}
			/>,
		);

		await user.click(screen.getByRole('button', {name: 'Quality comparison: >'}));
		await user.click(screen.getByRole('menuitemradio', {name: 'Any quality'}));
		await user.click(screen.getByRole('button', {name: 'Confirm'}));

		expect(onChoose.mock.calls).toStrictEqual([[{type: 'entity', name: 'test-entity'}]]);
	});

	test('gives the foreground comparator menu ownership until it is cancelled', async () => {
		const user = userEvent.setup();
		const onChoose = vi.fn<SignalPickerDialogProps['onChoose']>();
		const onClose = vi.fn<() => void>();
		render(
			<SignalPickerDialog
				confirmationMode="required"
				title="Choose source signal"
				options={[qualitySignal]}
				initialSignal={{...qualitySignal, quality: 'rare', comparator: '='}}
				qualityMode="source"
				onChoose={onChoose}
				onClose={onClose}
			/>,
		);

		const picker = screen.getByRole('dialog', {name: 'Choose source signal'});
		await user.click(screen.getByRole('button', {name: 'Quality comparison: ='}));
		const comparisonDialog = screen.getByRole('dialog', {name: 'Quality comparison'});
		expect({
			activeElement: accessibleName(document.activeElement),
			dialogStack: [
				{
					ariaHidden: picker.getAttribute('aria-hidden'),
					inert: picker.inert,
					name: accessibleName(picker),
				},
				{
					ariaHidden: comparisonDialog.getAttribute('aria-hidden'),
					inert: comparisonDialog.inert,
					name: accessibleName(comparisonDialog),
				},
			],
		}).toStrictEqual({
			activeElement: 'Any quality',
			dialogStack: [
				{ariaHidden: 'true', inert: true, name: 'Choose source signal'},
				{ariaHidden: null, inert: false, name: 'Quality comparison'},
			],
		});
		fireEvent.keyDown(window, {key: 'Enter'});
		expect(onChoose.mock.calls).toStrictEqual([]);
		fireEvent.keyDown(window, {key: 'Escape'});
		await Promise.resolve();

		expect({
			activeElement: accessibleName(document.activeElement),
			closeCalls: onClose.mock.calls,
			comparisonDialog: screen.queryByRole('dialog', {name: 'Quality comparison'}),
			pickerInert: picker.inert,
			pickerVisible: screen.getByRole('dialog', {name: 'Choose source signal'}) === picker,
		}).toStrictEqual({
			activeElement: 'Quality comparison: =',
			closeCalls: [],
			comparisonDialog: null,
			pickerInert: false,
			pickerVisible: true,
		});
	});
});

test('serializes normal as an explicit source quality', async () => {
	const user = userEvent.setup();
	const onChoose = vi.fn<SignalPickerDialogProps['onChoose']>();
	render(
		<SignalPickerDialog
			confirmationMode="required"
			title="Choose source signal"
			options={[qualitySignal]}
			initialSignal={qualitySignal}
			qualityMode="source"
			onChoose={onChoose}
			onClose={vi.fn<() => void>()}
		/>,
	);

	await user.click(screen.getByRole('button', {name: 'Normal quality'}));
	await user.click(screen.getByRole('button', {name: 'Confirm'}));

	expect(onChoose.mock.calls).toStrictEqual([
		[{type: 'entity', name: 'test-entity', quality: 'normal', comparator: '='}],
	]);
});

test.each([
	['normal', {type: 'entity', name: 'test-entity', quality: 'normal'}],
	['uncommon', {type: 'entity', name: 'test-entity', quality: 'uncommon'}],
	['rare', {type: 'entity', name: 'test-entity', quality: 'rare'}],
	['epic', {type: 'entity', name: 'test-entity', quality: 'epic'}],
	['legendary', {type: 'entity', name: 'test-entity', quality: 'legendary'}],
] as const)('serializes explicit %s target quality', async (quality, expectedSignal) => {
	const user = userEvent.setup();
	const onChoose = vi.fn<SignalPickerDialogProps['onChoose']>();
	render(
		<SignalPickerDialog
			confirmationMode="required"
			title="Choose target signal"
			options={[qualitySignal]}
			initialSignal={qualitySignal}
			qualityMode="target"
			onChoose={onChoose}
			onClose={vi.fn<() => void>()}
		/>,
	);

	await user.click(screen.getByRole('button', {name: `${quality[0].toUpperCase()}${quality.slice(1)} quality`}));
	await user.click(screen.getByRole('button', {name: 'Confirm'}));

	expect(onChoose.mock.calls).toStrictEqual([[expectedSignal]]);
});

test('defaults a target to exact normal quality and has no source-preserving choice', async () => {
	const user = userEvent.setup();
	const onChoose = vi.fn<SignalPickerDialogProps['onChoose']>();
	render(
		<SignalPickerDialog
			confirmationMode="required"
			title="Choose target signal"
			options={[qualitySignal]}
			initialSignal={qualitySignal}
			qualityMode="target"
			onChoose={onChoose}
			onClose={vi.fn<() => void>()}
		/>,
	);

	const targetQualityBar = screen.getByRole('group', {name: 'Target quality'});
	expect({
		comparator: within(targetQualityBar).queryByRole('combobox'),
		qualityButtons: within(targetQualityBar)
			.getAllByRole('button')
			.map((button) => button.getAttribute('aria-label')),
	}).toStrictEqual({
		comparator: null,
		qualityButtons: ['Normal quality', 'Uncommon quality', 'Rare quality', 'Epic quality', 'Legendary quality'],
	});

	await user.click(screen.getByRole('button', {name: 'Confirm'}));
	expect(onChoose.mock.calls).toStrictEqual([[{type: 'entity', name: 'test-entity', quality: 'normal'}]]);
});

test('confirms the selected signal with Enter and the visible green check', async () => {
	const user = userEvent.setup();
	const enterChoose = vi.fn<SignalPickerDialogProps['onChoose']>();
	const {unmount} = render(
		<SignalPickerDialog
			confirmationMode="required"
			title="Choose signal with Enter"
			options={[qualitySignal]}
			initialSignal={qualitySignal}
			onChoose={enterChoose}
			onClose={vi.fn<() => void>()}
		/>,
	);

	await user.click(screen.getByRole('button', {name: 'Search'}));
	const search = screen.getByRole('searchbox', {name: 'Search'});
	search.focus();
	fireEvent.keyDown(search, {key: 'Enter'});
	expect(enterChoose.mock.calls).toStrictEqual([[{type: 'entity', name: 'test-entity'}]]);

	unmount();
	const checkChoose = vi.fn<SignalPickerDialogProps['onChoose']>();
	render(
		<SignalPickerDialog
			confirmationMode="required"
			title="Choose signal with check"
			options={[qualitySignal]}
			initialSignal={qualitySignal}
			onChoose={checkChoose}
			onClose={vi.fn<() => void>()}
		/>,
	);

	const confirm = screen.getByRole('button', {name: 'Confirm'});
	expect(confirm.querySelector('[aria-hidden="true"]')?.textContent).toBe('✓');
	await user.click(confirm);
	expect(checkChoose.mock.calls).toStrictEqual([[{type: 'entity', name: 'test-entity'}]]);
});

test.each(['Escape', 'Q', 'close button'] as const)('dismisses with %s without choosing a signal', async (path) => {
	const user = userEvent.setup();
	const onChoose = vi.fn<SignalPickerDialogProps['onChoose']>();
	const onClose = vi.fn<() => void>();
	render(
		<SignalPickerDialog
			confirmationMode="required"
			title="Dismiss signal picker"
			options={[qualitySignal]}
			initialSignal={qualitySignal}
			onChoose={onChoose}
			onClose={onClose}
		/>,
	);

	if (path === 'Escape') {
		fireEvent.keyDown(window, {key: 'Escape'});
	} else if (path === 'Q') {
		fireEvent.keyDown(window, {key: 'q', code: 'KeyQ'});
	} else {
		await user.click(screen.getByRole('button', {name: 'Close Dismiss signal picker'}));
	}

	expect({
		chooseCalls: onChoose.mock.calls,
		closeCalls: onClose.mock.calls,
	}).toStrictEqual({
		chooseCalls: [],
		closeCalls: [[]],
	});
});

test('keeps Q in the search field instead of dismissing the picker', async () => {
	const user = userEvent.setup();
	const onChoose = vi.fn<SignalPickerDialogProps['onChoose']>();
	const onClose = vi.fn<() => void>();
	render(
		<SignalPickerDialog
			confirmationMode="required"
			title="Search signals"
			options={[qualitySignal]}
			initialSignal={qualitySignal}
			onChoose={onChoose}
			onClose={onClose}
		/>,
	);

	await user.click(screen.getByRole('button', {name: 'Search'}));
	const search = screen.getByRole<HTMLInputElement>('searchbox', {name: 'Search'});
	await user.type(search, 'quality');

	expect({
		chooseCalls: onChoose.mock.calls,
		closeCalls: onClose.mock.calls,
		search: search.value,
	}).toStrictEqual({
		chooseCalls: [],
		closeCalls: [],
		search: 'quality',
	});
});

test('toggles the game-style search popup and clears its filter when closed', async () => {
	const user = userEvent.setup();
	render(
		<SignalPickerDialog
			confirmationMode="required"
			title="Search popup"
			options={[
				{type: 'entity', name: 'transport-belt'},
				{type: 'entity', name: 'inserter'},
			]}
			onChoose={vi.fn<SignalPickerDialogProps['onChoose']>()}
			onClose={vi.fn<() => void>()}
		/>,
	);

	const searchToggle = screen.getByRole('button', {name: 'Search'});
	await user.click(searchToggle);
	const search = screen.getByRole<HTMLInputElement>('searchbox', {name: 'Search'});
	expect({
		expanded: searchToggle.getAttribute('aria-expanded'),
		inputFocused: document.activeElement === search,
	}).toStrictEqual({
		expanded: 'true',
		inputFocused: true,
	});

	await user.type(search, 'belt');
	expect(
		screen.getAllByRole('button', {name: /^Choose /}).map((button) => button.getAttribute('aria-label')),
	).toStrictEqual(['Choose Transport belt']);

	await user.click(searchToggle);
	expect({
		activeElement: accessibleName(document.activeElement),
		expanded: searchToggle.getAttribute('aria-expanded'),
		search: screen.queryByRole('searchbox', {name: 'Search'}),
		visibleChoices: screen
			.getAllByRole('button', {name: /^Choose /})
			.map((button) => button.getAttribute('aria-label')),
	}).toStrictEqual({
		activeElement: 'Search',
		expanded: 'false',
		search: null,
		visibleChoices: ['Choose Transport belt', 'Choose Inserter'],
	});
});

test('uses source category order, disables empty search categories, and keeps the grid geometry stable', async () => {
	const user = userEvent.setup();
	render(
		<SignalPickerDialog
			confirmationMode="required"
			initialSearch="water"
			title="Search category signals"
			options={categorizedOptions}
			onChoose={vi.fn<SignalPickerDialogProps['onChoose']>()}
			onClose={vi.fn<() => void>()}
		/>,
	);

	const tabs = screen.getByRole('tablist', {name: 'Signal categories'});
	const grid = screen.getByRole('region', {name: 'Fluids choices'});
	expect({
		activeTab: within(tabs).getByRole('tab', {name: 'Fluids'}).getAttribute('aria-selected'),
		disabledTabs: within(tabs)
			.getAllByRole('tab')
			.filter((tab) => (tab as HTMLButtonElement).disabled)
			.map((tab) => tab.getAttribute('aria-label')),
		gridHeight: grid.style.height,
		gridStyle: grid.getAttribute('data-factorio-style'),
		gridWidth: grid.style.width,
		results: within(grid)
			.getAllByRole('button')
			.map((button) => button.getAttribute('aria-label')),
	}).toStrictEqual({
		activeTab: 'true',
		disabledTabs: ['Logistics', 'Intermediate products', 'Signals', 'Unsorted'],
		gridHeight: '80px',
		gridStyle: 'deep_slots_scroll_pane',
		gridWidth: '400px',
		results: ['Choose Water'],
	});

	await user.clear(screen.getByRole('searchbox', {name: 'Search'}));
	expect(screen.getByRole('tab', {name: 'Logistics'}).getAttribute('aria-selected')).toBe('true');
});

test('lays source-ordered categories into six-column rows with one selected keyboard tab', () => {
	render(
		<SignalPickerDialog
			confirmationMode="required"
			title="Source category rows"
			options={[
				{type: 'item', name: 'wooden-chest'},
				{type: 'item', name: 'repair-pack'},
				{type: 'recipe', name: 'basic-oil-processing'},
				{type: 'item', name: 'space-platform-foundation'},
				{type: 'item', name: 'pistol'},
				{type: 'fluid', name: 'water'},
				{type: 'virtual', name: 'signal-everything'},
				{type: 'tile', name: 'stone-path'},
				{type: 'quality', name: 'rare'},
				{type: 'technology', name: 'automation'},
			]}
			onChoose={vi.fn<SignalPickerDialogProps['onChoose']>()}
			onClose={vi.fn<() => void>()}
		/>,
	);

	const tabs = screen.getByRole('tablist', {name: 'Signal categories'});
	const categoryTabs = within(tabs).getAllByRole('tab');
	const tabLabels = categoryTabs.map((tab) => tab.getAttribute('aria-label'));
	expect({
		categoryCount: categoryTabs.length,
		categoryStyle: categoryTabs.map((tab) => tab.getAttribute('data-factorio-style')),
		distinctCategoryCount: new Set(tabLabels).size,
		selectedTabs: categoryTabs
			.filter((tab) => tab.getAttribute('aria-selected') === 'true')
			.map((tab) => tab.getAttribute('aria-label')),
		tabOrientation: tabs.getAttribute('aria-orientation'),
		tabIndexes: Object.fromEntries(categoryTabs.map((tab) => [tab.getAttribute('aria-label'), tab.tabIndex])),
		tabLabels,
		tabTemplate: tabs.style.gridTemplateColumns,
		tabWidths: [...new Set(categoryTabs.map((tab) => tab.style.width))],
	}).toStrictEqual({
		categoryCount: 10,
		categoryStyle: Array.from({length: 10}, () => 'filter_group_tab'),
		distinctCategoryCount: 10,
		selectedTabs: ['Logistics'],
		tabOrientation: 'horizontal',
		tabIndexes: {
			Logistics: 0,
			Production: -1,
			'Intermediate products': -1,
			Space: -1,
			Combat: -1,
			Fluids: -1,
			Signals: -1,
			Tiles: -1,
			Effects: -1,
			Unsorted: -1,
		},
		tabLabels: [
			'Logistics',
			'Production',
			'Intermediate products',
			'Space',
			'Combat',
			'Fluids',
			'Signals',
			'Tiles',
			'Effects',
			'Unsorted',
		],
		tabTemplate: 'repeat(6, 71px)',
		tabWidths: ['71px'],
	});
});

test('moves category selection and focus through source-defined tab rows', () => {
	render(
		<SignalPickerDialog
			confirmationMode="required"
			initialSearch="water"
			title="Category keyboard navigation"
			options={categorizedOptions}
			onChoose={vi.fn<SignalPickerDialogProps['onChoose']>()}
			onClose={vi.fn<() => void>()}
		/>,
	);

	const fluids = screen.getByRole('tab', {name: 'Fluids'});
	fluids.focus();
	fireEvent.keyDown(fluids, {key: 'Home'});
	expect({
		activeTab: screen.getByRole('tab', {selected: true}).getAttribute('aria-label'),
		focusedTab: accessibleName(document.activeElement),
	}).toStrictEqual({
		activeTab: 'Fluids',
		focusedTab: 'Fluids',
	});

	const search = screen.getByRole<HTMLInputElement>('searchbox', {name: 'Search'});
	fireEvent.change(search, {target: {value: ''}});
	const logistics = screen.getByRole('tab', {name: 'Logistics'});
	logistics.focus();
	fireEvent.keyDown(logistics, {key: 'ArrowRight'});
	expect({
		activeTab: screen.getByRole('tab', {selected: true}).getAttribute('aria-label'),
		focusedTab: accessibleName(document.activeElement),
		logisticsTabIndex: logistics.tabIndex,
	}).toStrictEqual({
		activeTab: 'Intermediate products',
		focusedTab: 'Intermediate products',
		logisticsTabIndex: -1,
	});
});

test('filters hidden prototypes by default and admits them only through the explicit include policy', async () => {
	const user = userEvent.setup();
	const hiddenOptions: SignalID[] = [
		{type: 'item', name: 'parameter-'},
		{type: 'item', name: 'iron-plate'},
		{type: 'fluid', name: 'fluid-unknown'},
	];
	const firstRender = render(
		<SignalPickerDialog
			confirmationMode="required"
			title="Visible prototypes"
			options={hiddenOptions}
			onChoose={vi.fn<SignalPickerDialogProps['onChoose']>()}
			onClose={vi.fn<() => void>()}
		/>,
	);
	expect(
		screen.getAllByRole('button', {name: /^Choose /}).map((button) => button.getAttribute('aria-label')),
	).toStrictEqual(['Choose Iron plate']);

	firstRender.unmount();
	render(
		<SignalPickerDialog
			confirmationMode="required"
			includeHiddenSignals
			title="All prototypes"
			options={hiddenOptions}
			onChoose={vi.fn<SignalPickerDialogProps['onChoose']>()}
			onClose={vi.fn<() => void>()}
		/>,
	);
	expect(
		screen.getAllByRole('button', {name: /^Choose /}).map((button) => button.getAttribute('aria-label')),
	).toStrictEqual(['Choose Iron plate']);

	await user.click(screen.getByRole('tab', {name: 'Unsorted'}));
	expect(
		screen.getAllByRole('button', {name: /^Choose /}).map((button) => button.getAttribute('aria-label')),
	).toStrictEqual(['Choose Parameter ', 'Choose Fluid unknown']);
});

test('orders generated entities by subgroup and starts each subgroup on a new game-style row', () => {
	const options: SignalID[] = [
		'loader',
		'turbo-splitter',
		'iron-chest',
		'express-underground-belt',
		'transport-belt',
		'fast-loader',
		'inserter',
		'fast-transport-belt',
		'express-loader',
		'turbo-loader',
		'underground-belt',
		'fast-underground-belt',
		'turbo-underground-belt',
		'express-transport-belt',
		'turbo-transport-belt',
		'splitter',
		'fast-splitter',
		'express-splitter',
	].map((name) => ({type: 'entity', name}));
	render(
		<SignalPickerDialog
			confirmationMode="required"
			title="Generated entity layout"
			options={options}
			onChoose={vi.fn<SignalPickerDialogProps['onChoose']>()}
			onClose={vi.fn<() => void>()}
		/>,
	);

	const cells = [...screen.getByRole('region', {name: 'Logistics choices'}).children].map(
		(cell) => cell.getAttribute('aria-label') ?? 'empty',
	);
	const grid = screen.getByRole('region', {name: 'Logistics choices'});
	expect({
		beltRows: cells.slice(10, 30),
		cellKinds: [...grid.children].map((cell) => cell.getAttribute('data-picker-cell')),
		firstRow: cells.slice(0, 10),
		gridColumns: grid.getAttribute('data-grid-columns'),
		gridTemplate: grid.style.gridTemplateColumns,
		hiddenLoaders: screen.queryAllByRole('button', {name: /loader/i}).map((button) => button.textContent),
		lastRow: cells.slice(30),
	}).toStrictEqual({
		beltRows: [
			'Choose Transport belt',
			'Choose Fast transport belt',
			'Choose Express transport belt',
			'Choose Turbo transport belt',
			'Choose Underground belt',
			'Choose Fast underground belt',
			'Choose Express underground belt',
			'Choose Turbo underground belt',
			'Choose Splitter',
			'Choose Fast splitter',
			'Choose Express splitter',
			'Choose Turbo splitter',
			'empty',
			'empty',
			'empty',
			'empty',
			'empty',
			'empty',
			'empty',
			'empty',
		],
		cellKinds: [
			'signal',
			...Array.from({length: 9}, () => 'padding'),
			...Array.from({length: 12}, () => 'signal'),
			...Array.from({length: 8}, () => 'padding'),
			'signal',
		],
		firstRow: [
			'Choose Iron chest',
			'empty',
			'empty',
			'empty',
			'empty',
			'empty',
			'empty',
			'empty',
			'empty',
			'empty',
		],
		gridColumns: '10',
		gridTemplate: 'repeat(10, 40px)',
		hiddenLoaders: [],
		lastRow: ['Choose Inserter'],
	});
});

test('keeps generated prototype order while search removes nonmatching prototypes', () => {
	render(
		<SignalPickerDialog
			confirmationMode="required"
			initialSearch="transport"
			title="Search ordered signals"
			options={[
				{type: 'entity', name: 'fast-splitter'},
				{type: 'entity', name: 'transport-belt'},
				{type: 'item', name: 'transport-belt'},
				{type: 'entity', name: 'express-underground-belt'},
				{type: 'entity', name: 'fast-transport-belt'},
				{type: 'entity', name: 'underground-belt'},
				{type: 'entity', name: 'splitter'},
				{type: 'entity', name: 'express-transport-belt'},
				{type: 'entity', name: 'fast-underground-belt'},
			]}
			onChoose={vi.fn<SignalPickerDialogProps['onChoose']>()}
			onClose={vi.fn<() => void>()}
		/>,
	);

	const grid = screen.getByRole('region', {name: 'Logistics choices'});
	expect(
		within(grid)
			.getAllByRole('button')
			.map((button) => ({
				label: button.getAttribute('aria-label'),
				title: button.getAttribute('title'),
			})),
	).toStrictEqual([
		{label: 'Choose Transport belt', title: 'Transport belt\nitem:transport-belt'},
		{label: 'Choose Fast transport belt', title: 'Fast transport belt\nentity:fast-transport-belt'},
		{label: 'Choose Express transport belt', title: 'Express transport belt\nentity:express-transport-belt'},
	]);
});

test('renders disallowed signals disabled and keeps the hovered or focused signal name readable', async () => {
	const user = userEvent.setup();
	render(
		<SignalPickerDialog
			confirmationMode="required"
			title="Restricted signals"
			options={[
				{type: 'item', name: 'iron-plate'},
				{type: 'item', name: 'copper-plate'},
				{type: 'item', name: 'processing-unit'},
			]}
			isSelectionAllowed={(signal) => signal.name !== 'processing-unit'}
			onChoose={vi.fn<SignalPickerDialogProps['onChoose']>()}
			onClose={vi.fn<() => void>()}
		/>,
	);

	const iron = screen.getByRole('button', {name: 'Choose Iron plate'});
	const copper = screen.getByRole('button', {name: 'Choose Copper plate'});
	const processingUnit = screen.getByRole<HTMLButtonElement>('button', {name: 'Choose Processing unit'});

	fireEvent.focus(iron);
	expect(screen.getByRole('status', {name: 'Inspected signal: Iron plate'}).textContent).toBe('Iron plate');
	await user.hover(copper);
	expect(screen.getByRole('status', {name: 'Inspected signal: Copper plate'}).textContent).toBe('Copper plate');
	await user.unhover(copper);
	expect(screen.getByRole('status', {name: 'Inspected signal: Iron plate'}).textContent).toBe('Iron plate');
	fireEvent.blur(iron);
	expect(document.querySelector('.transform-picker__signal-name')?.textContent).toBe('\u00a0');
	expect({
		processingUnitDisabled: processingUnit.disabled,
		processingUnitTabIndex: processingUnit.tabIndex,
	}).toStrictEqual({
		processingUnitDisabled: true,
		processingUnitTabIndex: -1,
	});
});

test('exposes the complete long signal name while the fixed readout can truncate it visually', () => {
	const longSignalName = 'This is an extraordinarily long signal name that must not resize the picker';
	render(
		<SignalPickerDialog
			confirmationMode="required"
			title="Long signal name"
			options={[
				{type: 'item', name: 'this-is-an-extraordinarily-long-signal-name-that-must-not-resize-the-picker'},
			]}
			onChoose={vi.fn<SignalPickerDialogProps['onChoose']>()}
			onClose={vi.fn<() => void>()}
		/>,
	);

	fireEvent.focus(screen.getByRole('button', {name: `Choose ${longSignalName}`}));
	const readout = screen.getByRole('status', {name: `Inspected signal: ${longSignalName}`});
	expect({
		accessibleName: readout.getAttribute('aria-label'),
		fullText: readout.textContent,
		title: readout.getAttribute('title'),
	}).toStrictEqual({
		accessibleName: `Inspected signal: ${longSignalName}`,
		fullText: longSignalName,
		title: longSignalName,
	});
});

test('chooses immediately with Enter without rendering a subfooter or green confirmation', async () => {
	const user = userEvent.setup();
	const onChoose = vi.fn<SignalPickerDialogProps['onChoose']>();
	render(
		<SignalPickerDialog
			confirmationMode="immediate"
			title="Choose immediate signal"
			options={[qualitySignal]}
			onChoose={onChoose}
			onClose={vi.fn<() => void>()}
		/>,
	);

	expect(document.querySelector('.transform-picker__footer')).toBe(null);
	expect(screen.queryByRole('button', {name: 'Confirm'})).toBe(null);
	const option = screen.getByRole('button', {name: 'Choose Test entity'});
	option.focus();
	await user.keyboard('{Enter}');
	expect(onChoose.mock.calls).toStrictEqual([[qualitySignal]]);
});

test('rejects quality controls in immediate-selection mode', () => {
	expect(() => {
		render(
			<SignalPickerDialog
				confirmationMode="immediate"
				title="Invalid immediate quality picker"
				options={[qualitySignal]}
				qualityMode="target"
				onChoose={vi.fn<SignalPickerDialogProps['onChoose']>()}
				onClose={vi.fn<() => void>()}
			/>,
		);
	}).toThrow('Immediate signal selection cannot include staged quality controls.');
});

test('keeps required confirmation disabled and ignores Enter until a valid signal is staged', () => {
	const onChoose = vi.fn<SignalPickerDialogProps['onChoose']>();
	render(
		<SignalPickerDialog
			confirmationMode="required"
			title="Required confirmation"
			options={[qualitySignal]}
			onChoose={onChoose}
			onClose={vi.fn<() => void>()}
		/>,
	);

	const confirm = screen.getByRole<HTMLButtonElement>('button', {name: 'Confirm'});
	const grid = screen.getByRole('region', {name: 'Logistics choices'});
	grid.focus();
	fireEvent.keyDown(grid, {key: 'Enter'});
	expect({
		chooseCalls: onChoose.mock.calls,
		confirmDisabled: confirm.disabled,
	}).toStrictEqual({
		chooseCalls: [],
		confirmDisabled: true,
	});

	fireEvent.click(screen.getByRole('button', {name: 'Choose Test entity'}));
	grid.focus();
	fireEvent.keyDown(grid, {key: 'Enter'});
	expect({
		chooseCalls: onChoose.mock.calls,
		confirmDisabled: confirm.disabled,
	}).toStrictEqual({
		chooseCalls: [[qualitySignal]],
		confirmDisabled: false,
	});
});

function NestedPickerStack() {
	const [outerOpen, setOuterOpen] = useState(false);
	const [innerOpen, setInnerOpen] = useState(false);
	return (
		<>
			<button
				type="button"
				onClick={() => {
					setOuterOpen(true);
				}}
			>
				Open outer picker
			</button>
			{outerOpen ? (
				<SignalPickerDialog
					confirmationMode="immediate"
					title="Outer picker"
					options={[{type: 'item', name: 'iron-plate'}]}
					onChoose={() => {
						setInnerOpen(true);
					}}
					onClose={() => {
						setOuterOpen(false);
					}}
				/>
			) : null}
			{innerOpen ? (
				<SignalPickerDialog
					confirmationMode="required"
					title="Inner picker"
					initialSignal={{type: 'item', name: 'copper-plate'}}
					options={[{type: 'item', name: 'copper-plate'}]}
					onChoose={() => {
						setInnerOpen(false);
					}}
					onClose={() => {
						setInnerOpen(false);
					}}
				/>
			) : null}
		</>
	);
}

describe('SignalPickerDialog golden cancellation and focus source contracts', () => {
	test('cancels only the topmost picker and restores each invoking slot in stack order', async () => {
		const user = userEvent.setup();
		render(<NestedPickerStack />);

		const opener = screen.getByRole('button', {name: 'Open outer picker'});
		await user.click(opener);
		const outerDialog = screen.getByRole('dialog', {name: 'Outer picker'});
		const invokingSlot = screen.getByRole('button', {name: 'Choose Iron plate'});
		await user.click(invokingSlot);
		const innerDialog = screen.getByRole('dialog', {name: 'Inner picker'});
		opener.focus();
		expect({
			activeElement: accessibleName(document.activeElement),
			dialogStack: [
				{
					ariaHidden: outerDialog.getAttribute('aria-hidden'),
					inert: outerDialog.inert,
					name: accessibleName(outerDialog),
				},
				{
					ariaHidden: innerDialog.getAttribute('aria-hidden'),
					inert: innerDialog.inert,
					name: accessibleName(innerDialog),
				},
			],
		}).toStrictEqual({
			activeElement: 'Search',
			dialogStack: [
				{ariaHidden: 'true', inert: true, name: 'Outer picker'},
				{ariaHidden: null, inert: false, name: 'Inner picker'},
			],
		});

		fireEvent.keyDown(window, {key: 'Escape'});
		await Promise.resolve();
		expect({
			activeElement: accessibleName(document.activeElement),
			dialogStack: [
				{
					ariaHidden: outerDialog.getAttribute('aria-hidden'),
					inert: outerDialog.inert,
					name: accessibleName(outerDialog),
				},
			],
		}).toStrictEqual({
			activeElement: 'Choose Iron plate',
			dialogStack: [{ariaHidden: null, inert: false, name: 'Outer picker'}],
		});

		fireEvent.keyDown(window, {key: 'q', code: 'KeyQ'});
		await Promise.resolve();
		expect({
			activeElement: accessibleName(document.activeElement),
			dialogStack: screen.queryAllByRole('dialog').map((dialog) => accessibleName(dialog)),
		}).toStrictEqual({
			activeElement: 'Open outer picker',
			dialogStack: [],
		});
	});
});
