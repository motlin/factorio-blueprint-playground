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

	test.each([
		['source', 'any'],
		['target', 'preserve'],
	] as const)('omits the %s sentinel from planner mapping JSON', (mode, qualitySelection) => {
		expect(
			signalWithUpgradeQuality({...signal, comparator: '>', quality: 'epic'}, mode, qualitySelection, '>'),
		).toStrictEqual(signal);
	});
});

describe('UpgradeQualityControls', () => {
	test('edits a mapping source quality and comparator', async () => {
		const user = userEvent.setup();
		const onComparatorChange = vi.fn<(comparator: QualityComparator) => void>();
		const onQualityChange = vi.fn<(selection: UpgradeQualitySelection) => void>();
		render(
			<UpgradeQualityControls
				layout="mapping"
				mode="source"
				onComparatorChange={onComparatorChange}
				onQualityChange={onQualityChange}
				qualityComparator=">"
				qualitySelection="rare"
			/>,
		);

		await user.click(screen.getByRole('button', {name: 'Epic quality'}));
		await user.selectOptions(screen.getByRole('combobox', {name: 'Quality comparison'}), '≤');

		const comparatorSelect = screen.getByRole<HTMLSelectElement>('combobox', {name: 'Quality comparison'});
		expect({
			buttons: screen.getAllByRole('button').map((button) => ({
				label: button.getAttribute('aria-label'),
				pressed: button.getAttribute('aria-pressed'),
				title: button.title,
			})),
			comparatorChanges: onComparatorChange.mock.calls,
			comparatorLabel: comparatorSelect.labels[0].firstElementChild?.textContent,
			comparatorLabelElement: comparatorSelect.labels[0].tagName,
			qualityChanges: onQualityChange.mock.calls,
		}).toStrictEqual({
			buttons: [
				{label: 'Any quality', pressed: 'false', title: 'Any quality'},
				{label: 'Normal quality', pressed: 'false', title: 'Normal quality'},
				{label: 'Uncommon quality', pressed: 'false', title: 'Uncommon quality'},
				{label: 'Rare quality', pressed: 'true', title: 'Rare quality'},
				{label: 'Epic quality', pressed: 'false', title: 'Epic quality'},
				{label: 'Legendary quality', pressed: 'false', title: 'Legendary quality'},
			],
			comparatorChanges: [['≤']],
			comparatorLabel: 'Quality comparison',
			comparatorLabelElement: 'LABEL',
			qualityChanges: [['epic']],
		});
	});

	test('offers preserve source and explicit qualities for a mapping target', async () => {
		const user = userEvent.setup();
		const onQualityChange = vi.fn<(selection: UpgradeQualitySelection) => void>();
		render(
			<UpgradeQualityControls
				layout="mapping"
				mode="target"
				onQualityChange={onQualityChange}
				qualityComparator="="
				qualitySelection="preserve"
			/>,
		);

		await user.click(screen.getByRole('button', {name: 'Legendary quality'}));

		expect({
			buttons: screen.getAllByRole('button').map((button) => ({
				label: button.getAttribute('aria-label'),
				pressed: button.getAttribute('aria-pressed'),
				title: button.title,
			})),
			comparator: screen.queryByRole('combobox', {name: 'Quality comparison'}),
			qualityChanges: onQualityChange.mock.calls,
		}).toStrictEqual({
			buttons: [
				{label: 'Set as source', pressed: 'true', title: 'Set as source'},
				{label: 'Normal quality', pressed: 'false', title: 'Normal quality'},
				{label: 'Uncommon quality', pressed: 'false', title: 'Uncommon quality'},
				{label: 'Rare quality', pressed: 'false', title: 'Rare quality'},
				{label: 'Epic quality', pressed: 'false', title: 'Epic quality'},
				{label: 'Legendary quality', pressed: 'false', title: 'Legendary quality'},
			],
			comparator: null,
			qualityChanges: [['legendary']],
		});
	});
});
