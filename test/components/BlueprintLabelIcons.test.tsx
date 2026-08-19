import {fireEvent, render, screen} from '@testing-library/react';
import {expect, test, vi} from 'vite-plus/test';

import {BlueprintLabelIcons} from '../../src/components/blueprint/panels/transform/BlueprintLabelIcons';
import type {SignalID} from '../../src/parsing/types';

const icons: SignalID[] = [
	{type: 'item', name: 'transport-belt'},
	{type: 'virtual', name: 'signal-red'},
];

test.each(['Delete', 'Backspace'] as const)(
	'removes a label icon with %s instead of requiring a right-click',
	(key) => {
		const onChange = vi.fn<(nextIcons: SignalID[]) => void>();
		render(
			<BlueprintLabelIcons
				icons={icons}
				onChange={onChange}
				onChoose={vi.fn<(index: number) => void>()}
				signalTitle={(signal) => `${signal.type}:${signal.name}`}
			/>,
		);

		const icon = screen.getByRole('button', {name: 'Edit icon 1'});
		fireEvent.keyDown(icon, {key});

		expect({
			keyshortcuts: icon.getAttribute('aria-keyshortcuts'),
			onChangeCalls: onChange.mock.calls,
			tooltip: icon.getAttribute('title'),
		}).toStrictEqual({
			keyshortcuts: 'Delete Backspace',
			onChangeCalls: [[[{type: 'virtual', name: 'signal-red'}]]],
			tooltip: 'item:transport-belt',
		});
	},
);

test('keeps empty icon slots named and leaves removal shortcuts disabled', () => {
	render(
		<BlueprintLabelIcons
			icons={[]}
			onChange={vi.fn<(nextIcons: SignalID[]) => void>()}
			onChoose={vi.fn<(index: number) => void>()}
			signalTitle={(signal) => `${signal.type}:${signal.name}`}
		/>,
	);

	expect(
		screen.getAllByRole('button').map((button) => ({
			keyshortcuts: button.getAttribute('aria-keyshortcuts'),
			label: button.getAttribute('aria-label'),
			tooltip: button.getAttribute('title'),
		})),
	).toStrictEqual([
		{keyshortcuts: null, label: 'Choose icon 1', tooltip: 'Choose icon 1'},
		{keyshortcuts: null, label: 'Choose icon 2', tooltip: 'Choose icon 2'},
		{keyshortcuts: null, label: 'Choose icon 3', tooltip: 'Choose icon 3'},
		{keyshortcuts: null, label: 'Choose icon 4', tooltip: 'Choose icon 4'},
	]);
});
