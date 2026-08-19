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

const gridRecords = Array.from(
	{length: 8},
	(_, index): LibraryRecord => ({
		...records[1],
		id: `grid-blueprint-${(index + 1).toString()}`,
		createdOn: index,
		updatedOn: index,
		gameData: {
			...records[1].gameData,
			label: `Grid blueprint ${(index + 1).toString()}`,
		},
		position: index,
	}),
);

const slotRecords = Array.from(
	{length: 12},
	(_, index): LibraryRecord => ({
		...records[1],
		id: `slot-blueprint-${(index + 1).toString()}`,
		createdOn: index,
		updatedOn: index,
		gameData: {
			...records[1].gameData,
			label: `Slot blueprint ${(index + 1).toString()}`,
		},
		position: index,
	}),
);

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

		await user.click(screen.getByRole('button', {name: 'Search blueprint records'}));
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
			search: screen.queryByRole('searchbox'),
			searchExpanded: screen
				.getByRole('button', {name: 'Search blueprint records'})
				.getAttribute('aria-expanded'),
			viewClass: screen.getByRole('list').className,
		}).toStrictEqual({
			search: null,
			searchExpanded: 'false',
			viewClass: 'blueprint-record-views__items blueprint-record-views__items--grid',
		});
	});

	test('uses a source-faithful search popup while preserving matching record identity and focus', async () => {
		const user = userEvent.setup();
		const {container} = render(
			<BlueprintRecordViews
				aria-label="Blueprint records"
				records={records}
				compareRecords={comparePosition}
				onActivate={() => undefined}
			/>,
		);

		const searchToggle = screen.getByRole('button', {name: 'Search blueprint records'});
		const plannerBeforeSearch = screen.getByRole('button', {name: 'Tier changes'});
		plannerBeforeSearch.focus();
		expect({
			expanded: searchToggle.getAttribute('aria-expanded'),
			factorioSource: container.querySelector('.blueprint-record-views')?.getAttribute('data-factorio-source'),
			factorioStyle: searchToggle.dataset.factorioStyle,
			searchSource: searchToggle.parentElement?.dataset.factorioSource,
			searchbox: screen.queryByRole('searchbox'),
		}).toStrictEqual({
			expanded: 'false',
			factorioSource: 'BlueprintShelfWidget::passesFilter',
			factorioStyle: 'frame_action_button',
			searchSource: 'SearchBar::SearchBar',
			searchbox: null,
		});

		await user.click(searchToggle);
		const searchbox = screen.getByRole('searchbox', {name: 'Search blueprint records'});
		expect({
			expanded: searchToggle.getAttribute('aria-expanded'),
			factorioStyle: searchbox.dataset.factorioStyle,
			focused: document.activeElement === searchbox,
			popupStyle: searchbox.closest('label')?.dataset.factorioStyle,
		}).toStrictEqual({
			expanded: 'true',
			factorioStyle: 'search_popup_textfield',
			focused: true,
			popupStyle: 'search_popup_frame',
		});

		await user.type(searchbox, 'transport');
		const plannerAfterSearch = screen.getByRole('button', {name: 'Tier changes'});
		expect({
			identityPreserved: plannerAfterSearch === plannerBeforeSearch,
			tabIndex: plannerAfterSearch.tabIndex,
			visibleRecords: within(screen.getByRole('region', {name: 'Blueprint records'}))
				.getAllByRole('button')
				.map((button) => button.getAttribute('aria-label')),
		}).toStrictEqual({
			identityPreserved: true,
			tabIndex: 0,
			visibleRecords: ['Tier changes'],
		});

		await user.clear(searchbox);
		await user.type(searchbox, 'no matching blueprint');
		const emptyState = screen.getByRole('status');
		expect({
			message: emptyState.textContent,
			recordButtons: within(screen.getByRole('region', {name: 'Blueprint records'})).queryAllByRole('button'),
			websiteExtension: emptyState.dataset.websiteExtension,
		}).toStrictEqual({
			message: 'No matching records.',
			recordButtons: [],
			websiteExtension: 'filtered-empty-message',
		});

		await user.keyboard('{Escape}');
		expect({
			expanded: searchToggle.getAttribute('aria-expanded'),
			focused: document.activeElement === searchToggle,
			restoredRecords: within(screen.getByRole('region', {name: 'Blueprint records'}))
				.getAllByRole('button')
				.map((button) => button.getAttribute('aria-label')),
			searchbox: screen.queryByRole('searchbox'),
		}).toStrictEqual({
			expanded: 'false',
			focused: true,
			restoredRecords: ['Quality factory', 'Tier changes', 'Open book Factory books'],
			searchbox: null,
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
		const iconComposition = blueprintButton.querySelector('.blueprint-record-item__icons');
		expect({
			baseIcon: iconComposition?.querySelector('.blueprint-record-item__type-icon img')?.getAttribute('src'),
			compositionSource: iconComposition?.getAttribute('data-factorio-source'),
			description: document.getElementById(tooltipId ?? '')?.textContent,
			listDescription: blueprintButton.textContent,
			previewIcon: iconComposition
				?.querySelector('.blueprint-record-item__preview-icon img')
				?.getAttribute('src'),
			previewIconCount: iconComposition?.getAttribute('data-preview-icon-count'),
			quality: within(blueprintButton).getByTestId('quality').getAttribute('src'),
			recordName: blueprintButton.getAttribute('aria-label'),
			recordType: iconComposition?.getAttribute('data-record-type'),
			tooltipStyle: document.getElementById(tooltipId ?? '')?.getAttribute('data-factorio-style'),
		}).toStrictEqual({
			baseIcon: 'https://factorio-icon-cdn.pages.dev/item/blueprint.webp',
			compositionSource: 'PreviewIcons::drawWithItemIcon',
			description: 'Quality factoryBlueprintBuilds modules.',
			listDescription: 'Quality factoryBuilds modules.',
			previewIcon: 'https://factorio-icon-cdn.pages.dev/item/assembling-machine-3.webp',
			previewIconCount: '1',
			quality: 'https://factorio-icon-cdn.pages.dev/quality/legendary.webp',
			recordName: 'Quality factory',
			recordType: 'blueprint',
			tooltipStyle: 'blueprint_tooltip_description_frame',
		});

		await user.click(screen.getByRole('button', {name: 'Slots view'}));
		expect(
			screen.getByRole('button', {name: 'Quality factory'}).querySelector('.blueprint-record-item__text'),
		).toBeNull();
		expect(
			screen.getByRole('button', {name: 'Open book Factory books'}).getAttribute('aria-describedby'),
		).not.toBeNull();
	});

	test('keeps record type fallbacks visible and removes failed preview assets', () => {
		const fallbackRecords: LibraryRecord[] = [
			{
				...records[1],
				id: 'fallback-blueprint',
				gameData: {...records[1].gameData, icons: [], label: 'Blueprint fallback', type: 'blueprint'},
			},
			{
				...records[1],
				id: 'fallback-book',
				gameData: {...records[1].gameData, icons: [], label: 'Book fallback', type: 'blueprint_book'},
			},
			{
				...records[1],
				id: 'fallback-upgrade-planner',
				gameData: {...records[1].gameData, icons: [], label: 'Upgrade fallback', type: 'upgrade_planner'},
			},
			{
				...records[1],
				id: 'fallback-deconstruction-planner',
				gameData: {
					...records[1].gameData,
					icons: [],
					label: 'Deconstruction fallback',
					type: 'deconstruction_planner',
				},
			},
			{
				...records[1],
				id: 'missing-preview',
				gameData: {
					...records[1].gameData,
					description: '',
					icons: [{type: 'item', name: 'missing-mod-icon', quality: 'rare'}],
					label: 'Missing preview asset',
					type: 'blueprint',
				},
			},
		];
		render(
			<BlueprintRecordViews
				aria-label="Blueprint records"
				records={fallbackRecords}
				compareRecords={comparePosition}
				onActivate={() => undefined}
			/>,
		);

		const recordButtons = [
			screen.getByRole('button', {name: 'Blueprint fallback'}),
			screen.getByRole('button', {name: 'Open book Book fallback'}),
			screen.getByRole('button', {name: 'Upgrade fallback'}),
			screen.getByRole('button', {name: 'Deconstruction fallback'}),
		];
		const missingPreviewButton = screen.getByRole('button', {name: 'Missing preview asset'});
		const missingPreviewImages = within(missingPreviewButton).getAllByTestId('icon');
		const failedPreviewSource = missingPreviewImages[1].getAttribute('src');
		fireEvent.error(missingPreviewImages[1]);
		const missingTooltip = document.getElementById(missingPreviewButton.getAttribute('aria-describedby') ?? '');

		expect({
			failedPreviewSource,
			fallbacks: recordButtons.map((button) => {
				const composition = button.querySelector('.blueprint-record-item__icons');
				return {
					baseIcon: composition?.querySelector('.blueprint-record-item__type-icon img')?.getAttribute('src'),
					previewIconCount: composition?.getAttribute('data-preview-icon-count'),
					previewNodes: composition?.querySelectorAll('.blueprint-record-item__preview-icon').length,
					recordType: composition?.getAttribute('data-record-type'),
				};
			}),
			missingPreview: {
				baseIcon: missingPreviewButton
					.querySelector('.blueprint-record-item__type-icon img')
					?.getAttribute('src'),
				previewNodes: missingPreviewButton.querySelectorAll('.blueprint-record-item__preview-icon').length,
			},
			tooltip: {
				description: missingTooltip?.querySelector('.blueprint-record-item__tooltip-description')?.textContent,
				style: missingTooltip?.getAttribute('data-factorio-style'),
				type: missingTooltip?.querySelector('.blueprint-record-item__tooltip-type')?.textContent,
			},
		}).toStrictEqual({
			failedPreviewSource: 'https://factorio-icon-cdn.pages.dev/item/missing-mod-icon.webp',
			fallbacks: [
				{
					baseIcon: 'https://factorio-icon-cdn.pages.dev/item/blueprint.webp',
					previewIconCount: '0',
					previewNodes: 0,
					recordType: 'blueprint',
				},
				{
					baseIcon: 'https://factorio-icon-cdn.pages.dev/item/blueprint-book.webp',
					previewIconCount: '0',
					previewNodes: 0,
					recordType: 'blueprint_book',
				},
				{
					baseIcon: 'https://factorio-icon-cdn.pages.dev/item/upgrade-planner.webp',
					previewIconCount: '0',
					previewNodes: 0,
					recordType: 'upgrade_planner',
				},
				{
					baseIcon: 'https://factorio-icon-cdn.pages.dev/item/deconstruction-planner.webp',
					previewIconCount: '0',
					previewNodes: 0,
					recordType: 'deconstruction_planner',
				},
			],
			missingPreview: {
				baseIcon: 'https://factorio-icon-cdn.pages.dev/item/blueprint.webp',
				previewNodes: 0,
			},
			tooltip: {
				description: 'No description.',
				style: 'blueprint_tooltip_description_frame',
				type: 'Blueprint',
			},
		});
	});

	test('renders list records with the source slot, complete metadata, book affordance, and roving selection', () => {
		render(
			<BlueprintRecordViews
				aria-label="Blueprint records"
				records={records}
				compareRecords={comparePosition}
				onActivate={() => undefined}
			/>,
		);

		const blueprintButton = screen.getByRole('button', {name: 'Quality factory'});
		const bookButton = screen.getByRole('button', {name: 'Open book Factory books'});
		const firstListItem = blueprintButton.closest('li');
		const secondListItem = screen.getByRole('button', {name: 'Tier changes'}).closest('li');
		blueprintButton.focus();
		fireEvent.keyDown(blueprintButton, {key: 'ArrowDown'});

		expect({
			bookAffordance: bookButton.querySelector('.blueprint-record-item__open-book')?.getAttribute('aria-hidden'),
			description: blueprintButton.querySelector('.blueprint-record-item__description')?.textContent,
			firstItemClass: firstListItem?.className,
			label: blueprintButton.querySelector('strong')?.textContent,
			recordSource: blueprintButton.dataset.factorioSource,
			secondItemClass: secondListItem?.className,
			selectedRecords: screen
				.getAllByRole('button')
				.filter((button) => button.classList.contains('blueprint-record-item'))
				.map((button) => ({
					current: button.getAttribute('aria-current'),
					label: button.getAttribute('aria-label'),
				})),
			slotStyle: blueprintButton
				.querySelector('.blueprint-record-item__icons')
				?.getAttribute('data-factorio-style'),
		}).toStrictEqual({
			bookAffordance: 'true',
			description: 'Builds modules.',
			firstItemClass: '',
			label: 'Quality factory',
			recordSource: 'BlueprintsList::addItem',
			secondItemClass: '',
			selectedRecords: [
				{current: null, label: 'Quality factory'},
				{current: 'true', label: 'Tier changes'},
				{current: null, label: 'Open book Factory books'},
			],
			slotStyle: 'blueprint_record_selection_button',
		});
	});

	test('renders six source-sized grid cards per row and moves focus by the generated column count', () => {
		window.localStorage.setItem(BLUEPRINT_RECORD_VIEW_STORAGE_KEY, 'grid');
		const {container} = render(
			<BlueprintRecordViews
				aria-label="Blueprint records"
				records={gridRecords}
				compareRecords={comparePosition}
				onActivate={() => undefined}
			/>,
		);

		const grid = screen.getByRole('list');
		const firstRecord = screen.getByRole('button', {name: 'Grid blueprint 1'});
		firstRecord.focus();
		fireEvent.keyDown(firstRecord, {key: 'ArrowDown'});
		const seventhRecord = screen.getByRole('button', {name: 'Grid blueprint 7'});
		expect(document.activeElement).toBe(seventhRecord);
		fireEvent.keyDown(seventhRecord, {key: 'ArrowRight'});
		const eighthRecord = screen.getByRole('button', {name: 'Grid blueprint 8'});
		expect(document.activeElement).toBe(eighthRecord);
		fireEvent.keyDown(eighthRecord, {key: 'ArrowUp'});

		expect({
			activeRecord: document.activeElement?.getAttribute('aria-label'),
			bookAffordances: container.querySelectorAll('.blueprint-record-item__open-book').length,
			columns: grid.dataset.factorioColumns,
			gridClass: grid.className,
			gridVariables: {
				columns: grid.style.getPropertyValue('--blueprint-record-grid-columns'),
				horizontalSpacing: grid.style.getPropertyValue('--blueprint-record-grid-horizontal-spacing'),
				labelBottomMargin: grid.style.getPropertyValue('--blueprint-record-label-bottom-margin'),
				labelHeight: grid.style.getPropertyValue('--blueprint-record-label-height'),
				labelTopMargin: grid.style.getPropertyValue('--blueprint-record-label-top-margin'),
				slotPadding: grid.style.getPropertyValue('--blueprint-record-slot-padding'),
				slotSize: grid.style.getPropertyValue('--blueprint-record-slot-size'),
				verticalSpacing: grid.style.getPropertyValue('--blueprint-record-grid-vertical-spacing'),
			},
			items: [...grid.children].map((item) => ({
				buttonClass: item.querySelector('button')?.className,
				label: item.querySelector('strong')?.textContent,
				slotStyle: item.querySelector('.blueprint-record-item__icons')?.getAttribute('data-factorio-style'),
			})),
		}).toStrictEqual({
			activeRecord: 'Grid blueprint 2',
			bookAffordances: 0,
			columns: '6',
			gridClass: 'blueprint-record-views__items blueprint-record-views__items--grid',
			gridVariables: {
				columns: '6',
				horizontalSpacing: '4px',
				labelBottomMargin: '4px',
				labelHeight: '40px',
				labelTopMargin: '-4px',
				slotPadding: '4px',
				slotSize: '80px',
				verticalSpacing: '4px',
			},
			items: gridRecords.map((record) => ({
				buttonClass: 'blueprint-record-item blueprint-record-item--grid',
				label: record.gameData.label,
				slotStyle: 'blueprint_record_selection_button',
			})),
		});
	});

	test('renders compact records in padded ten-slot rows and moves focus by the generated column count', async () => {
		window.localStorage.setItem(BLUEPRINT_RECORD_VIEW_STORAGE_KEY, 'slots');
		const user = userEvent.setup();
		render(
			<BlueprintRecordViews
				aria-label="Blueprint records"
				records={slotRecords}
				compareRecords={comparePosition}
				onActivate={() => undefined}
			/>,
		);

		const slots = screen.getByRole('list');
		const firstRecord = screen.getByRole('button', {name: 'Slot blueprint 1'});
		firstRecord.focus();
		await user.keyboard('{ArrowDown}');
		expect(document.activeElement).toBe(screen.getByRole('button', {name: 'Slot blueprint 11'}));
		await user.keyboard('{ArrowRight}{ArrowUp}');

		expect({
			activeRecord: document.activeElement?.getAttribute('aria-label'),
			columns: slots.dataset.factorioColumns,
			emptySlots: [...slots.querySelectorAll('.blueprint-record-views__empty-slot')].map((slot) => ({
				hidden: slot.getAttribute('aria-hidden'),
				source: slot.getAttribute('data-factorio-source'),
				style: slot.querySelector('.factorio-inventory-slot')?.getAttribute('data-factorio-style'),
			})),
			items: slotRecords.map((_, index) => {
				const button = screen.getByRole('button', {name: `Slot blueprint ${(index + 1).toString()}`});
				return {
					detail: button.dataset.secondaryDetail,
					height: button.style.height,
					source: button.dataset.factorioSource,
					text: button.querySelector('.blueprint-record-item__text'),
					width: button.style.width,
				};
			}),
			slotCount: slots.children.length,
			slotVariables: {
				columns: slots.style.getPropertyValue('--blueprint-record-small-slot-columns'),
				horizontalSpacing: slots.style.getPropertyValue('--blueprint-record-small-slot-horizontal-spacing'),
				size: slots.style.getPropertyValue('--blueprint-record-small-slot-size'),
				verticalSpacing: slots.style.getPropertyValue('--blueprint-record-small-slot-vertical-spacing'),
			},
		}).toStrictEqual({
			activeRecord: 'Slot blueprint 2',
			columns: '10',
			emptySlots: Array.from({length: 8}, () => ({
				hidden: 'true',
				source: 'BlueprintsList::getSquareSize',
				style: 'slot_button',
			})),
			items: slotRecords.map(() => ({
				detail: 'tooltip',
				height: 'calc(40px * var(--factorio-ui-density, 1))',
				source: 'BlueprintsList::addItem',
				text: null,
				width: 'calc(40px * var(--factorio-ui-density, 1))',
			})),
			slotCount: 20,
			slotVariables: {
				columns: '10',
				horizontalSpacing: '0px',
				size: '40px',
				verticalSpacing: '0px',
			},
		});

		await user.click(screen.getByRole('button', {name: 'Search blueprint records'}));
		await user.type(screen.getByRole('searchbox', {name: 'Search blueprint records'}), 'Slot blueprint');
		expect({
			emptySlots: slots.querySelectorAll('.blueprint-record-views__empty-slot').length,
			slotCount: slots.children.length,
		}).toStrictEqual({emptySlots: 0, slotCount: 12});
	});

	test('shares one source-faithful view preference and supports roving keyboard selection', async () => {
		const user = userEvent.setup();
		render(
			<>
				<BlueprintRecordViews
					aria-label="Library records"
					records={records}
					compareRecords={comparePosition}
					onActivate={() => undefined}
				/>
				<BlueprintRecordViews
					aria-label="Planner records"
					records={records}
					compareRecords={comparePosition}
					onActivate={() => undefined}
				/>
			</>,
		);

		const viewGroups = screen.getAllByRole('group', {name: 'Record view'});
		const viewState = () =>
			viewGroups.map((group) =>
				within(group)
					.getAllByRole('button')
					.map((button) => ({
						label: button.getAttribute('aria-label'),
						pressed: button.getAttribute('aria-pressed'),
						sourceStyle: button.dataset.factorioSourceStyle,
						sprite: button.querySelector('svg')?.dataset.factorioUtilitySprite,
						tabIndex: button.tabIndex,
					})),
			);
		expect({
			factorioSource: viewGroups.map((group) => group.dataset.factorioSource),
			viewState: viewState(),
		}).toStrictEqual({
			factorioSource: ['BlueprintsList::viewButtons', 'BlueprintsList::viewButtons'],
			viewState: [
				[
					{label: 'List view', pressed: 'true', sourceStyle: 'tool_button', sprite: 'list_view', tabIndex: 0},
					{
						label: 'Grid view',
						pressed: 'false',
						sourceStyle: 'tool_button',
						sprite: 'grid_view',
						tabIndex: -1,
					},
					{
						label: 'Slots view',
						pressed: 'false',
						sourceStyle: 'tool_button',
						sprite: 'slots_view',
						tabIndex: -1,
					},
				],
				[
					{label: 'List view', pressed: 'true', sourceStyle: 'tool_button', sprite: 'list_view', tabIndex: 0},
					{
						label: 'Grid view',
						pressed: 'false',
						sourceStyle: 'tool_button',
						sprite: 'grid_view',
						tabIndex: -1,
					},
					{
						label: 'Slots view',
						pressed: 'false',
						sourceStyle: 'tool_button',
						sprite: 'slots_view',
						tabIndex: -1,
					},
				],
			],
		});

		const libraryListView = within(viewGroups[0]).getByRole('button', {name: 'List view'});
		libraryListView.focus();
		await user.keyboard('{ArrowLeft}');

		expect({
			focused: document.activeElement?.getAttribute('aria-label'),
			persisted: window.localStorage.getItem(BLUEPRINT_RECORD_VIEW_STORAGE_KEY),
			viewClasses: screen.getAllByRole('list').map((list) => list.className),
			viewState: viewState(),
		}).toStrictEqual({
			focused: 'Slots view',
			persisted: 'slots',
			viewClasses: [
				'blueprint-record-views__items blueprint-record-views__items--slots',
				'blueprint-record-views__items blueprint-record-views__items--slots',
			],
			viewState: [
				[
					{
						label: 'List view',
						pressed: 'false',
						sourceStyle: 'tool_button',
						sprite: 'list_view',
						tabIndex: -1,
					},
					{
						label: 'Grid view',
						pressed: 'false',
						sourceStyle: 'tool_button',
						sprite: 'grid_view',
						tabIndex: -1,
					},
					{
						label: 'Slots view',
						pressed: 'true',
						sourceStyle: 'tool_button',
						sprite: 'slots_view',
						tabIndex: 0,
					},
				],
				[
					{
						label: 'List view',
						pressed: 'false',
						sourceStyle: 'tool_button',
						sprite: 'list_view',
						tabIndex: -1,
					},
					{
						label: 'Grid view',
						pressed: 'false',
						sourceStyle: 'tool_button',
						sprite: 'grid_view',
						tabIndex: -1,
					},
					{
						label: 'Slots view',
						pressed: 'true',
						sourceStyle: 'tool_button',
						sprite: 'slots_view',
						tabIndex: 0,
					},
				],
			],
		});

		await user.keyboard('{Home}');
		expect({
			focused: document.activeElement?.getAttribute('aria-label'),
			persisted: window.localStorage.getItem(BLUEPRINT_RECORD_VIEW_STORAGE_KEY),
			viewClasses: screen.getAllByRole('list').map((list) => list.className),
		}).toStrictEqual({
			focused: 'List view',
			persisted: 'list',
			viewClasses: [
				'blueprint-record-views__items blueprint-record-views__items--list',
				'blueprint-record-views__items blueprint-record-views__items--list',
			],
		});
	});

	test('renders Factorio rich text inside record tooltips without leaving raw tags', () => {
		render(
			<BlueprintRecordViews
				aria-label="Blueprint records"
				records={[
					{
						...records[1],
						gameData: {
							...records[1].gameData,
							label: '[color=yellow]Quality factory[/color]',
							description: 'Builds [item=productivity-module-3] modules.',
						},
					},
				]}
				onActivate={() => undefined}
			/>,
		);

		const button = screen.getByRole('button', {name: '[color=yellow]Quality factory[/color]'});
		const tooltip = document.getElementById(button.getAttribute('aria-describedby') ?? '');
		if (tooltip === null) {
			throw new Error('Expected the record tooltip to be linked by aria-describedby.');
		}
		expect({
			icons: tooltip.querySelectorAll('[data-factorio-icon-size]').length,
			rawTags: tooltip.textContent.includes('[item='),
			richText: [...tooltip.querySelectorAll('[data-testid="richtext"]')].map((element) => element.textContent),
		}).toStrictEqual({
			icons: 1,
			rawTags: false,
			richText: ['Quality factory', 'Builds  modules.'],
		});
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
