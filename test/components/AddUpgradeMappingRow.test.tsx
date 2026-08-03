import {fireEvent, render, screen, within} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {describe, expect, test, vi} from 'vite-plus/test';

import {AddUpgradeMappingRow} from '../../src/components/blueprint/panels/transform/AddUpgradeMappingRow';

describe('AddUpgradeMappingRow', () => {
	test('offers independent empty source and target slots without guessing either endpoint', async () => {
		const user = userEvent.setup();
		const onSourceChoose = vi.fn<() => void>();
		const onTargetChoose = vi.fn<() => void>();
		render(<AddUpgradeMappingRow slotIndex={4} onSourceChoose={onSourceChoose} onTargetChoose={onTargetChoose} />);

		const row = screen.getByRole('group', {name: 'Empty mapping slot 5'});
		const source = screen.getByRole('button', {name: 'Choose source for new mapping'});
		const target = screen.getByRole('button', {name: 'Choose target for new mapping'});
		await user.click(source);
		await user.click(target);

		expect({
			operations: {
				source: onSourceChoose.mock.calls,
				target: onTargetChoose.mock.calls,
			},
			row: {
				className: row.className,
				draggable: row.getAttribute('draggable'),
				factorioSource: row.getAttribute('data-factorio-source'),
				mappingState: row.getAttribute('data-mapping-state'),
				text: row.textContent,
			},
			slots: {
				buttonCount: within(row).getAllByRole('button').length,
				sourceDisabled: source.getAttribute('aria-disabled'),
				sourceTooltip: source.getAttribute('title'),
				targetDisabled: target.getAttribute('aria-disabled'),
				targetTooltip: target.getAttribute('title'),
			},
		}).toStrictEqual({
			operations: {
				source: [[]],
				target: [[]],
			},
			row: {
				className: 'upgrade-mapping-grid__pair upgrade-mapping-grid__pair--empty',
				draggable: null,
				factorioSource: 'UpgradeItemGui::addEmptyMapper',
				mappingState: 'empty',
				text: '',
			},
			slots: {
				buttonCount: 2,
				sourceDisabled: 'false',
				sourceTooltip: null,
				targetDisabled: 'false',
				targetTooltip: null,
			},
		});
	});

	test('keeps empty slots fixed with no clear, delete, or reorder operations', async () => {
		const user = userEvent.setup();
		const onSourceChoose = vi.fn<() => void>();
		const onTargetChoose = vi.fn<() => void>();
		render(<AddUpgradeMappingRow slotIndex={0} onSourceChoose={onSourceChoose} onTargetChoose={onTargetChoose} />);

		const source = screen.getByRole('button', {name: 'Choose source for new mapping'});
		const target = screen.getByRole('button', {name: 'Choose target for new mapping'});
		fireEvent.contextMenu(source);
		fireEvent.contextMenu(target);
		source.focus();
		await user.keyboard('{Delete}');
		target.focus();
		await user.keyboard('{Backspace}');

		expect({
			operations: {
				source: onSourceChoose.mock.calls,
				target: onTargetChoose.mock.calls,
			},
		}).toStrictEqual({
			operations: {
				source: [],
				target: [],
			},
		});
	});
});
