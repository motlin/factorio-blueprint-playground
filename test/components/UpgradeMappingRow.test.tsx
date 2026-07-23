import {render, screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {describe, expect, test, vi} from 'vite-plus/test';

import {UpgradeMappingRow} from '../../src/components/blueprint/panels/transform/UpgradeMappingRow';
import type {SignalID, UpgradeSourceSignal} from '../../src/parsing/types';
import type {UpgradeCandidate} from '../../src/transform/upgradePlanner';

const beltMapping: UpgradeCandidate = {
	count: 4,
	from: {type: 'entity', name: 'transport-belt'},
	preserveQuality: true,
	to: {type: 'entity', name: 'fast-transport-belt'},
};

describe('UpgradeMappingRow', () => {
	test('exposes exact labels and supports every operation from the keyboard', async () => {
		const user = userEvent.setup();
		const onRemove = vi.fn<(candidate: UpgradeCandidate, manual: boolean) => void>();
		const onSourceChoose = vi.fn<(candidate: UpgradeCandidate) => void>();
		const onSourceQualityChange = vi.fn<(candidate: UpgradeCandidate, source: UpgradeSourceSignal) => void>();
		const onTargetChoose = vi.fn<(candidate: UpgradeCandidate) => void>();
		const onTargetQualityChange =
			vi.fn<(candidate: UpgradeCandidate, target: SignalID, preserveQuality: boolean) => void>();
		render(
			<ol>
				<UpgradeMappingRow
					candidate={beltMapping}
					manual
					onRemove={onRemove}
					onSourceChoose={onSourceChoose}
					onSourceQualityChange={onSourceQualityChange}
					onTargetChoose={onTargetChoose}
					onTargetQualityChange={onTargetQualityChange}
					sourceKey="entity:transport-belt:normal:="
				/>
			</ol>,
		);

		const row = screen.getByRole('listitem', {name: 'Mapping from Transport belt to Fast transport belt'});
		const source = screen.getByRole('button', {name: 'Choose source, currently Transport belt'});
		const target = screen.getByRole('button', {name: 'Choose target for Transport belt'});
		const remove = screen.getByRole('button', {name: 'Remove mapping from Transport belt'});
		source.focus();
		await user.keyboard('{Enter}');
		target.focus();
		await user.keyboard('{Enter}{Delete}');
		remove.focus();
		await user.keyboard('{Enter}');

		expect({
			attributes: {
				key: row.getAttribute('data-mapping-key'),
				removeShortcut: remove.getAttribute('aria-keyshortcuts'),
				removeTitle: remove.title,
				rowTitle: row.title,
				sourceTitle: source.title,
				targetTitle: target.title,
			},
			operations: {
				remove: onRemove.mock.calls,
				source: onSourceChoose.mock.calls,
				target: onTargetChoose.mock.calls,
			},
		}).toStrictEqual({
			attributes: {
				key: 'entity:transport-belt:normal:=',
				removeShortcut: 'Delete Backspace',
				removeTitle: 'Remove mapping from Transport belt',
				rowTitle: 'Transport belt → Fast transport belt',
				sourceTitle: 'Transport belt\nentity:transport-belt',
				targetTitle: 'Fast transport belt\nentity:fast-transport-belt',
			},
			operations: {
				remove: [
					[beltMapping, true],
					[beltMapping, true],
				],
				source: [[beltMapping]],
				target: [[beltMapping]],
			},
		});
	});
});
