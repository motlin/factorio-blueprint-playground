import {fireEvent, render, screen, within} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {expect, test, vi} from 'vite-plus/test';

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

test('groups only caller-supplied game signals and confirms a selected icon', async () => {
	const user = userEvent.setup();
	const onChoose = vi.fn<SignalPickerDialogProps['onChoose']>();
	render(
		<SignalPickerDialog
			title="Choose test signal"
			options={categorizedOptions}
			onChoose={onChoose}
			onClose={vi.fn<() => void>()}
		/>,
	);

	const tabs = screen.getByRole('tablist', {name: 'Signal categories'});
	const dialog = screen.getByRole('dialog', {name: 'Choose test signal'});
	const heading = screen.getByRole('heading', {name: 'Choose test signal'});
	const search = screen.getByRole<HTMLInputElement>('searchbox', {name: 'Search'});
	const close = screen.getByRole('button', {name: 'Close Choose test signal'});
	expect({
		activeTab: within(tabs).getByRole('tab', {name: 'Items and entities'}).getAttribute('aria-selected'),
		closeTooltip: close.getAttribute('title'),
		confirmDisabled: screen.getByRole<HTMLButtonElement>('button', {name: 'Confirm'}).disabled,
		dialogLabelledBy: dialog.getAttribute('aria-labelledby'),
		headingId: heading.id,
		initialFocusIsSearch: document.activeElement === search,
		searchLabel: search.labels?.[0]?.textContent,
		tabLabels: within(tabs)
			.getAllByRole('tab')
			.map((tab) => tab.textContent),
		visibleChoices: within(screen.getByRole('group', {name: 'Items and entities choices'}))
			.getAllByRole('button')
			.map((choice) => choice.getAttribute('aria-label')),
	}).toStrictEqual({
		activeTab: 'true',
		closeTooltip: 'Close Choose test signal',
		initialFocusIsSearch: true,
		confirmDisabled: true,
		dialogLabelledBy: heading.id,
		headingId: heading.id,
		searchLabel: 'Search',
		tabLabels: ['Items and entities', 'Recipes', 'Fluids', 'Virtual signals', 'Environment', 'Other signals'],
		visibleChoices: ['Choose Iron plate', 'Choose Transport belt'],
	});

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
	expect(onChoose.mock.calls).toStrictEqual([[{type: 'entity', name: 'transport-belt'}, false]]);
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
	expect(onChoose.mock.calls).toStrictEqual([[{type: 'entity', name: 'test-entity-10', quality: 'rare'}, false]]);
});

test('keeps an empty constrained picker usable without offering an excluded initial signal', () => {
	render(
		<SignalPickerDialog
			title="Choose unavailable signal"
			options={[]}
			initialSignal={{type: 'item', name: 'excluded-item'}}
			onChoose={vi.fn<SignalPickerDialogProps['onChoose']>()}
			onClose={vi.fn<() => void>()}
		/>,
	);

	expect({
		confirmDisabled: screen.getByRole<HTMLButtonElement>('button', {name: 'Confirm'}).disabled,
		emptyMessage: screen.getByText('No matching signals in this category.').textContent,
		tabs: screen.queryAllByRole('tab').map((tab) => tab.textContent),
	}).toStrictEqual({
		confirmDisabled: true,
		emptyMessage: 'No matching signals in this category.',
		tabs: [],
	});
});

test('shows source quality controls with the Factorio comparators and quality icons', () => {
	render(
		<SignalPickerDialog
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
		comparators: within(qualityBar)
			.getAllByRole('option')
			.map((option) => ({label: option.textContent, value: option.getAttribute('value')})),
		qualityButtons: within(qualityBar)
			.getAllByRole('button')
			.map((button) => button.getAttribute('aria-label') ?? button.textContent),
		qualityIcons: within(qualityBar)
			.getAllByTestId('icon')
			.map((icon) => icon.getAttribute('src')),
	}).toStrictEqual({
		comparators: [
			{label: '=', value: '='},
			{label: '≠', value: '≠'},
			{label: '<', value: '<'},
			{label: '≤', value: '≤'},
			{label: '>', value: '>'},
			{label: '≥', value: '≥'},
		],
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
			title="Choose source signal"
			options={[qualitySignal]}
			initialSignal={qualitySignal}
			qualityMode="source"
			onChoose={onChoose}
			onClose={vi.fn<() => void>()}
		/>,
	);

	await user.click(screen.getByRole('button', {name: 'Rare quality'}));
	await user.selectOptions(screen.getByRole('combobox', {name: 'Quality comparison'}), comparator);
	await user.click(screen.getByRole('button', {name: 'Confirm'}));

	expect(onChoose.mock.calls).toStrictEqual([
		[{type: 'entity', name: 'test-entity', quality: 'rare', comparator}, false],
	]);
});

