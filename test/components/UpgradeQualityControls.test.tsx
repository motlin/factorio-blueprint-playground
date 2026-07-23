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

		await user.selectOptions(screen.getByRole('combobox', {name: 'Source quality selection'}), 'epic');
		await user.selectOptions(screen.getByRole('combobox', {name: 'Quality comparison'}), '≤');

		expect({
			comparatorChanges: onComparatorChange.mock.calls,
			qualityChanges: onQualityChange.mock.calls,
			qualityOptions: screen
				.getAllByRole('option')
				.filter((option) => option.closest('[aria-label="Source quality selection"]') !== null)
				.map((option) => ({label: option.textContent, value: option.getAttribute('value')})),
		}).toStrictEqual({
			comparatorChanges: [['≤']],
			qualityChanges: [['epic']],
			qualityOptions: [
				{label: 'Any quality', value: 'any'},
				{label: 'Normal', value: 'normal'},
				{label: 'Uncommon', value: 'uncommon'},
				{label: 'Rare', value: 'rare'},
				{label: 'Epic', value: 'epic'},
				{label: 'Legendary', value: 'legendary'},
			],
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

		const qualitySelect = screen.getByRole('combobox', {name: 'Target quality selection'});
		await user.selectOptions(qualitySelect, 'legendary');

		expect({
			comparator: screen.queryByRole('combobox', {name: 'Quality comparison'}),
			options: screen.getAllByRole('option').map((option) => ({
				label: option.textContent,
				value: option.getAttribute('value'),
			})),
			qualityChanges: onQualityChange.mock.calls,
		}).toStrictEqual({
			comparator: null,
			options: [
				{label: 'Set as source', value: 'preserve'},
				{label: 'Normal', value: 'normal'},
				{label: 'Uncommon', value: 'uncommon'},
				{label: 'Rare', value: 'rare'},
				{label: 'Epic', value: 'epic'},
				{label: 'Legendary', value: 'legendary'},
			],
			qualityChanges: [['legendary']],
		});
	});
});
