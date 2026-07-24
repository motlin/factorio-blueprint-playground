import {render, screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {describe, expect, test, vi} from 'vite-plus/test';

import {UpgradeQualityControls} from '../../src/components/blueprint/panels/transform/UpgradeQualityControls';
import {
	signalWithUpgradeQuality,
	type UpgradeQualitySelection,
} from '../../src/components/blueprint/panels/transform/upgradeQuality';
import type {QualityComparator} from '../../src/parsing/types';

const signal = {type: 'entity', name: 'transport-belt'} as const;

describe('signalWithUpgradeQuality', () => {
	test.each(['=', '≠', '<', '≤', '>', '≥'] as const)('serializes source quality comparator %s', (comparator) => {
		expect(signalWithUpgradeQuality(signal, 'source', 'rare', comparator)).toStrictEqual({
			...signal,
			comparator,
			quality: 'rare',
		});
	});

	test.each(['normal', 'uncommon', 'rare', 'epic', 'legendary'] as const)(
		'serializes explicit target quality %s',
		(quality) => {
			expect(signalWithUpgradeQuality(signal, 'target', quality, '=')).toStrictEqual({
				...signal,
				quality,
			});
		},
	);

	test('omits a source quality condition when any quality is selected', () => {
		expect(
			signalWithUpgradeQuality({...signal, comparator: '>', quality: 'epic'}, 'source', 'any', '>'),
		).toStrictEqual(signal);
	});

	test('requires an explicit target quality', () => {
		expect(() => signalWithUpgradeQuality(signal, 'target', 'any', '=')).toThrow(
			'Target quality selection must be explicit.',
		);
	});
});

describe('UpgradeQualityControls', () => {
	test('offers the Factorio source quality condition and comparator menu', async () => {
		const user = userEvent.setup();
		const onComparatorChange = vi.fn<(comparator: QualityComparator) => void>();
		const onQualityChange = vi.fn<(selection: UpgradeQualitySelection) => void>();
		render(
			<UpgradeQualityControls
				mode="source"
				onComparatorChange={onComparatorChange}
				onQualityChange={onQualityChange}
				qualityComparator=">"
				qualitySelection="rare"
			/>,
		);

		await user.click(screen.getByRole('button', {name: 'Epic quality'}));
		await user.click(screen.getByRole('button', {name: 'Quality comparison: >'}));
		await user.click(screen.getByRole('menuitemradio', {name: '≤'}));

		expect({
			buttons: screen.getAllByRole('button').map((button) => ({
				expanded: button.getAttribute('aria-expanded'),
				label: button.getAttribute('aria-label'),
				pressed: button.getAttribute('aria-pressed'),
				title: button.title,
			})),
			comparatorChanges: onComparatorChange.mock.calls,
			menu: screen.queryByRole('menu', {name: 'Quality comparison'}),
			qualityChanges: onQualityChange.mock.calls,
		}).toStrictEqual({
			buttons: [
				{expanded: null, label: 'Any quality', pressed: 'false', title: 'Any quality'},
				{expanded: 'false', label: 'Quality comparison: >', pressed: null, title: 'Quality comparison: >'},
				{expanded: null, label: 'Normal quality', pressed: 'false', title: 'Normal quality'},
				{expanded: null, label: 'Uncommon quality', pressed: 'false', title: 'Uncommon quality'},
				{expanded: null, label: 'Rare quality', pressed: 'true', title: 'Rare quality'},
				{expanded: null, label: 'Epic quality', pressed: 'false', title: 'Epic quality'},
				{expanded: null, label: 'Legendary quality', pressed: 'false', title: 'Legendary quality'},
			],
			comparatorChanges: [['≤']],
			menu: null,
			qualityChanges: [['epic']],
		});
	});

	test('offers only exact qualities for a target', async () => {
		const user = userEvent.setup();
		const onQualityChange = vi.fn<(selection: UpgradeQualitySelection) => void>();
		render(
			<UpgradeQualityControls
				mode="target"
				onQualityChange={onQualityChange}
				qualityComparator="="
				qualitySelection="normal"
			/>,
		);

		await user.click(screen.getByRole('button', {name: 'Legendary quality'}));

		expect({
			buttons: screen.getAllByRole('button').map((button) => ({
				label: button.getAttribute('aria-label'),
				pressed: button.getAttribute('aria-pressed'),
				title: button.title,
			})),
			qualityChanges: onQualityChange.mock.calls,
		}).toStrictEqual({
			buttons: [
				{label: 'Normal quality', pressed: 'true', title: 'Normal quality'},
				{label: 'Uncommon quality', pressed: 'false', title: 'Uncommon quality'},
				{label: 'Rare quality', pressed: 'false', title: 'Rare quality'},
				{label: 'Epic quality', pressed: 'false', title: 'Epic quality'},
				{label: 'Legendary quality', pressed: 'false', title: 'Legendary quality'},
			],
			qualityChanges: [['legendary']],
		});
	});
});
