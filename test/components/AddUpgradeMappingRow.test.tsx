import {render, screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {describe, expect, test, vi} from 'vite-plus/test';

import {AddUpgradeMappingRow} from '../../src/components/blueprint/panels/transform/AddUpgradeMappingRow';

describe('AddUpgradeMappingRow', () => {
	test('starts empty and exposes the source-only lifecycle from the keyboard', async () => {
		const user = userEvent.setup();
		const onRemove = vi.fn<() => void>();
		const onSourceChoose = vi.fn<() => void>();
		const onTargetChoose = vi.fn<() => void>();
		const {rerender} = render(
			<AddUpgradeMappingRow
				onRemove={onRemove}
				onSourceChoose={onSourceChoose}
				onTargetChoose={onTargetChoose}
			/>,
		);

		const emptyRow = screen.getByRole('group', {name: 'Add mapping'});
		const emptySource = screen.getByRole('button', {name: 'Choose source for new mapping'});
		const emptyTarget = screen.getByRole('button', {
			name: 'Choose a source before choosing a target',
		});
		await user.click(emptySource);
		await user.click(emptyTarget);

		expect({
			emptyRowText: emptyRow.textContent,
			remove: screen.queryByRole('button', {name: /Remove incomplete mapping/}),
			source: onSourceChoose.mock.calls,
			target: {
				disabled: emptyTarget.getAttribute('aria-disabled'),
				operations: onTargetChoose.mock.calls,
			},
		}).toStrictEqual({
			emptyRowText: '+→+—draft',
			remove: null,
			source: [[]],
			target: {
				disabled: 'true',
				operations: [],
			},
		});

		rerender(
			<AddUpgradeMappingRow
				source={{type: 'entity', name: 'transport-belt'}}
				onRemove={onRemove}
				onSourceChoose={onSourceChoose}
				onTargetChoose={onTargetChoose}
			/>,
		);

		const sourceOnlyRow = screen.getByRole('group', {name: 'Incomplete mapping from Transport belt'});
		const source = screen.getByRole('button', {name: 'Choose source, currently Transport belt'});
		const target = screen.getByRole('button', {name: 'Choose target for Transport belt'});
		const remove = screen.getByRole('button', {
			name: 'Remove incomplete mapping from Transport belt',
		});
		await user.click(source);
		target.focus();
		await user.keyboard('{Enter}{Delete}');
		await user.click(remove);

		expect({
			operations: {
				remove: onRemove.mock.calls,
				source: onSourceChoose.mock.calls,
				target: onTargetChoose.mock.calls,
			},
			row: {
				label: sourceOnlyRow.getAttribute('aria-label'),
				removeShortcut: remove.getAttribute('aria-keyshortcuts'),
				removeTitle: remove.title,
				sourceTitle: source.title,
				targetTitle: target.title,
			},
		}).toStrictEqual({
			operations: {
				remove: [[], []],
				source: [[], []],
				target: [[]],
			},
			row: {
				label: 'Incomplete mapping from Transport belt',
				removeShortcut: 'Delete Backspace',
				removeTitle: 'Remove incomplete mapping from Transport belt',
				sourceTitle: 'Transport belt\nentity:transport-belt',
				targetTitle: 'Choose target for Transport belt',
			},
		});
	});
});
