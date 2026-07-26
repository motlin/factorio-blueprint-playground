import {fireEvent, render, screen, within} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {describe, expect, test, vi} from 'vite-plus/test';

import {UpgradeMappingRow} from '../../src/components/blueprint/panels/transform/UpgradeMappingRow';
import type {UpgradeCandidate} from '../../src/transform/upgradePlanner';

const beltMapping: UpgradeCandidate = {
	count: 4,
	from: {type: 'entity', name: 'transport-belt', quality: 'rare', comparator: '≤'},
	preserveQuality: false,
	to: {type: 'entity', name: 'fast-transport-belt', quality: 'normal'},
};

describe('UpgradeMappingRow', () => {
	test('uses compact slots and supports choosing or clearing a mapping', async () => {
		const user = userEvent.setup();
		const onRemove = vi.fn<(candidate: UpgradeCandidate, manual: boolean) => void>();
		const onSourceChoose = vi.fn<(candidate: UpgradeCandidate) => void>();
		const onTargetChoose = vi.fn<(candidate: UpgradeCandidate) => void>();
		render(
			<ol>
				<UpgradeMappingRow
					candidate={beltMapping}
					manual
					onRemove={onRemove}
					onSourceChoose={onSourceChoose}
					onTargetChoose={onTargetChoose}
					sourceKey="entity:transport-belt:rare:≤"
				/>
			</ol>,
		);

		const row = screen.getByRole('listitem', {name: 'Mapping from Transport belt to Fast transport belt'});
		const source = screen.getByRole('button', {name: 'Choose source, currently Transport belt'});
		const target = screen.getByRole('button', {name: 'Choose target for Transport belt'});
		await user.click(source);
		await user.click(target);
		fireEvent.contextMenu(target);
		target.focus();
		await user.keyboard('{Delete}');

		expect({
			attributes: {
				key: row.getAttribute('data-mapping-key'),
				rowTitle: row.title,
				sourceClass: source.className,
				sourceTitle: source.title,
				targetTitle: target.title,
			},
			comparator: source.querySelector('.transform-signal-slot__comparator')?.textContent,
			qualityControlAdjacentToEndpoints: within(row).queryByRole('combobox', {name: /quality/i}),
			operations: {
				remove: onRemove.mock.calls,
				source: onSourceChoose.mock.calls,
				target: onTargetChoose.mock.calls,
			},
		}).toStrictEqual({
			attributes: {
				key: 'entity:transport-belt:rare:≤',
				rowTitle: 'Transport belt → Fast transport belt',
				sourceClass: 'factorio-inventory-slot transform-signal-slot transform-signal-slot--condition',
				sourceTitle: 'Transport belt\nentity:transport-belt\nQuality: ≤ rare',
				targetTitle: 'Fast transport belt\nentity:fast-transport-belt\nQuality: = normal',
			},
			comparator: '≤',
			qualityControlAdjacentToEndpoints: null,
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