test('does not serialize the source no-quality sentinel or a stale comparator', async () => {
	const user = userEvent.setup();
	const onChoose = vi.fn<SignalPickerDialogProps['onChoose']>();
	const initialSignal = {...qualitySignal, quality: 'rare', comparator: '>'} as const;
	render(
		<SignalPickerDialog
			title="Choose source signal"
			options={[initialSignal]}
			initialSignal={initialSignal}
			qualityMode="source"
			onChoose={onChoose}
			onClose={vi.fn<() => void>()}
		/>,
	);

	await user.click(screen.getByRole('button', {name: 'Any quality'}));
	await user.click(screen.getByRole('button', {name: 'Confirm'}));

	expect(onChoose.mock.calls).toStrictEqual([[{type: 'entity', name: 'test-entity'}, false]]);
});

test('serializes normal as an explicit source quality', async () => {
	const user = userEvent.setup();
	const onChoose = vi.fn<SignalPickerDialogProps['onChoose']>();
	render(
		<SignalPickerDialog
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
		[{type: 'entity', name: 'test-entity', quality: 'normal', comparator: '='}, false],
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

	expect(onChoose.mock.calls).toStrictEqual([[expectedSignal, false]]);
});

test('does not serialize the target preserve-quality sentinel', async () => {
	const user = userEvent.setup();
	const onChoose = vi.fn<SignalPickerDialogProps['onChoose']>();
	const initialSignal = {...qualitySignal, quality: 'epic'} as const;
	render(
		<SignalPickerDialog
			title="Choose target signal"
			options={[initialSignal]}
			initialSignal={initialSignal}
			initialQuality="preserve"
			qualityMode="target"
			onChoose={onChoose}
			onClose={vi.fn<() => void>()}
		/>,
	);

	const targetQualityBar = screen.getByRole('group', {name: 'Target quality'});
	expect({
		comparator: within(targetQualityBar).queryByRole('combobox'),
		preserveSelected: within(targetQualityBar)
			.getByRole('button', {name: 'Set as source'})
			.getAttribute('aria-pressed'),
	}).toStrictEqual({
		comparator: null,
		preserveSelected: 'true',
	});

	await user.click(screen.getByRole('button', {name: 'Confirm'}));
	expect(onChoose.mock.calls).toStrictEqual([[{type: 'entity', name: 'test-entity'}, true]]);
});

test('confirms the selected signal with Enter and the visible green check', async () => {
	const user = userEvent.setup();
	const enterChoose = vi.fn<SignalPickerDialogProps['onChoose']>();
	const {unmount} = render(
		<SignalPickerDialog
			title="Choose signal with Enter"
			options={[qualitySignal]}
			initialSignal={qualitySignal}
			onChoose={enterChoose}
			onClose={vi.fn<() => void>()}
		/>,
	);

	const search = screen.getByRole('searchbox', {name: 'Search'});
	search.focus();
	fireEvent.keyDown(search, {key: 'Enter'});
	expect(enterChoose.mock.calls).toStrictEqual([[{type: 'entity', name: 'test-entity'}, false]]);

	unmount();
	const checkChoose = vi.fn<SignalPickerDialogProps['onChoose']>();
	render(
		<SignalPickerDialog
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
	expect(checkChoose.mock.calls).toStrictEqual([[{type: 'entity', name: 'test-entity'}, false]]);
});

test.each(['Escape', 'Q', 'close button'] as const)('dismisses with %s without choosing a signal', async (path) => {
	const user = userEvent.setup();
	const onChoose = vi.fn<SignalPickerDialogProps['onChoose']>();
	const onClose = vi.fn<() => void>();
	render(
		<SignalPickerDialog
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
			title="Search signals"
			options={[qualitySignal]}
			initialSignal={qualitySignal}
			onChoose={onChoose}
			onClose={onClose}
		/>,
	);

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
