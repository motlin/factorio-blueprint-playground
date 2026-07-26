import {fireEvent, render, screen, within} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {describe, expect, test, vi} from 'vite-plus/test';

import {UpgradeMappingRow} from '../../src/components/blueprint/panels/transform/UpgradeMappingRow';

describe('UpgradeMappingRow', () => {
	test('edits and clears endpoints independently while exposing keyboard reorder operations', async () => {
		const user = userEvent.setup();
		const onChooseSource = vi.fn<() => void>();
		const onChooseTarget = vi.fn<() => void>();
		const onClearSource = vi.fn<() => void>();
		const onClearTarget = vi.fn<() => void>();
		const onMoveEarlier = vi.fn<() => void>();
		const onMoveLater = vi.fn<() => void>();
		render(
			<ol>
				<UpgradeMappingRow
					count={0}
					from={{type: 'entity', name: 'transport-belt', quality: 'rare', comparator: '≤'}}
					mappingId="mapping-belt"
					slotIndex={2}
					to={{type: 'entity', name: 'fast-transport-belt', quality: 'normal'}}
					onChooseSource={onChooseSource}
					onChooseTarget={onChooseTarget}
					onClearSource={onClearSource}
					onClearTarget={onClearTarget}
					onDragStart={vi.fn<(event: React.DragEvent<HTMLLIElement>) => void>()}
					onDrop={vi.fn<(event: React.DragEvent<HTMLLIElement>) => void>()}
					onMoveEarlier={onMoveEarlier}
					onMoveLater={onMoveLater}
				/>
			</ol>,
		);

		const row = screen.getByRole('listitem', {name: 'Mapping from Transport belt to Fast transport belt'});
		const source = within(row).getByRole('button', {name: 'Choose source, currently Transport belt'});
		const target = within(row).getByRole('button', {name: 'Choose target for Transport belt'});
		await user.click(source);
		await user.click(target);
		fireEvent.contextMenu(source);
		target.focus();
		await user.keyboard('{Delete}');
		await user.click(within(row).getByRole('button', {name: 'Move mapping in slot 3 earlier'}));
		await user.click(within(row).getByRole('button', {name: 'Move mapping in slot 3 later'}));

		expect({
			attributes: {
				draggable: row.getAttribute('draggable'),
				key: row.getAttribute('data-mapping-key'),
				sourceTitle: source.title,
				targetTitle: target.title,
			},
			comparator: source.querySelector('.transform-signal-slot__comparator')?.textContent,
			operations: {
				chooseSource: onChooseSource.mock.calls,
				chooseTarget: onChooseTarget.mock.calls,
				clearSource: onClearSource.mock.calls,
				clearTarget: onClearTarget.mock.calls,
				moveEarlier: onMoveEarlier.mock.calls,
				moveLater: onMoveLater.mock.calls,
			},
		}).toStrictEqual({
			attributes: {
				draggable: 'true',
				key: 'mapping-belt',
				sourceTitle: 'Transport belt\nentity:transport-belt\nQuality: ≤ rare',
				targetTitle: 'Fast transport belt\nentity:fast-transport-belt\nQuality: = normal',
			},
			comparator: '≤',
			operations: {
				chooseSource: [[]],
				chooseTarget: [[]],
				clearSource: [[]],
				clearTarget: [[]],
				moveEarlier: [[]],
				moveLater: [[]],
			},
		});
	});

	test('keeps a target-only mapper clearable and independently source-editable', async () => {
		const user = userEvent.setup();
		const onChooseSource = vi.fn<() => void>();
		const onClearTarget = vi.fn<() => void>();
		render(
			<ol>
				<UpgradeMappingRow
					count={0}
					mappingId="mapping-target-only"
					slotIndex={0}
					to={{type: 'entity', name: 'fast-inserter', quality: 'rare'}}
					onChooseSource={onChooseSource}
					onChooseTarget={vi.fn<() => void>()}
					onClearSource={vi.fn<() => void>()}
					onClearTarget={onClearTarget}
					onDragStart={vi.fn<(event: React.DragEvent<HTMLLIElement>) => void>()}
					onDrop={vi.fn<(event: React.DragEvent<HTMLLIElement>) => void>()}
					onMoveLater={vi.fn<() => void>()}
				/>
			</ol>,
		);

		const row = screen.getByRole('listitem', {name: 'Incomplete mapping to Fast inserter'});
		await user.click(within(row).getByRole('button', {name: 'Choose source for mapping'}));
		fireEvent.contextMenu(within(row).getByRole('button', {name: 'Choose target, currently Fast inserter'}));

		expect({
			className: row.className,
			operations: {
				chooseSource: onChooseSource.mock.calls,
				clearTarget: onClearTarget.mock.calls,
			},
		}).toStrictEqual({
			className: 'upgrade-mapping-grid__pair upgrade-mapping-grid__pair--incomplete',
			operations: {
				chooseSource: [[]],
				clearTarget: [[]],
			},
		});
	});
});
