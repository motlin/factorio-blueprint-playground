import {fireEvent, render, screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {describe, expect, test, vi} from 'vite-plus/test';

import {
	AnyQualityPickerOption,
	UpgradeQualityControls,
} from '../../src/components/blueprint/panels/transform/UpgradeQualityControls';
import {
	initialUpgradeQualitySelection,
	qualitySelectorUsesDropdown,
	signalWithUpgradeQuality,
	type UpgradeQualitySelection,
} from '../../src/components/blueprint/panels/transform/upgradeQuality';
import type {QualityComparator} from '../../src/parsing/types';

const signal = {type: 'entity', name: 'transport-belt'} as const;

describe('AnyQualityPickerOption', () => {
	test('presents the Factorio Any-quality utility icon as one accessible choice', async () => {
		const user = userEvent.setup();
		const onClick = vi.fn<() => void>();
		render(
			<div role="menu" aria-label="Quality comparison">
				<AnyQualityPickerOption
					onClick={() => {
						onClick();
					}}
					selected
				/>
			</div>,
		);

		const option = screen.getByRole('menuitemradio', {name: 'Any quality'});
		const image = option.querySelector('img');
		expect({
			checked: option.getAttribute('aria-checked'),
			image: {
				alt: image?.getAttribute('alt'),
				draggable: image?.getAttribute('draggable'),
				source: image?.getAttribute('src'),
			},
			title: option.title,
		}).toStrictEqual({
			checked: 'true',
			image: {
				alt: '',
				draggable: 'false',
				source: 'https://factorio-icon-cdn.pages.dev/virtual-signal/signal-any-quality.webp',
			},
			title: 'Any quality',
		});

		await user.click(option);
		expect(onClick.mock.calls).toStrictEqual([[]]);
	});
});

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

	test('defaults From to Any quality and To to exact normal quality', () => {
		expect({
			existingSource: initialUpgradeQualitySelection({...signal, quality: 'rare'}, 'source'),
			newSource: initialUpgradeQualitySelection(undefined, 'source'),
			newTarget: initialUpgradeQualitySelection(undefined, 'target'),
		}).toStrictEqual({
			existingSource: 'rare',
			newSource: 'any',
			newTarget: 'normal',
		});
	});

	test('switches to the dropdown at the generated visible-quality threshold', () => {
		expect({
			atThreshold: qualitySelectorUsesDropdown(6),
			belowThreshold: qualitySelectorUsesDropdown(5),
		}).toStrictEqual({
			atThreshold: true,
			belowThreshold: false,
		});
		expect(() => qualitySelectorUsesDropdown(1.5)).toThrow('Visible quality count must be a nonnegative integer.');
	});
});

