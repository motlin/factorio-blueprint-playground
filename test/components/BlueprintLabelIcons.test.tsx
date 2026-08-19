import {fireEvent, render, screen, within} from '@testing-library/react';
import {expect, test, vi} from 'vite-plus/test';

import {BlueprintLabelIcons} from '../../src/components/blueprint/panels/transform/BlueprintLabelIcons';
import type {SignalID} from '../../src/parsing/types';

const icons: Array<SignalID | undefined> = [
	{type: 'item', name: 'transport-belt', quality: 'rare'},
	undefined,
	{type: 'virtual', name: 'signal-red'},
	undefined,
];

test.each(['Delete', 'Backspace'] as const)(
	'clears a label icon in place with %s instead of compacting later slots',
	(key) => {
		const onChange = vi.fn<(nextIcons: Array<SignalID | undefined>) => void>();
		render(
			<BlueprintLabelIcons
				icons={icons}
				itemName="blueprint"
				onChange={onChange}
				onChoose={vi.fn<(index: number) => void>()}
				signalTitle={(signal) => `${signal.type}:${signal.name}`}
			/>,
		);

		const icon = screen.getByRole('button', {name: 'Edit icon 1'});
		fireEvent.keyDown(icon, {key});

		expect({
			keyshortcuts: icon.getAttribute('aria-keyshortcuts'),
			onChangeCalls: onChange.mock.calls,
			tooltip: icon.getAttribute('title'),
		}).toStrictEqual({
			keyshortcuts: 'Delete Backspace',
			onChangeCalls: [[[undefined, undefined, {type: 'virtual', name: 'signal-red'}, undefined]]],
			tooltip: 'item:transport-belt',
		});
	},
);

test('renders the item-backed composite and four independently addressable signal slots', () => {
	const onChange = vi.fn<(nextIcons: Array<SignalID | undefined>) => void>();
	const onChoose = vi.fn<(index: number) => void>();
	render(
		<BlueprintLabelIcons
			icons={icons}
			itemName="blueprint-book"
			onChange={onChange}
			onChoose={onChoose}
			signalTitle={(signal) => `${signal.type}:${signal.name}`}
		/>,
	);

	const preview = screen.getByRole('img', {name: 'Blueprint book icon preview'});
	const previewImages = within(preview).getAllByTestId('icon');
	const slots = within(screen.getByRole('group', {name: 'Blueprint book preview icon slots'})).getAllByRole('button');
	expect({
		baseIcon: previewImages[0]?.getAttribute('src'),
		factorioSources: [
			preview.parentElement?.getAttribute('data-factorio-source'),
			preview.getAttribute('data-factorio-source'),
			screen.getByRole('group', {name: 'Blueprint book preview icon slots'}).getAttribute('data-factorio-source'),
		],
		previewCount: preview.getAttribute('data-preview-icon-count'),
		previewIcons: previewImages.slice(1).map((image) => image.getAttribute('src')),
		recordType: preview.getAttribute('data-record-type'),
		slots: slots.map((button) => ({
			index: button.getAttribute('data-icon-slot-index'),
			keyshortcuts: button.getAttribute('aria-keyshortcuts'),
			label: button.getAttribute('aria-label'),
			tooltip: button.getAttribute('title'),
		})),
	}).toStrictEqual({
		baseIcon: 'https://factorio-icon-cdn.pages.dev/item/blueprint-book.webp',
		factorioSources: [
			'BlueprintSettingsGui::makePreviewIconFrame',
			'PreviewIcons::drawWithItemIcon',
			'BlueprintSettingsGui::makePreviewTable',
		],
		previewCount: '2',
		previewIcons: [
			'https://factorio-icon-cdn.pages.dev/item/transport-belt.webp',
			'https://factorio-icon-cdn.pages.dev/virtual-signal/signal-red.webp',
		],
		recordType: 'blueprint_book',
		slots: [
			{index: '1', keyshortcuts: 'Delete Backspace', label: 'Edit icon 1', tooltip: 'item:transport-belt'},
			{index: '2', keyshortcuts: null, label: 'Choose icon 2', tooltip: 'Choose icon 2'},
			{index: '3', keyshortcuts: 'Delete Backspace', label: 'Edit icon 3', tooltip: 'virtual:signal-red'},
			{index: '4', keyshortcuts: null, label: 'Choose icon 4', tooltip: 'Choose icon 4'},
		],
	});
	expect(within(slots[0]).getByTestId('quality').getAttribute('src')).toBe(
		'https://factorio-icon-cdn.pages.dev/quality/rare.webp',
	);
	expect(screen.queryByRole('button', {name: /move|up|down/i})).toBeNull();

	fireEvent.click(slots[1]);
	fireEvent.contextMenu(slots[2]);
	expect({onChange: onChange.mock.calls, onChoose: onChoose.mock.calls}).toStrictEqual({
		onChange: [[[icons[0], undefined, undefined, undefined]]],
		onChoose: [[1]],
	});
});

test('keeps all empty slots named and leaves removal shortcuts disabled', () => {
	render(
		<BlueprintLabelIcons
			icons={[]}
			itemName="blueprint"
			onChange={vi.fn<(nextIcons: Array<SignalID | undefined>) => void>()}
			onChoose={vi.fn<(index: number) => void>()}
			signalTitle={(signal) => `${signal.type}:${signal.name}`}
		/>,
	);

	expect(
		screen.getAllByRole('button').map((button) => ({
			keyshortcuts: button.getAttribute('aria-keyshortcuts'),
			label: button.getAttribute('aria-label'),
			tooltip: button.getAttribute('title'),
		})),
	).toStrictEqual([
		{keyshortcuts: null, label: 'Choose icon 1', tooltip: 'Choose icon 1'},
		{keyshortcuts: null, label: 'Choose icon 2', tooltip: 'Choose icon 2'},
		{keyshortcuts: null, label: 'Choose icon 3', tooltip: 'Choose icon 3'},
		{keyshortcuts: null, label: 'Choose icon 4', tooltip: 'Choose icon 4'},
	]);
});
