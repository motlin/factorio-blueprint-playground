import {act, fireEvent, render, screen, within} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {beforeEach, describe, expect, test, vi} from 'vite-plus/test';

import {
	UpgradePlannerSelectorDialog,
	type UpgradePlannerChoice,
} from '../../src/components/blueprint/panels/transform/UpgradePlannerSelectorDialog';
import {BLUEPRINT_RECORD_VIEW_STORAGE_KEY} from '../../src/components/library/blueprintRecordModel';
import {serializeBlueprint} from '../../src/parsing/blueprintParser';
import type {BlueprintString, UpgradePlanner} from '../../src/parsing/types';
import {LIBRARY_ROOT_ID, type LibraryRecord} from '../../src/storage/db';
import {parseUpgradePlanner, type UpgradeDirection} from '../../src/transform/upgradePlanner';
import upgradePlannerFixture from '../fixtures/blueprints/json/upgrade.json';

const mocks = vi.hoisted(() => ({
	libraryRecords: [] as LibraryRecord[],
}));

vi.mock('dexie-react-hooks', () => ({
	useLiveQuery: () => mocks.libraryRecords,
}));

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

const fixturePlanner: UpgradePlanner = {
	...parseUpgradePlanner(JSON.stringify(upgradePlannerFixture)),
	label: "Alice's fixture belt upgrades",
};
const zeroMatchPlanner: UpgradePlanner = {
	item: 'upgrade-planner',
	label: 'Zero-match module planner',
	version: 0,
	settings: {
		mappers: [
			{
				index: 100,
				from: {type: 'item', name: 'speed-module'},
				to: {type: 'item', name: 'speed-module-2'},
			},
		],
	},
};
const rootBlueprint: BlueprintString = {
	blueprint_book: {
		item: 'blueprint-book',
		version: 0,
		blueprints: [{index: 100, upgrade_planner: fixturePlanner}],
	},
};

function storedPlanner(
	id: string,
	planner: UpgradePlanner,
	label: string,
	description: string,
	position: number,
	parentId = LIBRARY_ROOT_ID,
): LibraryRecord {
	return {
		id,
		createdOn: 0,
		updatedOn: 0,
		data: serializeBlueprint({upgrade_planner: planner}),
		gameData: {type: 'upgrade_planner', label, description, icons: []},
		parentId,
		position,
	};
}

function renderApplySelector(selectedSource = 'suggested') {
	const onChoose = vi.fn<(choice: UpgradePlannerChoice, direction: UpgradeDirection) => void>();
	const onClose = vi.fn<() => void>();
	const rendered = render(
		<UpgradePlannerSelectorDialog
			dialogId="upgrade-planner-selector"
			includeEditingChoices={false}
			rootBlueprint={rootBlueprint}
			selectedSource={selectedSource}
			onChoose={onChoose}
			onClose={onClose}
		/>,
	);
	return {onChoose, onClose, ...rendered};
}

function visiblePlannerNames(): Array<string | null> {
	return within(screen.getByRole('region', {name: 'Upgrade planners'}))
		.queryAllByRole('button')
		.map((button) => button.getAttribute('aria-label'));
}

