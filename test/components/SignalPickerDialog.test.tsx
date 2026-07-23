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
	expect({
		activeTab: within(tabs).getByRole('tab', {name: 'Items and entities'}).getAttribute('aria-selected'),
		confirmDisabled: screen.getByRole<HTMLButtonElement>('button', {name: 'Confirm'}).disabled,
		tabLabels: within(tabs)
			.getAllByRole('tab')
			.map((tab) => tab.textContent),
		visibleChoices: within(screen.getByRole('group', {name: 'Items and entities choices'}))
			.getAllByRole('button')
			.map((choice) => choice.getAttribute('aria-label')),
	}).toStrictEqual({
		activeTab: 'true',
		confirmDisabled: true,
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