describe('UpgradeQualityControls', () => {
	test('offers the strict Factorio comparator order and confirms a staged condition', async () => {
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
		expect(screen.getByRole('dialog', {name: 'Quality comparison'}).getAttribute('aria-modal')).toBe('true');
		expect(
			screen
				.getAllByRole('menuitemradio')
				.map((button) => button.getAttribute('aria-label') ?? button.textContent),
		).toStrictEqual(['Any quality', '>', '<', '=', '≥', '≤', '≠']);
		expect({
			activeItem: document.activeElement?.getAttribute('aria-label') ?? document.activeElement?.textContent,
			setAsSource: screen.queryByRole('menuitemradio', {name: 'Set as Source'}),
		}).toStrictEqual({
			activeItem: '>',
			setAsSource: null,
		});
		await user.click(screen.getByRole('menuitemradio', {name: '≤'}));

		expect({
			comparatorControl: {
				condition: screen
					.getByRole('button', {name: 'Quality comparison: >'})
					.getAttribute('data-quality-condition'),
				controlStyle: screen
					.getByRole('button', {name: 'Quality comparison: >'})
					.getAttribute('data-factorio-control-style'),
				displayedValue: screen
					.getByRole('button', {name: 'Quality comparison: >'})
					.querySelector('.upgrade-quality-controls__comparator-value')?.textContent,
				pressed: screen.getByRole('button', {name: 'Quality comparison: >'}).getAttribute('aria-pressed'),
			},
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
			comparatorControl: {
				condition: '> rare',
				controlStyle: 'train_schedule_circuit_condition_comparator_dropdown',
				displayedValue: '>',
				pressed: null,
			},
			buttons: [
				{
					expanded: 'false',
					label: 'Quality comparison: >',
					pressed: null,
					title: 'Quality comparison: >',
				},
				{expanded: null, label: 'Normal quality', pressed: 'false', title: 'Quality: Normal'},
				{expanded: null, label: 'Uncommon quality', pressed: 'false', title: 'Quality: Uncommon'},
				{expanded: null, label: 'Rare quality', pressed: 'true', title: 'Quality: Rare'},
				{expanded: null, label: 'Epic quality', pressed: 'false', title: 'Quality: Epic'},
				{expanded: null, label: 'Legendary quality', pressed: 'false', title: 'Quality: Legendary'},
			],
			comparatorChanges: [['≤']],
			menu: null,
			qualityChanges: [['epic']],
		});
	});

	test('cancels the foreground comparator menu without changing the parent picker', async () => {
		const user = userEvent.setup();
		const onComparatorChange = vi.fn<(comparator: QualityComparator) => void>();
		const onQualityChange = vi.fn<(selection: UpgradeQualitySelection) => void>();
		render(
			<div role="dialog" aria-modal="true" aria-label="Signal picker">
				<UpgradeQualityControls
					mode="source"
					onComparatorChange={onComparatorChange}
					onQualityChange={onQualityChange}
					qualityComparator="="
					qualitySelection="rare"
				/>
			</div>,
		);

		const parentPicker = screen.getByRole('dialog', {name: 'Signal picker'});
		const toggle = screen.getByRole('button', {name: 'Quality comparison: ='});
		await user.click(toggle);
		expect(parentPicker.inert).toBe(true);
		fireEvent.keyDown(window, {key: 'Escape'});
		await Promise.resolve();

		expect({
			comparatorChanges: onComparatorChange.mock.calls,
			menu: screen.queryByRole('dialog', {name: 'Quality comparison'}),
			parentInert: parentPicker.inert,
			qualityChanges: onQualityChange.mock.calls,
			restoredFocus: document.activeElement === toggle,
		}).toStrictEqual({
			comparatorChanges: [],
			menu: null,
			parentInert: false,
			qualityChanges: [],
			restoredFocus: true,
		});
	});

	test('matches pointer and keyboard selection while leaving navigation and cancellation uncommitted', async () => {
		const user = userEvent.setup();
		const onComparatorChange = vi.fn<(comparator: QualityComparator) => void>();
		const onQualityChange = vi.fn<(selection: UpgradeQualitySelection) => void>();
		render(
			<UpgradeQualityControls
				mode="source"
				onComparatorChange={onComparatorChange}
				onQualityChange={onQualityChange}
				qualityComparator="="
				qualitySelection="rare"
			/>,
		);

		const toggle = screen.getByRole('button', {name: 'Quality comparison: ='});
		vi.spyOn(toggle, 'getBoundingClientRect').mockReturnValue({
			bottom: 728,
			height: 28,
			left: 24,
			right: 68,
			top: 700,
			width: 44,
			x: 24,
			y: 700,
			toJSON: () => undefined,
		});
		await user.click(toggle);
		const comparisonDialog = screen.getByRole('dialog', {name: 'Quality comparison'});
		const equals = screen.getByRole('menuitemradio', {name: '='});
		expect({
			activeItem: document.activeElement === equals,
			bottom: comparisonDialog.style.bottom,
			left: comparisonDialog.style.left,
			placement: comparisonDialog.getAttribute('data-placement'),
			width: comparisonDialog.style.width,
		}).toStrictEqual({
			activeItem: true,
			bottom: '68px',
			left: '24px',
			placement: 'above',
			width: '44px',
		});

		await user.keyboard('{ArrowDown}{Home}{End}{ArrowUp}');
		expect({
			activeItem: document.activeElement?.textContent,
			comparatorChanges: onComparatorChange.mock.calls,
			qualityChanges: onQualityChange.mock.calls,
		}).toStrictEqual({
			activeItem: '≤',
			comparatorChanges: [],
			qualityChanges: [],
		});
		await user.keyboard('{Enter}');
		await Promise.resolve();
		expect({
			comparatorChanges: onComparatorChange.mock.calls,
			menu: screen.queryByRole('menu', {name: 'Quality comparison'}),
			qualityChanges: onQualityChange.mock.calls,
			restoredFocus: document.activeElement === toggle,
		}).toStrictEqual({
			comparatorChanges: [['≤']],
			menu: null,
			qualityChanges: [],
			restoredFocus: true,
		});

		await user.click(toggle);
		const selectedComparator = screen.getByRole('menuitemradio', {name: '='});
		await user.click(selectedComparator);
		expect(onComparatorChange.mock.calls).toStrictEqual([['≤']]);

		await user.click(toggle);
		fireEvent.pointerDown(document.querySelector<HTMLElement>('.upgrade-quality-controls__menu-layer')!);
		await Promise.resolve();
		expect({
			comparatorChanges: onComparatorChange.mock.calls,
			menu: screen.queryByRole('menu', {name: 'Quality comparison'}),
			qualityChanges: onQualityChange.mock.calls,
			restoredFocus: document.activeElement === toggle,
		}).toStrictEqual({
			comparatorChanges: [['≤']],
			menu: null,
			qualityChanges: [],
			restoredFocus: true,
		});
	});

	test('uses the Any sentinel first and restores normal when a comparator is chosen from Any', async () => {
		const user = userEvent.setup();
		const onComparatorChange = vi.fn<(comparator: QualityComparator) => void>();
		const onQualityChange = vi.fn<(selection: UpgradeQualitySelection) => void>();
		render(
			<UpgradeQualityControls
				mode="source"
				onComparatorChange={onComparatorChange}
				onQualityChange={onQualityChange}
				qualityComparator="="
				qualitySelection="any"
			/>,
		);

		const comparisonControl = screen.getByRole('button', {name: 'Quality comparison: any'});
		expect({
			condition: comparisonControl.getAttribute('data-quality-condition'),
			controlStyle: comparisonControl.getAttribute('data-factorio-control-style'),
			label: comparisonControl.getAttribute('aria-label'),
			pressed: comparisonControl.getAttribute('aria-pressed'),
			text: comparisonControl.textContent,
		}).toStrictEqual({
			condition: 'any',
			controlStyle: 'train_schedule_circuit_condition_comparator_dropdown',
			label: 'Quality comparison: any',
			pressed: null,
			text: 'Any▾',
		});
		await user.click(comparisonControl);
		await user.click(screen.getByRole('menuitemradio', {name: '>'}));

		expect({
			comparatorChanges: onComparatorChange.mock.calls,
			qualityChanges: onQualityChange.mock.calls,
		}).toStrictEqual({
			comparatorChanges: [['>']],
			qualityChanges: [['normal']],
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

		const qualityControls = screen.getByRole('group', {name: 'Target quality'});
		expect({
			buttons: screen.getAllByRole('button').map((button) => {
				const image = button.querySelector('img');
				return {
					image: image?.getAttribute('src'),
					label: button.getAttribute('aria-label'),
					pressed: button.getAttribute('aria-pressed'),
					title: button.title,
				};
			}),
			comparator: screen.queryByRole('button', {name: /Quality comparison/}),
			mode: qualityControls.getAttribute('data-quality-selector-mode'),
			qualityChanges: onQualityChange.mock.calls,
			textDropdown: screen.queryByRole('combobox', {name: 'Quality'}),
		}).toStrictEqual({
			buttons: [
				{
					image: 'https://factorio-icon-cdn.pages.dev/quality/normal.webp',
					label: 'Normal quality',
					pressed: 'true',
					title: 'Quality: Normal',
				},
				{
					image: 'https://factorio-icon-cdn.pages.dev/quality/uncommon.webp',
					label: 'Uncommon quality',
					pressed: 'false',
					title: 'Quality: Uncommon',
				},
				{
					image: 'https://factorio-icon-cdn.pages.dev/quality/rare.webp',
					label: 'Rare quality',
					pressed: 'false',
					title: 'Quality: Rare',
				},
				{
					image: 'https://factorio-icon-cdn.pages.dev/quality/epic.webp',
					label: 'Epic quality',
					pressed: 'false',
					title: 'Quality: Epic',
				},
				{
					image: 'https://factorio-icon-cdn.pages.dev/quality/legendary.webp',
					label: 'Legendary quality',
					pressed: 'false',
					title: 'Quality: Legendary',
				},
			],
			comparator: null,
			mode: 'buttons',
			qualityChanges: [['legendary']],
			textDropdown: null,
		});
	});
});
