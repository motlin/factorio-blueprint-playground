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
	const search = screen.getByRole<HTMLInputElement>('searchbox', {name: 'Search'});
	const close = screen.getByRole('button', {name: 'Close Choose test signal'});
	expect({
		activeTab: within(tabs).getByRole('tab', {name: 'Logistics'}).getAttribute('aria-selected'),
		closeTooltip: close.getAttribute('title'),
		confirmDisabled: screen.getByRole<HTMLButtonElement>('button', {name: 'Confirm'}).disabled,
		dialogLabelledBy: dialog.getAttribute('aria-labelledby'),
		headingId: heading.id,
		initialFocusIsSearch: document.activeElement === search,
		searchLabel: search.labels?.[0]?.textContent,
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
		closeTooltip: 'Close Choose test signal',
		initialFocusIsSearch: true,
		confirmDisabled: true,
		dialogLabelledBy: heading.id,
		headingId: heading.id,
		searchLabel: 'Search',
		tabColumns: 'repeat(6, 71px)',
		tabRows: '',
		tabLabels: ['Logistics', 'Intermediate products', 'Fluids', 'Signals', 'Unsorted'],
		visibleChoices: ['Choose Transport belt'],
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
		emptyMessage: screen.getByText('No matching signals.').textContent,
		tabs: screen.queryAllByRole('tab').map((tab) => tab.textContent),
	}).toStrictEqual({
		confirmDisabled: true,
		emptyMessage: 'No matching signals.',
		tabs: [],
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
	expect({
		beltRows: cells.slice(10, 30),
		firstRow: cells.slice(0, 10),
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
		hiddenLoaders: [],
		lastRow: ['Choose Inserter'],
	});
});

test('renders disallowed signals disabled and exposes signal names on hover and focus', async () => {
	const user = userEvent.setup();
	render(
		<SignalPickerDialog
			confirmationMode="required"
			title="Restricted signals"
			options={[
				{type: 'item', name: 'iron-plate'},
				{type: 'item', name: 'copper-plate'},
			]}
			isSelectionAllowed={(signal) => signal.name === 'iron-plate'}
			onChoose={vi.fn<SignalPickerDialogProps['onChoose']>()}
			onClose={vi.fn<() => void>()}
		/>,
	);

	const iron = screen.getByRole('button', {name: 'Choose Iron plate'});
	const copper = screen.getByRole<HTMLButtonElement>('button', {name: 'Choose Copper plate'});
	await user.hover(iron);
	expect(screen.getByText('Iron plate').className).toBe('transform-picker__signal-name');
	await user.unhover(iron);
	fireEvent.focus(iron);
	expect(screen.getByText('Iron plate').className).toBe('transform-picker__signal-name');
	expect({
		copperDisabled: copper.disabled,
		copperTabIndex: copper.tabIndex,
	}).toStrictEqual({
		copperDisabled: true,
		copperTabIndex: -1,
	});
});

test('chooses immediately without rendering a green confirmation when the context does not need one', async () => {
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

	expect(screen.queryByRole('button', {name: 'Confirm'})).toBe(null);
	await user.click(screen.getByRole('button', {name: 'Choose Test entity'}));
	expect(onChoose.mock.calls).toStrictEqual([[qualitySignal]]);
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
