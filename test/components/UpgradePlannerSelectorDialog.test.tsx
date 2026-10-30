import {act, fireEvent, render, screen, within} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {beforeEach, describe, expect, test, vi} from 'vite-plus/test';

import {
	UpgradePlannerSelectorDialog,
	type UpgradePlannerChoice,
} from '../../src/components/blueprint/panels/transform/UpgradePlannerSelectorDialog';
import {BLUEPRINT_RECORD_VIEW_STORAGE_KEY} from '../../src/components/library/blueprintRecordModel';
import {serializeBlueprint} from '../../src/parsing/blueprintParser';
import type {BlueprintString, SignalID, UpgradePlanner} from '../../src/parsing/types';
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

const parsedFixturePlanner = parseUpgradePlanner(JSON.stringify(upgradePlannerFixture));
const fixturePlanner: UpgradePlanner = {
	...parsedFixturePlanner,
	label: "Alice's fixture belt upgrades",
	settings: {
		...parsedFixturePlanner.settings,
		icons: [
			{index: 100, signal: {type: 'entity', name: 'transport-belt', quality: 'rare'}},
			{index: 200, signal: {type: 'item', name: 'speed-module-3', quality: 'legendary'}},
		],
	},
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

const expectedEditorTilePresentation = [
	{
		choiceKind: 'default',
		factorioSource: 'BlueprintsList::addItem',
		icon: {
			factorioSource: 'PreviewIcons::drawWithItemIcon',
			factorioStyle: 'blueprint_record_selection_button',
			images: [{src: 'https://factorio-icon-cdn.pages.dev/item/upgrade-planner.webp', title: null}],
			previewIconCount: '0',
			websiteAction: null,
			websiteLabel: null,
		},
		label: 'Default Upgrade',
		pressed: 'true',
		websiteExtension: null,
	},
	{
		choiceKind: 'saved',
		factorioSource: 'BlueprintsList::addItem',
		icon: {
			factorioSource: 'PreviewIcons::drawWithItemIcon',
			factorioStyle: 'blueprint_record_selection_button',
			images: [
				{src: 'https://factorio-icon-cdn.pages.dev/item/upgrade-planner.webp', title: null},
				{src: 'https://factorio-icon-cdn.pages.dev/entity/transport-belt.webp', title: null},
				{src: 'https://factorio-icon-cdn.pages.dev/quality/rare.webp', title: 'Rare quality'},
				{src: 'https://factorio-icon-cdn.pages.dev/item/speed-module-3.webp', title: null},
				{src: 'https://factorio-icon-cdn.pages.dev/quality/legendary.webp', title: 'Legendary quality'},
			],
			previewIconCount: '2',
			websiteAction: null,
			websiteLabel: null,
		},
		label: "Alice's fixture belt upgrades",
		pressed: 'false',
		websiteExtension: null,
	},
	{
		choiceKind: 'saved',
		factorioSource: 'BlueprintsList::addItem',
		icon: {
			factorioSource: 'PreviewIcons::drawWithItemIcon',
			factorioStyle: 'blueprint_record_selection_button',
			images: [
				{src: 'https://factorio-icon-cdn.pages.dev/item/upgrade-planner.webp', title: null},
				{src: 'https://factorio-icon-cdn.pages.dev/item/fast-transport-belt.webp', title: null},
				{src: 'https://factorio-icon-cdn.pages.dev/quality/uncommon.webp', title: 'Uncommon quality'},
			],
			previewIconCount: '1',
			websiteAction: null,
			websiteLabel: null,
		},
		label: 'Nested belt planner',
		pressed: 'false',
		websiteExtension: null,
	},
	{
		choiceKind: 'saved',
		factorioSource: 'BlueprintsList::addItem',
		icon: {
			factorioSource: 'PreviewIcons::drawWithItemIcon',
			factorioStyle: 'blueprint_record_selection_button',
			images: [{src: 'https://factorio-icon-cdn.pages.dev/item/upgrade-planner.webp', title: null}],
			previewIconCount: '0',
			websiteAction: null,
			websiteLabel: null,
		},
		label: 'Zero-match library planner',
		pressed: 'false',
		websiteExtension: null,
	},
	{
		choiceKind: 'empty',
		factorioSource: null,
		icon: {
			factorioSource: null,
			factorioStyle: 'blueprint_record_selection_button',
			images: [],
			previewIconCount: null,
			websiteAction: 'empty',
			websiteLabel: 'Website extension',
		},
		label: 'Empty Planner',
		pressed: 'false',
		websiteExtension: 'empty-upgrade-planner',
	},
	{
		choiceKind: 'paste',
		factorioSource: null,
		icon: {
			factorioSource: null,
			factorioStyle: 'blueprint_record_selection_button',
			images: [],
			previewIconCount: null,
			websiteAction: 'paste',
			websiteLabel: 'Website extension',
		},
		label: 'Paste upgrade planner…',
		pressed: 'false',
		websiteExtension: 'paste-upgrade-planner',
	},
];

function storedPlanner(
	id: string,
	planner: UpgradePlanner,
	label: string,
	description: string,
	position: number,
	icons: SignalID[] = [],
	parentId = LIBRARY_ROOT_ID,
): LibraryRecord {
	return {
		id,
		createdOn: 0,
		updatedOn: 0,
		data: serializeBlueprint({upgrade_planner: planner}),
		gameData: {type: 'upgrade_planner', label, description, icons},
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

function editorTilePresentation(tile: HTMLButtonElement) {
	const icon = tile.querySelector('.upgrade-planner-selector__record-icon');
	return {
		choiceKind: tile.getAttribute('data-choice-kind'),
		factorioSource: tile.getAttribute('data-factorio-source'),
		icon: {
			factorioSource: icon?.getAttribute('data-factorio-source') ?? null,
			factorioStyle: icon?.getAttribute('data-factorio-style') ?? null,
			images: Array.from(icon?.querySelectorAll('img') ?? []).map((image) => ({
				src: image.getAttribute('src'),
				title: image.getAttribute('title'),
			})),
			previewIconCount: icon?.getAttribute('data-preview-icon-count') ?? null,
			websiteAction: icon?.querySelector('svg')?.getAttribute('data-website-action') ?? null,
			websiteLabel: icon?.querySelector('.upgrade-planner-selector__website-label')?.textContent ?? null,
		},
		label: tile.querySelector('strong')?.textContent,
		pressed: tile.getAttribute('aria-pressed'),
		websiteExtension: tile.getAttribute('data-website-extension'),
	};
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
				[{type: 'item', name: 'fast-transport-belt', quality: 'uncommon'}],
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
					'factorio-frame factorio-frame--inside upgrade-planner-selector__inside-frame',
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

	test('inserts one Default Upgrade first with the source planner icon and empty description', () => {
		renderApplySelector();

		const records = screen.getByRole('list');
		const recordButtons = within(records).getAllByRole('button');
		const defaultUpgrade = screen.getByRole('button', {name: 'Default Upgrade'});
		const icon = defaultUpgrade.querySelector('.blueprint-record-item__icons');
		const tooltipId = defaultUpgrade.getAttribute('aria-describedby')?.split(' ')[0] ?? '';
		const tooltip = document.getElementById(tooltipId);

		expect({
			defaultChoices: recordButtons
				.map((button) => button.getAttribute('aria-label'))
				.filter((label) => label?.includes('Default Upgrade') === true),
			firstRecord: recordButtons[0]?.getAttribute('aria-label'),
			identity: defaultUpgrade.getAttribute('data-blueprint-record-id'),
			icon: {
				factorioSource: icon?.getAttribute('data-factorio-source'),
				factorioStyle: icon?.getAttribute('data-factorio-style'),
				images: Array.from(icon?.querySelectorAll('img') ?? []).map((image) => image.getAttribute('src')),
				previewIconCount: icon?.getAttribute('data-preview-icon-count'),
				recordType: icon?.getAttribute('data-record-type'),
			},
			label: defaultUpgrade.querySelector('.blueprint-record-item__text strong')?.textContent,
			recordSource: defaultUpgrade.getAttribute('data-factorio-source'),
			tooltip: {
				description: tooltip?.querySelector('.blueprint-record-item__tooltip-description')?.textContent,
				type: tooltip?.querySelector('.blueprint-record-item__tooltip-type')?.textContent,
			},
		}).toStrictEqual({
			defaultChoices: ['Default Upgrade'],
			firstRecord: 'Default Upgrade',
			identity: 'suggested',
			icon: {
				factorioSource: 'PreviewIcons::drawWithItemIcon',
				factorioStyle: 'blueprint_record_selection_button',
				images: ['https://factorio-icon-cdn.pages.dev/item/upgrade-planner.webp'],
				previewIconCount: '0',
				recordType: 'upgrade_planner',
			},
			label: 'Default Upgrade',
			recordSource: 'BlueprintsList::addItem',
			tooltip: {
				description: 'No description.',
				type: 'Upgrade planner',
			},
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

	test('presents editor Load choices as five-column planner records and explicit website extensions', () => {
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

		const dialog = screen.getByRole('dialog', {name: 'Choose a planner for this draft'});
		const instructions = document.getElementById(dialog.getAttribute('aria-describedby') ?? '');
		const grid = screen.getByRole('grid', {name: 'Upgrade planners'});
		const tiles = within(grid).getAllByRole<HTMLButtonElement>('button');
		expect({
			applicationControls: {
				search: screen.queryByRole('button', {name: 'Search upgrade planners'}),
				views: screen.queryByRole('group', {name: 'Record view'}),
			},
			geometry: {
				columns: grid.getAttribute('data-factorio-columns'),
				factorioSource: grid.getAttribute('data-factorio-source'),
				style: {
					columns: grid.style.getPropertyValue('--blueprint-record-grid-columns'),
					horizontalSpacing: grid.style.getPropertyValue('--blueprint-record-grid-horizontal-spacing'),
					labelBottomMargin: grid.style.getPropertyValue('--blueprint-record-label-bottom-margin'),
					labelHeight: grid.style.getPropertyValue('--blueprint-record-label-height'),
					labelTopMargin: grid.style.getPropertyValue('--blueprint-record-label-top-margin'),
					tileSize: grid.style.getPropertyValue('--blueprint-record-slot-size'),
					verticalSpacing: grid.style.getPropertyValue('--blueprint-record-grid-vertical-spacing'),
				},
			},
			instructions: instructions?.textContent,
			shell: {
				closeControl: within(dialog)
					.getByRole('button', {name: 'Close planner draft chooser'})
					.getAttribute('aria-label'),
				dialogClass: dialog.className,
				dialogChildren: Array.from(dialog.children).map((child) => child.className),
				gridClass: grid.className,
				source: dialog.getAttribute('data-factorio-source'),
				subheaderStyle: dialog
					.querySelector('.upgrade-planner-selector__subheader')
					?.getAttribute('data-factorio-style'),
				websiteExtension: dialog.getAttribute('data-website-extension'),
			},
			tiles: tiles.map(editorTilePresentation),
		}).toStrictEqual({
			applicationControls: {search: null, views: null},
			geometry: {
				columns: '5',
				factorioSource: 'BlueprintsList::addItem',
				style: {
					columns: '5',
					horizontalSpacing: '4px',
					labelBottomMargin: '4px',
					labelHeight: '40px',
					labelTopMargin: '-4px',
					tileSize: '80px',
					verticalSpacing: '4px',
				},
			},
			instructions:
				'Choosing a planner replaces this editable draft and returns to the Upgrade Planner. It does not apply changes to the blueprint.',
			shell: {
				closeControl: 'Close planner draft chooser',
				dialogClass:
					'factorio-frame factorio-frame--shallow transform-dialog upgrade-planner-selector upgrade-planner-selector--draft',
				dialogChildren: [
					'factorio-title-bar transform-dialog__header upgrade-planner-selector__header',
					'factorio-frame factorio-frame--inside upgrade-planner-selector__inside-frame',
				],
				gridClass: 'factorio-frame factorio-frame--deep upgrade-planner-selector__grid',
				source: null,
				subheaderStyle: 'subheader_frame',
				websiteExtension: 'upgrade-planner-draft-loader',
			},
			tiles: expectedEditorTilePresentation,
		});
	});

	test('keeps selection separate from roving focus and activates editor choices non-directionally', async () => {
		const user = userEvent.setup();
		const onChoose = vi.fn<(choice: UpgradePlannerChoice, direction: UpgradeDirection) => void>();
		const onClose = vi.fn<() => void>();
		render(
			<UpgradePlannerSelectorDialog
				dialogId="upgrade-planner-selector"
				includeEditingChoices
				rootBlueprint={rootBlueprint}
				selectedSource="pasted"
				onChoose={onChoose}
				onClose={onClose}
			/>,
		);

		const grid = screen.getByRole('grid', {name: 'Upgrade planners'});
		const tiles = within(grid).getAllByRole<HTMLButtonElement>('button');
		expect({
			activeElement: document.activeElement?.getAttribute('aria-label'),
			tiles: tiles.map((tile) => ({
				label: tile.getAttribute('aria-label'),
				pressed: tile.getAttribute('aria-pressed'),
				tabIndex: tile.getAttribute('tabindex'),
			})),
		}).toStrictEqual({
			activeElement: 'Paste upgrade planner…',
			tiles: [
				{label: 'Default Upgrade', pressed: 'false', tabIndex: '-1'},
				{label: "Alice's fixture belt upgrades", pressed: 'false', tabIndex: '-1'},
				{label: 'Nested belt planner', pressed: 'false', tabIndex: '-1'},
				{label: 'Zero-match library planner', pressed: 'false', tabIndex: '-1'},
				{label: 'Empty Planner', pressed: 'false', tabIndex: '-1'},
				{label: 'Paste upgrade planner…', pressed: 'true', tabIndex: '0'},
			],
		});

		await user.keyboard('{Home}{ArrowRight}{End}{Enter}');

		expect({
			activeElement: document.activeElement?.getAttribute('aria-label'),
			closes: onClose.mock.calls,
			selections: onChoose.mock.calls,
		}).toStrictEqual({
			activeElement: 'Paste upgrade planner…',
			closes: [[]],
			selections: [[{label: 'Paste upgrade planner…', source: 'pasted'}, 'upgrade']],
		});
	});
});