describe('UpgradePlannerSelectorDialog golden apply-only source contracts', () => {
	beforeEach(() => {
		Object.defineProperty(window, 'localStorage', {configurable: true, value: localStorage});
		window.localStorage.clear();
		mocks.libraryRecords = [
			storedPlanner(
				'planner-alice',
				fixturePlanner,
				'Nested belt planner',
				'Upgrades every transport belt in the factory.',
				0,
				'nested-book',
			),
			storedPlanner(
				'planner-bob',
				zeroMatchPlanner,
				'Zero-match library planner',
				'Module rules with no matches in the open blueprint.',
				1,
			),
		];
	});

	test('searches saved planner labels and descriptions while hiding Default Upgrade', async () => {
		const user = userEvent.setup();
		renderApplySelector();
		await user.click(screen.getByRole('button', {name: 'Search upgrade planners'}));
		const search = screen.getByRole('searchbox', {name: 'Search upgrade planners'});
		const dialog = screen.getByRole('dialog', {name: 'Select the upgrade planner to apply'});
		const instructions = document.getElementById(dialog.getAttribute('aria-describedby') ?? '');
		const titleBar = dialog.querySelector('.upgrade-planner-selector__header');
		const subheader = dialog.querySelector('.upgrade-planner-selector__subheader');
		const searchButton = screen.getByRole('button', {name: 'Search upgrade planners'});
		const viewControls = screen.getByRole('group', {name: 'Record view'});

		expect({
			editingChoices: {
				empty: screen.queryByRole('button', {name: 'Empty Planner'}),
				paste: screen.queryByRole('button', {name: 'Paste upgrade planner…'}),
			},
			initial: visiblePlannerNames(),
			instructions: instructions?.textContent,
			shell: {
				dialogChildren: Array.from(dialog.children).map((child) => child.className),
				headerButtons:
					titleBar === null
						? []
						: within(titleBar as HTMLElement)
								.getAllByRole('button')
								.map((button) => button.getAttribute('aria-label')),
				searchControlParent: searchButton.closest('.upgrade-planner-selector__header-actions')?.className,
				source: dialog.getAttribute('data-factorio-source'),
				subheaderStyle: subheader?.getAttribute('data-factorio-style'),
				viewControlLabels: within(viewControls)
					.getAllByRole('button')
					.map((button) => button.getAttribute('aria-label')),
				viewControlsParent: viewControls.parentElement?.className,
			},
		}).toStrictEqual({
			editingChoices: {empty: null, paste: null},
			initial: ['Default Upgrade', 'Nested belt planner', 'Zero-match library planner'],
			instructions: 'Left-click to apply as upgrade, Right-click to apply as downgrade.',
			shell: {
				dialogChildren: [
					'factorio-title-bar transform-dialog__header upgrade-planner-selector__header',
					'factorio-frame factorio-frame--shallow upgrade-planner-selector__inside-frame',
				],
				headerButtons: ['Search upgrade planners', 'Close upgrade planner selector'],
				searchControlParent: 'upgrade-planner-selector__header-actions',
				source: 'SelectUpgradePlannerGui::SelectUpgradePlannerGui',
				subheaderStyle: 'subheader_frame',
				viewControlLabels: ['List view', 'Grid view', 'Slots view'],
				viewControlsParent: 'upgrade-planner-selector__view-controls-target',
			},
		});

		await user.type(search, 'transport belt');
		expect(visiblePlannerNames()).toStrictEqual(['Nested belt planner']);

		await user.clear(search);
		await user.type(search, 'ZERO-MATCH');
		expect(visiblePlannerNames()).toStrictEqual(['Zero-match library planner']);

		await user.clear(search);
		await user.type(search, 'Default Upgrade');
		expect({
			defaultPlanner: screen.queryByRole('button', {name: 'Default Upgrade'}),
			status: screen.getByRole('status').textContent,
		}).toStrictEqual({
			defaultPlanner: null,
			status: 'No matching upgrade planners.',
		});
	});

	test('discovers nested saved records and retains planners with no applicable mappings', () => {
		renderApplySelector('library:planner-bob');

		const buttons = within(screen.getByRole('region', {name: 'Upgrade planners'})).getAllByRole('button');
		expect({
			activeElement: document.activeElement?.getAttribute('aria-label'),
			buttons: buttons.map((button) => ({
				keyboardAlternative: button.getAttribute('aria-keyshortcuts'),
				label: button.getAttribute('aria-label'),
			})),
			unsavedBookPlanner: screen.queryByRole('button', {name: "Alice's fixture belt upgrades"}),
		}).toStrictEqual({
			activeElement: 'Zero-match library planner',
			buttons: [
				{keyboardAlternative: 'Shift+Enter', label: 'Default Upgrade'},
				{keyboardAlternative: 'Shift+Enter', label: 'Nested belt planner'},
				{keyboardAlternative: 'Shift+Enter', label: 'Zero-match library planner'},
			],
			unsavedBookPlanner: null,
		});
	});

	test('reuses the persistent library list, grid, and slot presentations', async () => {
		const user = userEvent.setup();
		const {unmount} = renderApplySelector();
		const initialDialog = screen.getByRole('dialog', {name: 'Select the upgrade planner to apply'});

		expect({
			activeElement: document.activeElement?.getAttribute('aria-label'),
			dialog: {
				ariaHidden: initialDialog.getAttribute('aria-hidden'),
				inert: initialDialog.inert,
				modal: initialDialog.getAttribute('aria-modal'),
			},
			listClass: screen.getByRole('list').className,
		}).toStrictEqual({
			activeElement: 'Default Upgrade',
			dialog: {ariaHidden: null, inert: false, modal: 'true'},
			listClass: 'blueprint-record-views__items blueprint-record-views__items--list',
		});
		await user.click(screen.getByRole('button', {name: 'Grid view'}));
		expect(screen.getByRole('list').className).toBe(
			'blueprint-record-views__items blueprint-record-views__items--grid',
		);
		await user.click(screen.getByRole('button', {name: 'Slots view'}));
		expect({
			persisted: window.localStorage.getItem(BLUEPRINT_RECORD_VIEW_STORAGE_KEY),
			slotListClass: screen.getByRole('list').className,
			slotText: screen
				.getByRole('button', {name: 'Nested belt planner'})
				.querySelector('.blueprint-record-item__text'),
		}).toStrictEqual({
			persisted: 'slots',
			slotListClass: 'blueprint-record-views__items blueprint-record-views__items--slots',
			slotText: null,
		});

		unmount();
		renderApplySelector();
		const restoredDialog = screen.getByRole('dialog', {name: 'Select the upgrade planner to apply'});
		expect({
			activeElement: document.activeElement?.getAttribute('aria-label'),
			dialog: {
				ariaHidden: restoredDialog.getAttribute('aria-hidden'),
				inert: restoredDialog.inert,
				modal: restoredDialog.getAttribute('aria-modal'),
			},
			listClass: screen.getByRole('list').className,
		}).toStrictEqual({
			activeElement: 'Default Upgrade',
			dialog: {ariaHidden: null, inert: false, modal: 'true'},
			listClass: 'blueprint-record-views__items blueprint-record-views__items--slots',
		});
	});

	test('applies upgrade on left click and downgrade on right click in the apply-only selector', async () => {
		const user = userEvent.setup();
		const {onChoose, onClose} = renderApplySelector();
		const defaultPlanner = screen.getByRole('button', {name: 'Default Upgrade'});
		const nestedPlanner = screen.getByRole('button', {name: 'Nested belt planner'});
		const zeroMatchPlannerButton = screen.getByRole('button', {name: 'Zero-match library planner'});
		const dialog = screen.getByRole('dialog', {name: 'Select the upgrade planner to apply'});

		expect({
			activeElement: document.activeElement?.getAttribute('aria-label'),
			dialog: {
				ariaHidden: dialog.getAttribute('aria-hidden'),
				inert: dialog.inert,
				modal: dialog.getAttribute('aria-modal'),
			},
		}).toStrictEqual({
			activeElement: 'Default Upgrade',
			dialog: {ariaHidden: null, inert: false, modal: 'true'},
		});

		await user.click(defaultPlanner);
		const contextMenuAllowed = fireEvent.contextMenu(nestedPlanner);
		act(() => {
			zeroMatchPlannerButton.focus();
		});
		await user.keyboard('{Enter}');
		await user.keyboard('{Shift>}{Enter}{/Shift}');

		expect({
			closes: onClose.mock.calls,
			contextMenuAllowed,
			selections: onChoose.mock.calls,
		}).toStrictEqual({
			closes: [[], [], [], []],
			contextMenuAllowed: false,
			selections: [
				[{label: 'Default Upgrade', source: 'suggested'}, 'upgrade'],
				[
					{
						label: 'Nested belt planner',
						planner: fixturePlanner,
						source: 'library:planner-alice',
					},
					'downgrade',
				],
				[
					{
						label: 'Zero-match library planner',
						planner: zeroMatchPlanner,
						source: 'library:planner-bob',
					},
					'upgrade',
				],
				[
					{
						label: 'Zero-match library planner',
						planner: zeroMatchPlanner,
						source: 'library:planner-bob',
					},
					'downgrade',
				],
			],
		});
	});

	test('dismisses without applying from Escape and the close button', async () => {
		const user = userEvent.setup();
		const firstRender = renderApplySelector();
		await user.keyboard('{Escape}');
		expect({
			closes: firstRender.onClose.mock.calls,
			selections: firstRender.onChoose.mock.calls,
		}).toStrictEqual({closes: [[]], selections: []});

		firstRender.unmount();
		const secondRender = renderApplySelector();
		await user.click(screen.getByRole('button', {name: 'Close upgrade planner selector'}));
		expect({
			closes: secondRender.onClose.mock.calls,
			selections: secondRender.onChoose.mock.calls,
		}).toStrictEqual({closes: [[]], selections: []});
	});

	test('preserves the editor Load selector choices and non-directional tiles', () => {
		render(
			<UpgradePlannerSelectorDialog
				dialogId="upgrade-planner-selector"
				includeEditingChoices
				rootBlueprint={rootBlueprint}
				selectedSource="suggested"
				onChoose={vi.fn<(choice: UpgradePlannerChoice, direction: UpgradeDirection) => void>()}
				onClose={vi.fn<() => void>()}
			/>,
		);

		const dialog = screen.getByRole('dialog', {name: 'Load an upgrade planner'});
		const instructions = document.getElementById(dialog.getAttribute('aria-describedby') ?? '');
		const tiles = within(screen.getByRole('grid', {name: 'Upgrade planners'})).getAllByRole('button');
		expect({
			applicationControls: {
				search: screen.queryByRole('button', {name: 'Search upgrade planners'}),
				views: screen.queryByRole('group', {name: 'Record view'}),
			},
			instructions: instructions?.textContent,
			shell: {
				dialogChildren: Array.from(dialog.children).map((child) => child.className),
				source: dialog.getAttribute('data-factorio-source'),
				subheaderStyle: dialog
					.querySelector('.upgrade-planner-selector__subheader')
					?.getAttribute('data-factorio-style'),
				websiteExtension: dialog.getAttribute('data-website-extension'),
			},
			tiles: tiles.map((tile) => ({
				keyboardAlternative: tile.getAttribute('aria-keyshortcuts'),
				label: tile.getAttribute('aria-label'),
			})),
		}).toStrictEqual({
			applicationControls: {search: null, views: null},
			instructions: 'Choose a planner to copy all of its mappings into the editable draft.',
			shell: {
				dialogChildren: [
					'factorio-title-bar transform-dialog__header upgrade-planner-selector__header',
					'factorio-frame factorio-frame--shallow upgrade-planner-selector__inside-frame',
				],
				source: null,
				subheaderStyle: 'subheader_frame',
				websiteExtension: 'upgrade-planner-draft-loader',
			},
			tiles: [
				{keyboardAlternative: null, label: 'Default Upgrade'},
				{keyboardAlternative: null, label: "Alice's fixture belt upgrades"},
				{keyboardAlternative: null, label: 'Nested belt planner'},
				{keyboardAlternative: null, label: 'Zero-match library planner'},
				{keyboardAlternative: null, label: 'Empty Planner'},
				{keyboardAlternative: null, label: 'Paste upgrade planner…'},
			],
		});
	});
});
