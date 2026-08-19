import {fireEvent, render, screen, within} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {beforeEach, describe, expect, test, vi} from 'vite-plus/test';

import {BlueprintRecordViews} from '../../src/components/library/BlueprintRecordViews';
import {
	BLUEPRINT_RECORD_VIEW_STORAGE_KEY,
	filterAndSortBlueprintRecords,
} from '../../src/components/library/blueprintRecordModel';
import type {LibraryRecord} from '../../src/storage/db';

const records: LibraryRecord[] = [
	{
		id: 'book',
		createdOn: 0,
		updatedOn: 0,
		data: 'book-data',
		gameData: {
			type: 'blueprint_book',
			label: 'Factory books',
			description: 'Nested rail and production books.',
			icons: [{type: 'item', name: 'blueprint-book'}],
		},
		parentId: '__library_root',
		position: 1,
	},
	{
		id: 'blueprint-first',
		createdOn: 1,
		updatedOn: 1,
		data: 'blueprint-data',
		gameData: {
			type: 'blueprint',
			label: 'Quality factory',
			description: 'Builds modules.',
			icons: [{type: 'item', name: 'assembling-machine-3', quality: 'legendary'}],
		},
		parentId: '__library_root',
		position: 0,
	},
	{
		id: 'planner',
		createdOn: 2,
		updatedOn: 2,
		data: 'planner-data',
		gameData: {
			type: 'upgrade_planner',
			label: 'Tier changes',
			description: 'Upgrades every transport belt.',
			icons: [],
		},
		parentId: '__library_root',
		position: 0,
	},
];

const comparePosition = (left: LibraryRecord, right: LibraryRecord) => left.position - right.position;

const storedPreferences = new Map<string, string>();
const localStorage = {
	clear: () => {
		storedPreferences.clear();
	},
	getItem: (key: string) => storedPreferences.get(key) ?? null,
	setItem: (key: string, value: string) => {
		storedPreferences.set(key, value);
	},
};

beforeEach(() => {
	Object.defineProperty(window, 'localStorage', {configurable: true, value: localStorage});
	window.localStorage.clear();
});

describe('BlueprintRecordViews', () => {
	test('keeps equal records stable while filtering labels and descriptions', () => {
		expect({
			descriptionMatch: filterAndSortBlueprintRecords(records, 'transport', comparePosition).map(
				(record) => record.id,
			),
			labelMatch: filterAndSortBlueprintRecords(records, 'FACTORY', comparePosition).map((record) => record.id),
			sorted: filterAndSortBlueprintRecords(records, '', comparePosition).map((record) => record.id),
		}).toStrictEqual({
			descriptionMatch: ['planner'],
			labelMatch: ['blueprint-first', 'book'],
			sorted: ['blueprint-first', 'planner', 'book'],
		});
	});

	test('persists only the selected presentation and restores it on the next mount', async () => {
		const user = userEvent.setup();
		const {unmount} = render(
			<BlueprintRecordViews
				aria-label="Blueprint records"
				records={records}
				compareRecords={comparePosition}
				onActivate={() => undefined}
			/>,
		);

		await user.type(screen.getByRole('searchbox', {name: 'Search blueprint records'}), 'transport');
		await user.click(screen.getByRole('button', {name: 'Grid view'}));
		expect({
			persisted: window.localStorage.getItem(BLUEPRINT_RECORD_VIEW_STORAGE_KEY),
			visibleRecords: within(screen.getByRole('region', {name: 'Blueprint records'}))
				.getAllByRole('button')
				.map((button) => button.getAttribute('aria-label')),
			viewClass: screen.getByRole('list').className,
		}).toStrictEqual({
			persisted: 'grid',
			visibleRecords: ['Tier changes'],
			viewClass: 'blueprint-record-views__items blueprint-record-views__items--grid',
		});

		unmount();
		render(
			<BlueprintRecordViews
				aria-label="Blueprint records"
				records={records}
				compareRecords={comparePosition}
				onActivate={() => undefined}
			/>,
		);
		expect({
			search: screen.getByRole('searchbox', {name: 'Search blueprint records'}).getAttribute('value'),
			viewClass: screen.getByRole('list').className,
		}).toStrictEqual({
			search: '',
			viewClass: 'blueprint-record-views__items blueprint-record-views__items--grid',
		});
	});

	test('uses one item contract for view modes, quality icons, tooltips, and type descriptions', async () => {
		const user = userEvent.setup();
		render(
			<BlueprintRecordViews
				aria-label="Blueprint records"
				records={records}
				compareRecords={comparePosition}
				onActivate={() => undefined}
			/>,
		);

		const blueprintButton = screen.getByRole('button', {name: 'Quality factory'});
		const tooltipId = blueprintButton.getAttribute('aria-describedby');
		expect({
			description: document.getElementById(tooltipId ?? '')?.textContent,
			listDescription: blueprintButton.textContent,
			quality: within(blueprintButton).getByAltText('Legendary quality').getAttribute('src'),
		}).toStrictEqual({
			description: 'Quality factoryBlueprintBuilds modules.',
			listDescription: 'Quality factoryBuilds modules.Quality factoryBlueprintBuilds modules.',
			quality: 'https://factorio-icon-cdn.pages.dev/quality/legendary.webp',
		});

		await user.click(screen.getByRole('button', {name: 'Slot view'}));
		expect(
			screen.getByRole('button', {name: 'Quality factory'}).querySelector('.blueprint-record-item__text'),
		).toBeNull();
		expect(
			screen.getByRole('button', {name: 'Open book Factory books'}).getAttribute('aria-describedby'),
		).not.toBeNull();
	});

	test('supports roving focus, actionability, activation, and Escape navigation', () => {
		const onActivate = vi.fn<(record: LibraryRecord) => void>();
		const onEscape = vi.fn<() => void>();
		render(
			<BlueprintRecordViews
				aria-label="Blueprint records"
				records={records}
				compareRecords={comparePosition}
				isRecordActionable={(record) => record.gameData.type === 'blueprint_book'}
				onActivate={onActivate}
				onEscape={onEscape}
			/>,
		);

		const firstRecord = screen.getByRole('button', {name: 'Quality factory'});
		firstRecord.focus();
		fireEvent.keyDown(firstRecord, {key: 'ArrowDown'});
		expect(document.activeElement).toBe(screen.getByRole('button', {name: 'Tier changes'}));
		fireEvent.click(document.activeElement as HTMLElement);
		expect(onActivate).not.toHaveBeenCalled();

		fireEvent.keyDown(document.activeElement as HTMLElement, {key: 'End'});
		const bookButton = screen.getByRole('button', {name: 'Open book Factory books'});
		expect(document.activeElement).toBe(bookButton);
		fireEvent.click(bookButton);
		fireEvent.keyDown(bookButton, {key: 'Escape'});
		expect({
			activated: onActivate.mock.calls.map(([record]) => record.id),
			escaped: onEscape.mock.calls.length,
		}).toStrictEqual({activated: ['book'], escaped: 1});
	});
});
