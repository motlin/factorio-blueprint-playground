import {render, screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {describe, expect, test, vi} from 'vite-plus/test';

import {AddUpgradeMappingRow} from '../../src/components/blueprint/panels/transform/AddUpgradeMappingRow';

describe('AddUpgradeMappingRow', () => {
	test('offers independent empty source and target slots without guessing either endpoint', async () => {
		const user = userEvent.setup();
		const onSourceChoose = vi.fn<() => void>();
		const onTargetChoose = vi.fn<() => void>();
		render(
			<AddUpgradeMappingRow
				slotIndex={4}
				onDrop={vi.fn<(event: React.DragEvent<HTMLDivElement>) => void>()}
				onSourceChoose={onSourceChoose}
				onTargetChoose={onTargetChoose}
			/>,
		);

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
				text: row.textContent,
			},
			slots: {
				sourceDisabled: source.getAttribute('aria-disabled'),
				targetDisabled: target.getAttribute('aria-disabled'),
			},
		}).toStrictEqual({
			operations: {
				source: [[]],
				target: [[]],
			},
			row: {
				className: 'upgrade-mapping-grid__pair upgrade-mapping-grid__pair--empty',
				text: '',
			},
			slots: {
				sourceDisabled: 'false',
				targetDisabled: 'false',
			},
		});
	});
});
