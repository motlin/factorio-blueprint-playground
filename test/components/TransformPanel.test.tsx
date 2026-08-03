import {fireEvent, render, screen, waitFor, within} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {Profiler} from 'react';
import {beforeEach, describe, expect, test, vi} from 'vite-plus/test';

import {TransformPanel} from '../../src/components/blueprint/panels/transform/TransformPanel';
import {BlueprintEditorSourceMode} from '../../src/components/blueprint/panels/transform/useBlueprintEditorDraft';
import {deserializeBlueprint, serializeBlueprint} from '../../src/parsing/blueprintParser';
import type {BlueprintString, BlueprintStringWithIndex, UpgradePlanner} from '../../src/parsing/types';
import {db, LIBRARY_ROOT_ID, type LibraryRecord} from '../../src/storage/db';
import {stripTiles, stripTrains} from '../../src/transform/strip';
import {parseUpgradePlanner} from '../../src/transform/upgradePlanner';
import {readFixtureFile} from '../fixtures/utils';

const {analysisCounts, libraryRecords, navigate} = vi.hoisted(() => ({
	analysisCounts: {metadataIcons: 0, upgradeRules: 0},
	libraryRecords: [] as LibraryRecord[],
	navigate: vi.fn<(options: unknown) => void>(),
}));

vi.mock('dexie-react-hooks', () => ({
	useLiveQuery: () => libraryRecords,
}));
vi.mock('@tanstack/react-router', async (importOriginal) => ({
	...(await importOriginal()),
	useNavigate: () => navigate,
}));
vi.mock('../../src/transform/metadataSubstitution', async (importOriginal) => {
	const original = await importOriginal<typeof import('../../src/transform/metadataSubstitution')>();
	return {
		...original,
		analyzeMetadataIcons: (...parameters: Parameters<typeof original.analyzeMetadataIcons>) => {
			analysisCounts.metadataIcons += 1;
			return original.analyzeMetadataIcons(...parameters);
		},
	};
});
vi.mock('../../src/transform/upgradePlanner', async (importOriginal) => {
	const original = await importOriginal<typeof import('../../src/transform/upgradePlanner')>();
	return {
		...original,
		analyzeUpgradeRules: (...parameters: Parameters<typeof original.analyzeUpgradeRules>) => {
			analysisCounts.upgradeRules += 1;
			return original.analyzeUpgradeRules(...parameters);
		},
	};
});

const blueprint: BlueprintString = {
	blueprint: {
		item: 'blueprint',
		version: 0,
		entities: [{entity_number: 1, name: 'transport-belt', position: {x: 0, y: 0}}],
	},
};
const rareBeltUpgradesPlanner: UpgradePlanner = {
	item: 'upgrade-planner',
	label: 'Rare belt upgrades',
	version: 0,
	settings: {
		description: 'Rare belt line',
		icons: [{index: 1, signal: {type: 'virtual', name: 'signal-red'}}],
		mappers: [
			{
				index: 1,
				from: {type: 'entity', name: 'assembling-machine-1'},
				to: {type: 'entity', name: 'assembling-machine-2'},
			},
			{
				index: 2,
				from: {type: 'entity', name: 'assembling-machine-2'},
				to: {type: 'entity', name: 'assembling-machine-3'},
			},
			{
				index: 3,
				from: {type: 'entity', name: 'inserter'},
				to: {type: 'entity', name: 'fast-inserter'},
			},
			{
				index: 4,
				from: {type: 'entity', name: 'fast-inserter'},
				to: {type: 'entity', name: 'bulk-inserter'},
			},
			{
				index: 5,
				from: {type: 'entity', name: 'splitter'},
				to: {type: 'entity', name: 'fast-splitter'},
			},
			{
				index: 6,
				from: {type: 'entity', name: 'fast-splitter'},
				to: {type: 'entity', name: 'express-splitter'},
			},
			{
				index: 7,
				from: {type: 'entity', name: 'express-splitter'},
				to: {type: 'entity', name: 'turbo-splitter'},
			},
			{
				index: 8,
				from: {type: 'entity', name: 'stone-furnace'},
				to: {type: 'entity', name: 'steel-furnace'},
			},
			{
				index: 9,
				from: {type: 'entity', name: 'transport-belt'},
				to: {type: 'entity', name: 'fast-transport-belt', quality: 'rare'},
			},
			{
				index: 10,
				from: {type: 'entity', name: 'fast-transport-belt'},
				to: {type: 'entity', name: 'express-transport-belt'},
			},
			{
				index: 11,
				from: {type: 'entity', name: 'express-transport-belt'},
				to: {type: 'entity', name: 'turbo-transport-belt'},
			},
			{
				index: 12,
				from: {type: 'entity', name: 'underground-belt'},
				to: {type: 'entity', name: 'fast-underground-belt'},
			},
			{
				index: 13,
				from: {type: 'entity', name: 'fast-underground-belt'},
				to: {type: 'entity', name: 'express-underground-belt'},
			},
			{
				index: 14,
				from: {type: 'entity', name: 'express-underground-belt'},
				to: {type: 'entity', name: 'turbo-underground-belt'},
			},
		],
	},
};
let nextLibraryRecordNumber = 1;
const mappingInstructions =
	'Drag this From and To pair to move it, or focus either endpoint and press Control plus an arrow key. Press Delete to clear the focused endpoint.';

function openUpgradePlanner() {
	fireEvent.click(screen.getByRole('button', {name: 'Open Upgrade Planner'}));
}

function openBlueprintEditor() {
	fireEvent.click(screen.getByRole('button', {name: 'Open Blueprint Editor'}));
}

async function choosePlanner(user: ReturnType<typeof userEvent.setup>, label: string) {
	await user.click(screen.getByRole('button', {name: 'Load planner to replace draft'}));
	await user.click(screen.getByRole('button', {name: label}));
}

async function chooseSignal(user: ReturnType<typeof userEvent.setup>, label: string) {
	if (screen.queryByRole('button', {name: `Choose ${label}`}) === null && label.startsWith('Signal ')) {
		await user.click(screen.getByRole('tab', {name: 'Signals'}));
	}
	if (screen.queryByRole('button', {name: `Choose ${label}`}) === null) {
		await searchSignals(user, label);
	}
	await user.click(screen.getByRole('button', {name: `Choose ${label}`}));
	const confirm = screen.queryByRole('button', {name: 'Confirm'});
	if (confirm !== null) {
		await user.click(confirm);
	}
}

async function searchSignals(user: ReturnType<typeof userEvent.setup>, searchText: string) {
	if (screen.queryByRole('searchbox', {name: 'Search'}) === null) {
		await user.click(screen.getByRole('button', {name: 'Search'}));
	}
	const search = screen.getByRole('searchbox', {name: 'Search'});
	await user.clear(search);
	await user.type(search, searchText);
}

function choosePlannerWithClicks(label: string) {
	fireEvent.click(screen.getByRole('button', {name: 'Load planner to replace draft'}));
	fireEvent.click(screen.getByRole('button', {name: label}));
}

function chooseSignalWithClicks(label: string) {
	if (screen.queryByRole('button', {name: `Choose ${label}`}) === null && label.startsWith('Signal ')) {
		fireEvent.click(screen.getByRole('tab', {name: 'Signals'}));
	}
	if (screen.queryByRole('button', {name: `Choose ${label}`}) === null) {
		if (screen.queryByRole('searchbox', {name: 'Search'}) === null) {
			fireEvent.click(screen.getByRole('button', {name: 'Search'}));
		}
		fireEvent.change(screen.getByRole('searchbox', {name: 'Search'}), {target: {value: label}});
	}
	fireEvent.click(screen.getByRole('button', {name: `Choose ${label}`}));
	const confirm = screen.queryByRole('button', {name: 'Confirm'});
	if (confirm !== null) {
		fireEvent.click(confirm);
	}
}

function firstEmptyMappingSourceButton(): HTMLButtonElement {
	const [button] = screen.getAllByRole<HTMLButtonElement>('button', {name: 'Choose source for new mapping'});
	return button;
}

function renderedMappingRows(): HTMLElement[] {
	return [...document.querySelectorAll<HTMLElement>('[data-mapping-key]')];
}

function mappingSlotIndex(button: HTMLElement): number {
	const row = button.closest('[data-mapping-key]');
	const parent = row?.parentElement;
	if (parent === null || parent === undefined) {
		throw new Error('Expected the mapping button to belong to a planner slot.');
	}
	return [...parent.children].indexOf(row!);
}

function accessibleName(element: Element): string | null {
	const explicitLabel = element.getAttribute('aria-label');
	if (explicitLabel !== null) {
		return explicitLabel;
	}
	const labelledBy = element.getAttribute('aria-labelledby');
	if (labelledBy !== null) {
		return document.getElementById(labelledBy)?.textContent ?? null;
	}
	if (
		element instanceof HTMLButtonElement ||
		element instanceof HTMLInputElement ||
		element instanceof HTMLSelectElement ||
		element instanceof HTMLTextAreaElement
	) {
		return element.labels?.[0]?.textContent ?? element.textContent;
	}
	return element.textContent;
}

function interactionState() {
	const activeElement = document.activeElement;
	return {
		activeElement:
			activeElement === null
				? null
				: {
						name: accessibleName(activeElement),
						tagName: activeElement.tagName,
					},
		dialogStack: [...document.querySelectorAll<HTMLElement>('[role="dialog"], [role="alertdialog"]')].map(
			(dialog) => ({
				ariaHidden: dialog.getAttribute('aria-hidden'),
				inert: dialog.inert,
				modal: dialog.getAttribute('aria-modal'),
				name: accessibleName(dialog),
				role: dialog.getAttribute('role'),
			}),
		),
	};
}

async function applyPlanner(user: ReturnType<typeof userEvent.setup>, direction: 'upgrade' | 'downgrade' = 'upgrade') {
	await user.click(
		screen.getByRole('button', {
			name: new RegExp(`^Apply ${direction === 'upgrade' ? 'Upgrade' : 'Downgrade'} to `),
		}),
	);
}

function storedPlanner(id: string, planner: UpgradePlanner, label: string, position: number): LibraryRecord {
	return {
		id,
		createdOn: 0,
		updatedOn: 0,
		data: serializeBlueprint({upgrade_planner: planner}),
		gameData: {type: 'upgrade_planner', label, icons: []},
		parentId: LIBRARY_ROOT_ID,
		position,
	};
}

function largeNestedBookFixture() {
	const rootBlueprint = deserializeBlueprint(readFixtureFile('txt/nested-book.txt'));
	const book = rootBlueprint.blueprint_book;
	const selectedBlueprint = book?.blueprints[0];
	const nestedBook = book?.blueprints[1];
	if (book === undefined || selectedBlueprint?.blueprint === undefined || nestedBook === undefined) {
		throw new Error('Expected the nested-book fixture to contain a blueprint followed by a nested book.');
	}
	selectedBlueprint.blueprint.icons = [{index: 1, signal: {type: 'virtual', name: 'signal-red'}}];
	book.blueprints = [
		selectedBlueprint,
		...Array.from({length: 100}, (_, index) => ({
			...structuredClone(nestedBook),
			index: (index + 1) * 100,
		})),
	];
	return {rootBlueprint, selectedBlueprint};
}

describe('TransformPanel golden source-contract interaction sequences', () => {
	beforeEach(() => {
		vi.restoreAllMocks();
		analysisCounts.metadataIcons = 0;
		analysisCounts.upgradeRules = 0;
		libraryRecords.length = 0;
		navigate.mockReset();
		nextLibraryRecordNumber = 1;
		vi.spyOn(db, 'listLibraryChildren').mockImplementation(async (parentId) =>
			Promise.resolve(libraryRecords.filter((record) => record.parentId === parentId)),
		);
		vi.spyOn(db, 'saveLibraryCopy').mockImplementation(async (input) => {
			const record: LibraryRecord = {
				id: `saved-planner-${nextLibraryRecordNumber.toString()}`,
				createdOn: nextLibraryRecordNumber,
				updatedOn: nextLibraryRecordNumber,
				data: input.data,
				gameData: structuredClone(input.gameData),
				selection: input.selection,
				parentId: input.destination.parentId,
				position: input.destination.position,
			};
			nextLibraryRecordNumber += 1;
			libraryRecords.push(record);
			return Promise.resolve(record);
		});
		vi.spyOn(db, 'updateLibraryRecord').mockImplementation(async (input) => {
			const index = libraryRecords.findIndex((record) => record.id === input.id);
			if (index < 0) {
				throw new Error(`Missing library record: ${input.id}`);
			}
			const current = libraryRecords[index];
			const record: LibraryRecord = {
				...current,
				...structuredClone(input.content),
				updatedOn: current.updatedOn + 1,
			};
			libraryRecords[index] = record;
			return Promise.resolve(record);
		});
		vi.spyOn(db, 'deleteLibraryRecord').mockImplementation(async ({id}) => {
			await Promise.resolve();
			const index = libraryRecords.findIndex((record) => record.id === id);
			if (index < 0) {
				throw new Error(`Missing library record: ${id}`);
			}
			libraryRecords.splice(index, 1);
		});
	});

	test('renders nothing without a blueprint or for a deconstruction planner', () => {
		const {container, rerender} = render(<TransformPanel />);
		expect(container.innerHTML).toBe('');

		rerender(
			<TransformPanel
				blueprint={{
					deconstruction_planner: {item: 'deconstruction-planner', version: 0, settings: {}},
				}}
			/>,
		);
		expect(container.innerHTML).toBe('');
	});

	test('keeps transforms in a compact toolbelt and shows visual mappings in the popup', () => {
		render(<TransformPanel blueprint={blueprint} />);

		expect({
			applyButton: screen.queryByRole('button', {name: 'Apply changes'}),
			blueprintEditorExpanded: screen
				.getByRole('button', {name: 'Open Blueprint Editor'})
				.getAttribute('aria-expanded'),
			dialog: screen.queryByRole('dialog', {name: 'Upgrade Planner'}),
			toolOrder: [...screen.getByRole('toolbar', {name: 'Blueprint tools'}).querySelectorAll('button')].map(
				(button) => button.getAttribute('aria-label'),
			),
			toolExpanded: screen.getByRole('button', {name: 'Open Upgrade Planner'}).getAttribute('aria-expanded'),
		}).toStrictEqual({
			applyButton: null,
			blueprintEditorExpanded: 'false',
			dialog: null,
			toolOrder: ['Open Blueprint Editor', 'Open Upgrade Planner'],
			toolExpanded: 'false',
		});

		openUpgradePlanner();
		const dialog = screen.getByRole('dialog', {name: 'Upgrade Planner'});
		const body = dialog.querySelector<HTMLElement>('.upgrade-planner-dialog__body');
		if (body === null) {
			throw new Error('Expected the Upgrade Planner body.');
		}
		const editor = within(dialog).getByRole('region', {name: 'Upgrade planner editor'});
		const mapperScroll = within(editor).getByRole('region', {name: 'Upgrade mappings'});
		const application = within(dialog)
			.getByRole('heading', {name: 'Website application'})
			.closest<HTMLElement>('section');
		if (application === null) {
			throw new Error('Expected the website application section.');
		}
		const loader = application.querySelector<HTMLElement>('.upgrade-planner-loader');
		if (loader === null) {
			throw new Error('Expected the planner draft loader.');
		}
		const loadPlanner = within(loader).getByRole('button', {name: 'Load planner to replace draft'});
		const draftSource = within(loader).getByLabelText('Draft source: Default Upgrade');
		const dialogHeading = within(dialog).getByRole('heading', {name: 'Upgrade Planner'});
		const plannerContext = within(dialog).getByRole('navigation', {
			name: 'Upgrade planner blueprint context',
		});
		const plannerScope = within(dialog).getByRole('radiogroup', {name: 'Apply mappings to'});
		expect(dialog.getAttribute('aria-labelledby')).toBe(dialogHeading.id);
		expect({
			applicationExtension: application.dataset.websiteExtension,
			bodyClass: body.className,
			bookWidePanel: within(body).getByRole('heading', {name: 'Book-wide replacements'}).closest('section')
				?.className,
			changeIn: screen.queryByRole('group', {name: 'Change in'}),
			closeButton: within(dialog).getByRole('button', {name: 'Close Upgrade Planner'}).getAttribute('aria-label'),
			closeSource: within(dialog)
				.getByRole('button', {name: 'Close Upgrade Planner'})
				.getAttribute('data-factorio-source'),
			context: plannerContext.textContent,
			contextExtension: plannerContext.parentElement?.dataset.websiteExtension,
			dialog: dialog.getAttribute('aria-modal'),
			editorClass: editor.className,
			editorStyle: editor.dataset.factorioStyle,
			exportActions: ['Copy String', 'Copy JSON', 'Download String', 'Open in Playground'].map((name) =>
				screen.queryByRole('button', {name}),
			),
			fillerStyle: editor.querySelector<HTMLElement>('.upgrade-planner-dialog__filler')?.dataset.factorioStyle,
			footerElement: dialog.lastElementChild?.tagName,
			footerExtension:
				dialog.lastElementChild instanceof HTMLElement
					? dialog.lastElementChild.dataset.websiteExtension
					: undefined,
			fromToGroup: within(editor).getByRole('group', {name: 'From and To mappings'}).getAttribute('aria-label'),
			headerElement: dialog.firstElementChild?.tagName,
			headerIcon: dialog.querySelector('.upgrade-planner-dialog__identity-icon img')?.getAttribute('src'),
			headerSource: dialog.firstElementChild?.getAttribute('data-factorio-source'),
			libraryState: within(dialog).getByLabelText('Planner library status').textContent,
			liveResult: screen.queryByText('Live result'),
			loader: {
				button: {
					describedSource: document
						.getElementById(loadPlanner.getAttribute('aria-describedby') ?? '')
						?.getAttribute('aria-label'),
					expanded: loadPlanner.getAttribute('aria-expanded'),
					text: loadPlanner.textContent,
					websiteAction: loadPlanner.getAttribute('data-website-action'),
				},
				source: {
					icon: draftSource.querySelector('img')?.getAttribute('src'),
					label: draftSource.querySelector('strong')?.textContent,
				},
			},
			loaderInsideEditor: within(editor).queryByText('Load planner'),
			loaderExtension:
				application.querySelector<HTMLElement>('.upgrade-planner-loader')?.dataset.websiteExtension,
			mapperClass: mapperScroll.className,
			mapperStyle: mapperScroll.dataset.factorioStyle,
			mappingHeadingGroups: [...editor.querySelectorAll('.upgrade-mapping-grid__headings > div')].map(
				(group) => group.textContent,
			),
			mappingSlots: editor.querySelectorAll('[data-upgrade-mapping-slot]').length,
			modeButtons: ['Upgrade', 'Downgrade', 'Strip quality'].map((name) => screen.queryByRole('button', {name})),
			nativeScopeSelect: within(dialog).queryByRole('combobox', {name: 'Apply to'}),
			operationButtons: [
				'Save Planner',
				'Apply Upgrade to Current Blueprint',
				'Apply Downgrade to Current Blueprint',
			].map((name) => screen.queryByRole('button', {name})?.textContent ?? null),
			preserveCapitalization: screen.queryByRole('checkbox', {name: 'Preserve capitalization'}),
			scopeExtension: plannerScope.dataset.websiteExtension,
			scopeOptions: within(plannerScope)
				.getAllByRole<HTMLInputElement>('radio')
				.map((radio) => ({
					checked: radio.checked,
					disabled: radio.disabled,
					label: radio.parentElement?.textContent,
					value: radio.value,
				})),
			sectionOrder: [...body.children].map(
				(section) =>
					section.getAttribute('data-factorio-style') ?? section.getAttribute('data-website-extension'),
			),
			scrollTabIndex: mapperScroll.tabIndex,
			sourceIcon: screen
				.getByRole('button', {name: 'Choose source, currently Transport belt'})
				.querySelector('img')
				?.getAttribute('src'),
			targetIcon: screen
				.getByRole('button', {name: 'Choose target for Transport belt'})
				.querySelector('img')
				?.getAttribute('src'),
			bookWideReplacements: screen.getByRole('heading', {name: 'Book-wide replacements'}).textContent,
			websiteLabel: within(dialog).queryByText('Website extension')?.textContent,
		}).toStrictEqual({
			applicationExtension: 'planner-application',
			bodyClass: 'upgrade-planner-dialog__body',
			bookWidePanel: 'panel-hole transform-workflow__section book-wide-replacements',
			changeIn: null,
			closeButton: 'Close Upgrade Planner',
			closeSource: 'GameGuiWithControllerInventory::closeButton',
			context: 'This blueprint or book›Untitled blueprint',
			contextExtension: 'planner-context',
			dialog: 'true',
			editorClass: 'factorio-frame factorio-frame--shallow upgrade-planner-dialog__editor-shell',
			editorStyle: 'entity_frame',
			exportActions: [null, null, null, null],
			fillerStyle: 'entity_frame_filler',
			footerElement: 'FOOTER',
			footerExtension: 'planner-actions',
			fromToGroup: 'From and To mappings',
			headerElement: 'HEADER',
			headerIcon: 'https://factorio-icon-cdn.pages.dev/item/upgrade-planner.webp',
			headerSource: 'UpgradeItemGui::UpgradeItemGui',
			libraryState: 'Local draft · not in Blueprint Library',
			liveResult: null,
			loader: {
				button: {
					describedSource: 'Draft source: Default Upgrade',
					expanded: 'false',
					text: 'Load planner…',
					websiteAction: 'replace-planner-draft',
				},
				source: {
					icon: 'https://factorio-icon-cdn.pages.dev/item/upgrade-planner.webp',
					label: 'Default Upgrade',
				},
			},
			loaderInsideEditor: null,
			loaderExtension: 'planner-library-loader',
			mapperClass: 'factorio-scroll-frame upgrade-planner-dialog__scroll-region',
			mapperStyle: 'mappers_scroll_pane',
			mappingHeadingGroups: ['FromTo', 'FromTo', 'FromTo', 'FromTo'],
			mappingSlots: 20,
			modeButtons: [null, null, null],
			nativeScopeSelect: null,
			operationButtons: [
				'Save Planner',
				'Apply Upgrade to Current Blueprint',
				'Apply Downgrade to Current Blueprint',
			],
			preserveCapitalization: null,
			scopeExtension: 'planner-application-scope',
			scopeOptions: [
				{
					checked: true,
					disabled: false,
					label: 'Current selectionThis blueprint or book',
					value: 'selection',
				},
			],
			sectionOrder: ['entity_frame', 'planner-application', null],
			scrollTabIndex: 0,
			sourceIcon: 'https://factorio-icon-cdn.pages.dev/entity/transport-belt.webp',
			targetIcon: 'https://factorio-icon-cdn.pages.dev/entity/fast-transport-belt.webp',
			bookWideReplacements: 'Book-wide replacements',
			websiteLabel: 'Website extension',
		});
	});

	test('returns focus to the Upgrade Planner tool after its dialog closes', async () => {
		const user = userEvent.setup();
		render(<TransformPanel blueprint={blueprint} />);
		const tool = screen.getByRole('button', {name: 'Open Upgrade Planner'});

		await user.click(tool);
		expect(document.activeElement).toBe(screen.getByRole('region', {name: 'Upgrade mappings'}));

		await user.click(screen.getByRole('button', {name: 'Close Upgrade Planner'}));
		await waitFor(() => {
			expect(document.activeElement).toBe(tool);
		});
	});

	test('isolates the dirty-close confirmation and restores focus through the planner stack', async () => {
		const user = userEvent.setup();
		render(<TransformPanel blueprint={blueprint} />);
		const tool = screen.getByRole('button', {name: 'Open Upgrade Planner'});

		await user.click(tool);
		await user.click(screen.getByRole('button', {name: 'Edit planner name'}));
		const plannerName = screen.getByRole('textbox', {name: 'Name'});
		await user.clear(plannerName);
		await user.type(plannerName, 'Dirty planner');
		await user.click(screen.getByRole('button', {name: 'Confirm planner metadata'}));
		const closePlanner = screen.getByRole('button', {name: 'Close Upgrade Planner'});
		await user.click(closePlanner);

		const confirmation = screen.getByRole('alertdialog', {name: 'Discard unsaved changes?'});
		expect(interactionState()).toStrictEqual({
			activeElement: {name: 'Keep editing', tagName: 'BUTTON'},
			dialogStack: [
				{
					ariaHidden: 'true',
					inert: true,
					modal: 'true',
					name: 'Upgrade Planner',
					role: 'dialog',
				},
				{
					ariaHidden: null,
					inert: false,
					modal: 'true',
					name: 'Discard unsaved changes?',
					role: 'alertdialog',
				},
			],
		});

		tool.focus();
		expect(document.activeElement).toBe(within(confirmation).getByRole('button', {name: 'Keep editing'}));

		fireEvent.keyDown(window, {key: 'Escape'});
		await waitFor(() => {
			expect(screen.queryByRole('alertdialog', {name: 'Discard unsaved changes?'})).toBeNull();
			expect(document.activeElement).toBe(closePlanner);
		});
		expect(screen.getByRole('dialog', {name: 'Upgrade Planner'}).inert).toBe(false);

		await user.click(closePlanner);
		await user.click(
			within(screen.getByRole('alertdialog', {name: 'Discard unsaved changes?'})).getByRole('button', {
				name: 'Discard changes',
			}),
		);
		await waitFor(() => {
			expect(screen.queryByRole('dialog', {name: 'Upgrade Planner'})).toBeNull();
			expect(document.activeElement).toBe(tool);
		});
	});

	test('bounds renders and analysis while editing mappings and icons in a large nested book', async () => {
		const user = userEvent.setup();
		const {rootBlueprint, selectedBlueprint} = largeNestedBookFixture();
		const commits: string[] = [];
		render(
			<Profiler
				id="transform-panel"
				onRender={(id, phase) => {
					commits.push(`${id}:${phase}`);
				}}
			>
				<TransformPanel blueprint={selectedBlueprint} rootBlueprint={rootBlueprint} selectedPath="1" />
			</Profiler>,
		);
		const initialCommitCount = commits.length;
		let previousCommitCount = commits.length;
		const commitsSincePreviousInteraction = () => {
			const count = commits.length - previousCommitCount;
			previousCommitCount = commits.length;
			return count;
		};

		openUpgradePlanner();
		const openPlannerCommitCount = commitsSincePreviousInteraction();
		await choosePlanner(user, 'Empty Planner');
		const loadEmptyPlannerCommitCount = commitsSincePreviousInteraction();

		await user.click(screen.getByRole('radio', {name: /^Entire book/}));
		const rootScopeCommitCount = commitsSincePreviousInteraction();
		await user.click(firstEmptyMappingSourceButton());
		await chooseSignal(user, 'Transport belt');
		await user.click(screen.getByRole('button', {name: 'Choose target for Transport belt'}));
		await chooseSignal(user, 'Fast transport belt');
		const firstMappingCommitCount = commitsSincePreviousInteraction();

		await user.click(firstEmptyMappingSourceButton());
		await chooseSignal(user, 'Fast inserter');
		await user.click(screen.getByRole('button', {name: 'Choose target for Fast inserter'}));
		await chooseSignal(user, 'Inserter');
		const secondMappingCommitCount = commitsSincePreviousInteraction();

		await user.click(screen.getByRole('button', {name: /Icon replacements/i}));
		await user.click(screen.getByRole('button', {name: 'Choose source icon'}));
		await chooseSignal(user, 'Signal red');
		await user.click(screen.getByRole('button', {name: 'Choose target icon'}));
		await chooseSignal(user, 'Signal blue');
		await user.click(screen.getByRole('button', {name: 'Done'}));
		const iconChangeCommitCount = commitsSincePreviousInteraction();

		expect({
			analysisCounts,
			mappings: renderedMappingRows().map((row) => row.getAttribute('aria-label')),
			renderCommits: {
				firstMapping: firstMappingCommitCount,
				iconChange: iconChangeCommitCount,
				initial: initialCommitCount,
				loadEmptyPlanner: loadEmptyPlannerCommitCount,
				openPlanner: openPlannerCommitCount,
				rootScope: rootScopeCommitCount,
				secondMapping: secondMappingCommitCount,
			},
		}).toStrictEqual({
			analysisCounts: {
				metadataIcons: 1,
				upgradeRules: 8,
			},
			mappings: ['Mapping from Transport belt to Fast transport belt', 'Mapping from Fast inserter to Inserter'],
			renderCommits: {
				firstMapping: 6,
				iconChange: 6,
				initial: 1,
				loadEmptyPlanner: 4,
				openPlanner: 1,
				rootScope: 1,
				secondMapping: 6,
			},
		});
	});

	test('keeps blueprint editing in its own popup', () => {
		const filterBlueprint: BlueprintString = {
			blueprint: {
				item: 'blueprint',
				version: 0,
				entities: [
					{
						entity_number: 1,
						name: 'assembling-machine-1',
						position: {x: 0, y: 0},
						items: [
							{
								id: {name: 'speed-module'},
								items: {in_inventory: [{inventory: 1, stack: 0, count: 1}]},
							},
						],
					},
					{entity_number: 2, name: 'locomotive', position: {x: 1, y: 0}},
				],
				tiles: [{name: 'landfill', position: {x: 0, y: 0}}],
			},
		};
		render(<TransformPanel blueprint={filterBlueprint} />);

		openBlueprintEditor();
		const dialog = screen.getByRole('dialog', {name: 'Blueprint Editor'});
		const settings = screen.getByRole('region', {name: 'Blueprint settings'});
		const settingsScroll = settings.querySelector('.blueprint-editor__settings-scroll');
		expect({
			bookWideReplacements: screen.queryByRole('heading', {name: 'Book-wide replacements'}),
			bodyClass: dialog.querySelector('.transform-workbench__body')?.className,
			bodySource: dialog.querySelector('.transform-workbench__body')?.getAttribute('data-factorio-source'),
			cleanup: screen.queryByRole('heading', {name: 'Cleanup'}),
			components: screen.getByRole('heading', {name: 'Components'}).textContent,
			description: screen.getByRole('textbox', {name: 'Blueprint description'}).textContent,
			dialog: dialog.getAttribute('aria-modal'),
			dialogSource: dialog.getAttribute('data-factorio-source'),
			footerElement: dialog.lastElementChild?.tagName,
			filters: ['Modules', 'Entities', 'Trains', 'Tiles'].map(
				(name) => screen.getByRole<HTMLInputElement>('checkbox', {name}).checked,
			),
			headerElement: dialog.firstElementChild?.tagName,
			iconReplacements: screen.queryByRole('button', {name: /Icon replacements/}),
			iconSlots: [1, 2, 3, 4].map((index) =>
				screen.getByRole('button', {name: `Choose icon ${index.toString()}`}).getAttribute('aria-label'),
			),
			title: dialog.querySelector('.blueprint-editor__title')?.textContent,
			plannerMappings: screen.queryByRole('group', {name: 'Planner operation'}),
			preview: screen.queryByRole('heading', {name: 'Preview'}),
			previewRegion: dialog.querySelector('[data-blueprint-preview]'),
			saveDestination: screen.queryByLabelText('Save destination'),
			settingsHeadings: [...(settingsScroll?.querySelectorAll('h4') ?? [])].map((heading) =>
				heading.textContent.trim(),
			),
			settingsScrollStyle: settingsScroll?.getAttribute('data-factorio-style'),
			settingsSource: settings.getAttribute('data-factorio-source'),
			textReplacement: screen.queryByRole('checkbox', {name: /Text replacement/}),
		}).toStrictEqual({
			bookWideReplacements: null,
			bodyClass: 'transform-workbench__body blueprint-editor__layout',
			bodySource: 'BlueprintSetupGui::insetFrameContainerHorizontalFlow',
			cleanup: null,
			components: 'Components',
			description: '',
			dialog: 'true',
			dialogSource: 'BlueprintSetupGui::BlueprintSetupGui',
			footerElement: 'FOOTER',
			filters: [true, true, true, true],
			headerElement: 'HEADER',
			iconReplacements: null,
			iconSlots: ['Choose icon 1', 'Choose icon 2', 'Choose icon 3', 'Choose icon 4'],
			title: '<Unnamed blueprint>',
			plannerMappings: null,
			preview: null,
			previewRegion: null,
			saveDestination: null,
			settingsHeadings: ['Icon', 'Description', 'Snap to grid', 'Components', 'Filters'],
			settingsScrollStyle: 'scroll_pane_under_subheader',
			settingsSource: 'BlueprintSettingsGui::BlueprintSettingsGui',
			textReplacement: null,
		});
	});

	test('applies a planner directly from the editor selector while preserving the draft', async () => {
		const user = userEvent.setup();
		render(<TransformPanel blueprint={blueprint} />);

		openBlueprintEditor();
		const blueprintEditor = screen.getByRole('dialog', {name: 'Blueprint Editor'});
		const upgradeButton = screen.getByRole<HTMLButtonElement>('button', {
			name: 'Upgrade items and entities in the blueprint',
		});
		expect({
			controlledDialog: document.getElementById(upgradeButton.getAttribute('aria-controls') ?? ''),
			disabled: upgradeButton.disabled,
			expanded: upgradeButton.getAttribute('aria-expanded'),
			icon: upgradeButton.querySelector('img')?.getAttribute('src'),
			iconSize: upgradeButton.querySelector('[data-factorio-icon-size]')?.getAttribute('data-factorio-icon-size'),
			inTitleRow: upgradeButton.closest('.blueprint-editor__title-row') !== null,
			title: upgradeButton.title,
			toolbarActions: [
				...screen.getByRole('toolbar', {name: 'Blueprint editor actions'}).querySelectorAll('button'),
			].map((button) => button.getAttribute('aria-label')),
		}).toStrictEqual({
			controlledDialog: null,
			disabled: false,
			expanded: 'false',
			icon: 'https://factorio-icon-cdn.pages.dev/item/upgrade-planner.webp',
			iconSize: 'small',
			inTitleRow: true,
			title: 'Upgrade items and entities in the blueprint.',
			toolbarActions: [
				'Upgrade items and entities in the blueprint',
				'Parametrise or reconfigure the blueprint',
				'Choose or drop an upgrade planner to hold',
			],
		});

		expect(fireEvent.contextMenu(upgradeButton)).toBe(false);
		const selector = screen.getByRole('dialog', {name: 'Select the upgrade planner to apply'});
		expect({
			blueprintEditorAriaHidden: blueprintEditor.getAttribute('aria-hidden'),
			blueprintEditorInert: blueprintEditor.inert,
			controls: upgradeButton.getAttribute('aria-controls'),
			expanded: upgradeButton.getAttribute('aria-expanded'),
			selector: selector.getAttribute('aria-modal'),
			standalonePlanner: screen.queryByRole('dialog', {name: 'Upgrade Planner'}),
		}).toStrictEqual({
			blueprintEditorAriaHidden: 'true',
			blueprintEditorInert: true,
			controls: selector.id,
			expanded: 'true',
			selector: 'true',
			standalonePlanner: null,
		});

		await user.click(screen.getByRole('button', {name: 'Close upgrade planner selector'}));
		const description = screen.getByRole<HTMLTextAreaElement>('textbox', {name: 'Blueprint description'});
		await user.type(description, 'Draft description');
		const draftUpgradeButton = screen.getByRole<HTMLButtonElement>('button', {
			name: 'Upgrade items and entities in the blueprint',
		});
		await user.click(draftUpgradeButton);
		expect({
			description: description.value,
			disabled: draftUpgradeButton.disabled,
			expanded: draftUpgradeButton.getAttribute('aria-expanded'),
			selector: screen
				.getByRole('dialog', {name: 'Select the upgrade planner to apply'})
				.getAttribute('aria-modal'),
		}).toStrictEqual({description: 'Draft description', disabled: false, expanded: 'true', selector: 'true'});

		await user.click(screen.getByRole('button', {name: /Default Upgrade/}));
		expect({
			navigation: navigate.mock.calls,
			blueprintEditor: screen.queryByRole('dialog', {name: 'Blueprint Editor'}),
			selector: screen.queryByRole('dialog', {name: 'Select the upgrade planner to apply'}),
		}).toStrictEqual({
			blueprintEditor: null,
			navigation: [
				[
					{
						to: '/',
						search: {
							pasted: serializeBlueprint({
								blueprint: {
									item: 'blueprint',
									version: 0,
									entities: [{entity_number: 1, name: 'fast-transport-belt', position: {x: 0, y: 0}}],
									description: 'Draft description',
								},
							}),
							selection: '',
						},
					},
				],
			],
			selector: null,
		});
	});

	test('accepts serialized planner drops, rejects invalid drops, and clears the placed planner', async () => {
		const user = userEvent.setup();
		const droppedPlanner: BlueprintString = {
			upgrade_planner: {
				item: 'upgrade-planner',
				label: "Alice's dropped planner",
				version: 0,
				settings: {
					mappers: [
						{
							index: 100,
							from: {type: 'entity', name: 'transport-belt'},
							to: {type: 'entity', name: 'express-transport-belt'},
						},
					],
				},
			},
		};
		render(<TransformPanel blueprint={blueprint} />);

		openBlueprintEditor();
		const emptySlot = screen.getByRole('button', {name: 'Choose or drop an upgrade planner to hold'});
		emptySlot.focus();
		await user.keyboard('{Enter}');
		expect(
			screen.getByRole('dialog', {name: 'Select the upgrade planner to apply'}).getAttribute('aria-modal'),
		).toBe('true');
		await user.click(screen.getByRole('button', {name: 'Close upgrade planner selector'}));

		fireEvent.drop(emptySlot, {
			dataTransfer: {
				getData: () => 'not an upgrade planner',
			},
		});
		expect({
			error: screen.getByRole('alert').textContent,
			slot: screen.getByRole('button', {name: 'Choose or drop an upgrade planner to hold'}).textContent,
		}).toStrictEqual({
			error: 'Drop an encoded or JSON upgrade planner.',
			slot: '+',
		});

		fireEvent.drop(emptySlot, {
			dataTransfer: {
				getData: () => serializeBlueprint(droppedPlanner),
			},
		});
		const placedSlot = screen.getByRole('button', {
			name: "Held upgrade planner Alice's dropped planner; click to replace",
		});
		expect({
			apply: screen
				.getByRole('button', {name: 'Upgrade items and entities in the blueprint'})
				.getAttribute('aria-controls'),
			error: screen.queryByRole('alert'),
			icon: placedSlot.querySelector('img')?.getAttribute('src'),
			navigation: navigate.mock.calls,
		}).toStrictEqual({
			apply: null,
			error: null,
			icon: 'https://factorio-icon-cdn.pages.dev/item/upgrade-planner.webp',
			navigation: [],
		});

		placedSlot.focus();
		await user.keyboard('{Delete}');
		expect({
			apply: screen
				.getByRole('button', {
					name: 'Upgrade items and entities in the blueprint',
				})
				.getAttribute('aria-expanded'),
			heldPlanner: screen.queryByRole('button', {
				name: "Held upgrade planner Alice's dropped planner; click to replace",
			}),
			slot: screen.getByRole('button', {name: 'Choose or drop an upgrade planner to hold'}).textContent,
		}).toStrictEqual({
			apply: 'false',
			heldPlanner: null,
			slot: '+',
		});
	});

	test.each([
		{direction: 'upgrade', expectedEntity: 'fast-transport-belt', startingEntity: 'transport-belt'},
		{direction: 'downgrade', expectedEntity: 'transport-belt', startingEntity: 'fast-transport-belt'},
	])(
		'applies a $direction gesture to the selected child and closes the editor',
		async ({direction, expectedEntity, startingEntity}) => {
			const user = userEvent.setup();
			const selectedChild: BlueprintStringWithIndex = {
				index: 100,
				blueprint: {
					item: 'blueprint',
					version: 0,
					entities: [{entity_number: 1, name: startingEntity, position: {x: 0, y: 0}}],
				},
			};
			const untouchedChild: BlueprintStringWithIndex = {
				index: 200,
				blueprint: {
					item: 'blueprint',
					version: 0,
					entities: [{entity_number: 1, name: 'assembling-machine-1', position: {x: 0, y: 0}}],
				},
			};
			const rootBook: BlueprintString = {
				blueprint_book: {
					item: 'blueprint-book',
					version: 0,
					blueprints: [selectedChild, untouchedChild],
				},
			};
			render(<TransformPanel blueprint={selectedChild} rootBlueprint={rootBook} selectedPath="1" />);

			openBlueprintEditor();
			await user.click(screen.getByRole('button', {name: 'Upgrade items and entities in the blueprint'}));
			const planner = screen.getByRole('button', {name: /Default Upgrade/});
			if (direction === 'upgrade') {
				await user.click(planner);
			} else {
				planner.focus();
				await user.keyboard('{Shift>}{Enter}{/Shift}');
			}
			expect({
				blueprintEditor: screen.queryByRole('dialog', {name: 'Blueprint Editor'}),
				navigation: navigate.mock.calls,
				selector: screen.queryByRole('dialog', {name: 'Select the upgrade planner to apply'}),
			}).toStrictEqual({
				blueprintEditor: null,
				navigation: [
					[
						{
							to: '/',
							search: {
								pasted: serializeBlueprint({
									blueprint_book: {
										item: 'blueprint-book',
										version: 0,
										blueprints: [
											{
												...selectedChild,
												blueprint: {
													...selectedChild.blueprint!,
													entities: [
														{
															entity_number: 1,
															name: expectedEntity,
															position: {x: 0, y: 0},
														},
													],
												},
											},
											untouchedChild,
										],
									},
								}),
								selection: '1',
							},
						},
					],
				],
				selector: null,
			});
		},
	);

	test('saves a planner to the library without applying and persists the full record', async () => {
		const user = userEvent.setup();
		render(<TransformPanel blueprint={blueprint} />);

		openUpgradePlanner();
		await user.click(screen.getByRole('button', {name: 'Choose target for Transport belt'}));
		await user.click(screen.getByRole('button', {name: 'Rare quality'}));
		await chooseSignal(user, 'Fast transport belt');
		await user.click(screen.getByRole('button', {name: 'Edit planner name'}));
		const plannerName = screen.getByRole('textbox', {name: 'Name'});
		await user.clear(plannerName);
		await user.type(plannerName, 'Rare belt upgrades');
		await user.type(screen.getByRole('textbox', {name: 'Planner description'}), 'Rare belt line');
		await user.click(screen.getByRole('button', {name: 'Choose preview icon 1'}));
		await chooseSignal(user, 'Signal red');
		await user.click(screen.getByRole('button', {name: 'Confirm planner metadata'}));
		await user.click(screen.getByRole('button', {name: 'Save Planner'}));
		const savePrompt = screen.getByRole('dialog', {name: 'Save to Blueprint Library'});
		expect({
			dialogState: interactionState(),
			operations: within(savePrompt)
				.getAllByRole('button')
				.map((button) => button.textContent),
		}).toStrictEqual({
			dialogState: {
				activeElement: {name: 'Cancel Save', tagName: 'BUTTON'},
				dialogStack: [
					{
						ariaHidden: 'true',
						inert: true,
						modal: 'true',
						name: 'Upgrade Planner',
						role: 'dialog',
					},
					{
						ariaHidden: null,
						inert: false,
						modal: 'true',
						name: 'Save to Blueprint Library',
						role: 'dialog',
					},
				],
			},
			operations: ['Cancel Save', 'Save Planner'],
		});
		await user.click(within(savePrompt).getByRole('button', {name: 'Save Planner'}));
		await Promise.resolve();

		const savedInput = vi.mocked(db.saveLibraryCopy).mock.calls[0][0];
		const {data: savedRecordData, ...savedRecordMetadata} = libraryRecords[0];
		expect({
			destination: savedInput.destination,
			dialogState: interactionState(),
			libraryRecord: {
				...savedRecordMetadata,
				planner: parseUpgradePlanner(savedRecordData),
			},
			navigation: navigate.mock.calls,
			planner: parseUpgradePlanner(savedInput.data),
			recordDescription: savedInput.gameData.description,
			recordIcons: savedInput.gameData.icons,
			recordLabel: savedInput.gameData.label,
			savedRecord: screen.getByRole('status').textContent,
			source: screen.getByLabelText('Draft source: Rare belt upgrades').querySelector('strong')?.textContent,
		}).toStrictEqual({
			destination: {parentId: LIBRARY_ROOT_ID, position: 0},
			dialogState: {
				activeElement: {name: 'Save Planner', tagName: 'BUTTON'},
				dialogStack: [
					{
						ariaHidden: null,
						inert: false,
						modal: 'true',
						name: 'Upgrade Planner',
						role: 'dialog',
					},
				],
			},
			libraryRecord: {
				id: 'saved-planner-1',
				createdOn: 1,
				updatedOn: 1,
				gameData: {
					type: 'upgrade_planner',
					label: 'Rare belt upgrades',
					description: 'Rare belt line',
					gameVersion: '0',
					icons: [{type: 'virtual', name: 'signal-red'}],
				},
				selection: undefined,
				parentId: LIBRARY_ROOT_ID,
				position: 0,
				planner: rareBeltUpgradesPlanner,
			},
			navigation: [],
			planner: rareBeltUpgradesPlanner,
			recordDescription: 'Rare belt line',
			recordIcons: [{type: 'virtual', name: 'signal-red'}],
			recordLabel: 'Rare belt upgrades',
			savedRecord: 'Saved “Rare belt upgrades” in Blueprint Library › Root shelf.',
			source: 'Rare belt upgrades',
		});
		await user.click(screen.getByRole('button', {name: 'Close Planner'}));

		openBlueprintEditor();
		await user.click(screen.getByRole('button', {name: 'Upgrade items and entities in the blueprint'}));
		await user.click(screen.getByRole('button', {name: 'Rare belt upgrades'}));

		expect(navigate).toHaveBeenCalledExactlyOnceWith({
			to: '/',
			search: {
				pasted: serializeBlueprint({
					blueprint: {
						item: 'blueprint',
						version: 0,
						entities: [
							{
								entity_number: 1,
								name: 'fast-transport-belt',
								position: {x: 0, y: 0},
								quality: 'rare',
							},
						],
					},
				}),
				selection: '',
			},
		});
	});

	test('preserves a dirty saved-planner draft when save is canceled and updates that library record in place', async () => {
		const user = userEvent.setup();
		const planner: UpgradePlanner = {
			item: 'upgrade-planner',
			label: 'Library belts',
			version: 0,
			settings: {
				mappers: [
					{
						index: 100,
						from: {type: 'entity', name: 'transport-belt'},
						to: {type: 'entity', name: 'fast-transport-belt'},
					},
				],
			},
		};
		libraryRecords.push(storedPlanner('library-belts', planner, 'Library belts', 4));
		render(<TransformPanel blueprint={blueprint} />);

		openUpgradePlanner();
		await choosePlanner(user, 'Library belts');
		await user.click(screen.getByRole('button', {name: 'Choose target for Transport belt'}));
		await chooseSignal(user, 'Express transport belt');
		expect(screen.getByLabelText('Planner library status').textContent).toBe('Blueprint Library › Library belts');
		await user.click(screen.getByRole('button', {name: 'Edit planner name'}));
		const canceledName = screen.getByRole('textbox', {name: 'Name'});
		await user.clear(canceledName);
		await user.type(canceledName, 'Canceled name');
		await user.click(screen.getByRole('button', {name: 'Confirm planner metadata'}));
		await user.click(screen.getByRole('button', {name: 'Save Planner'}));
		const canceledPrompt = screen.getByRole('dialog', {name: 'Save to Blueprint Library'});
		await user.click(within(canceledPrompt).getByRole('button', {name: 'Cancel Save'}));

		expect({
			navigation: navigate.mock.calls,
			savePrompt: screen.queryByRole('dialog', {name: 'Save to Blueprint Library'}),
			source: screen.getByLabelText('Draft source: Library belts').querySelector('strong')?.textContent,
			target: screen.getByRole('button', {name: 'Choose target for Transport belt'}).title,
			updateCalls: vi.mocked(db.updateLibraryRecord).mock.calls,
		}).toStrictEqual({
			navigation: [],
			savePrompt: null,
			source: 'Library belts',
			target: 'Express transport belt\nentity:express-transport-belt\nQuality: = normal',
			updateCalls: [],
		});

		await user.click(screen.getByRole('button', {name: 'Edit planner name'}));
		const updatedName = screen.getByRole('textbox', {name: 'Name'});
		await user.clear(updatedName);
		await user.type(updatedName, 'Express belt upgrades');
		await user.click(screen.getByRole('button', {name: 'Confirm planner metadata'}));
		await user.click(screen.getByRole('button', {name: 'Save Planner'}));
		const updatePrompt = screen.getByRole('dialog', {name: 'Save to Blueprint Library'});
		expect({
			dialogState: interactionState(),
			operations: within(updatePrompt)
				.getAllByRole('button')
				.map((button) => button.textContent),
		}).toStrictEqual({
			dialogState: {
				activeElement: {name: 'Cancel Save', tagName: 'BUTTON'},
				dialogStack: [
					{
						ariaHidden: 'true',
						inert: true,
						modal: 'true',
						name: 'Upgrade Planner',
						role: 'dialog',
					},
					{
						ariaHidden: null,
						inert: false,
						modal: 'true',
						name: 'Save to Blueprint Library',
						role: 'dialog',
					},
				],
			},
			operations: ['Cancel Save', 'Update Planner', 'Save a Copy'],
		});
		await user.click(within(updatePrompt).getByRole('button', {name: 'Update Planner'}));
		await screen.findByText('Updated “Express belt upgrades” in its Blueprint Library destination.');

		const updateInput = vi.mocked(db.updateLibraryRecord).mock.calls[0][0];
		expect({
			id: updateInput.id,
			navigation: navigate.mock.calls,
			planner: parseUpgradePlanner(updateInput.content.data),
			source: screen.getByLabelText('Draft source: Express belt upgrades').querySelector('strong')?.textContent,
		}).toStrictEqual({
			id: 'library-belts',
			navigation: [],
			planner: {
				...planner,
				label: 'Express belt upgrades',
				settings: {
					mappers: [
						{
							index: 100,
							from: {type: 'entity', name: 'transport-belt'},
							to: {type: 'entity', name: 'express-transport-belt', quality: 'normal'},
						},
					],
				},
			},
			source: 'Express belt upgrades',
		});
	});

	test('saves a copy of a loaded planner with a new stable record ID and leaves the source record unchanged', async () => {
		const user = userEvent.setup();
		const planner: UpgradePlanner = {
			item: 'upgrade-planner',
			label: 'Original planner',
			version: 0,
			settings: {
				description: 'Original description',
				mappers: [
					{
						index: 7,
						from: {type: 'entity', name: 'stone-furnace'},
						to: {type: 'entity', name: 'steel-furnace'},
					},
				],
			},
		};
		const original = storedPlanner('original-planner-id', planner, 'Original planner', 0);
		const copiedPlanner: UpgradePlanner = {...planner, label: 'Copied planner'};
		libraryRecords.push(original);
		render(<TransformPanel blueprint={blueprint} />);

		openUpgradePlanner();
		await choosePlanner(user, 'Original planner');
		await user.click(screen.getByRole('button', {name: 'Edit planner name'}));
		const name = screen.getByRole('textbox', {name: 'Name'});
		await user.clear(name);
		await user.type(name, 'Copied planner');
		await user.click(screen.getByRole('button', {name: 'Confirm planner metadata'}));
		await user.click(screen.getByRole('button', {name: 'Save Planner'}));
		const prompt = screen.getByRole('dialog', {name: 'Save to Blueprint Library'});
		await user.click(within(prompt).getByRole('button', {name: 'Save a Copy'}));

		const {data: copiedRecordData, ...copiedRecordMetadata} = libraryRecords[1];
		const saveInput = vi.mocked(db.saveLibraryCopy).mock.calls[0][0];
		const {data: copiedInputData, ...copiedInputMetadata} = saveInput;
		expect({
			copiedRecord: {...copiedRecordMetadata, planner: parseUpgradePlanner(copiedRecordData)},
			originalRecord: libraryRecords[0],
			saveInput: {...copiedInputMetadata, planner: parseUpgradePlanner(copiedInputData)},
			updateCalls: vi.mocked(db.updateLibraryRecord).mock.calls,
		}).toStrictEqual({
			copiedRecord: {
				id: 'saved-planner-1',
				createdOn: 1,
				updatedOn: 1,
				gameData: {
					type: 'upgrade_planner',
					label: 'Copied planner',
					description: 'Original description',
					gameVersion: '0',
					icons: [],
				},
				parentId: LIBRARY_ROOT_ID,
				position: 1,
				planner: copiedPlanner,
				selection: undefined,
			},
			originalRecord: original,
			saveInput: {
				destination: {parentId: LIBRARY_ROOT_ID, position: 1},
				gameData: {
					type: 'upgrade_planner',
					label: 'Copied planner',
					description: 'Original description',
					gameVersion: '0',
					icons: [],
				},
				planner: copiedPlanner,
			},
			updateCalls: [],
		});
		expect(parseUpgradePlanner(libraryRecords[1].data)).toStrictEqual(copiedPlanner);
	});

	test('reloads saved planner record metadata from the Blueprint Library', async () => {
		const user = userEvent.setup();
		const planner: UpgradePlanner = {
			item: 'upgrade-planner',
			label: 'Reloaded planner',
			version: 0,
			settings: {
				description: 'Reloaded description',
				icons: [{index: 1, signal: {type: 'virtual', name: 'signal-green'}}],
				mappers: [],
			},
		};
		libraryRecords.push(storedPlanner('reloaded-planner-id', planner, 'Reloaded planner', 0));
		render(<TransformPanel blueprint={blueprint} />);

		openUpgradePlanner();
		await choosePlanner(user, 'Reloaded planner');
		await user.click(screen.getByRole('button', {name: 'Edit planner name'}));

		expect({
			description: screen.getByRole<HTMLInputElement>('textbox', {name: 'Planner description'}).value,
			iconTitle: screen.getByRole('button', {name: 'Edit preview icon 1'}).title,
			name: screen.getByRole<HTMLInputElement>('textbox', {name: 'Name'}).value,
			state: screen.getByLabelText('Planner library status').textContent,
		}).toStrictEqual({
			description: 'Reloaded description',
			iconTitle: 'Signal green\nvirtual:signal-green',
			name: 'Reloaded planner',
			state: 'Blueprint Library › Reloaded planner',
		});
	});

	test('copies and exports the current planner draft and explicitly discards an unsaved record', async () => {
		const user = userEvent.setup();
		const originalClipboard = navigator.clipboard;
		const writeText = vi.fn<(text: string) => Promise<void>>(async () => {});
		Object.defineProperty(navigator, 'clipboard', {configurable: true, value: {writeText}});
		const createObjectUrl = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:planner-export');
		const revokeObjectUrl = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
		const anchorClick = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
		render(<TransformPanel blueprint={blueprint} />);

		openUpgradePlanner();
		const toolbar = screen.getByRole('toolbar', {name: 'Planner record tools'});
		expect(
			within(toolbar)
				.getAllByRole('button')
				.map((button) => ({label: button.getAttribute('aria-label'), style: button.dataset.factorioStyle})),
		).toStrictEqual([
			{label: 'Copy planner string', style: 'button'},
			{label: 'Export planner string', style: 'button'},
			{label: 'Discard local planner', style: 'red_button'},
		]);

		await user.click(within(toolbar).getByRole('button', {name: 'Copy planner string'}));
		await screen.findByText('Planner string copied.');
		const copiedPlanner = parseUpgradePlanner(writeText.mock.calls[0][0]);
		expect({label: copiedPlanner.label, mappings: copiedPlanner.settings.mappers.length}).toStrictEqual({
			label: 'Default Upgrade',
			mappings: 14,
		});

		await user.click(within(toolbar).getByRole('button', {name: 'Export planner string'}));
		expect({
			anchorClicks: anchorClick.mock.calls.length,
			blobType: (createObjectUrl.mock.calls[0][0] as Blob).type,
			revoked: revokeObjectUrl.mock.calls,
		}).toStrictEqual({anchorClicks: 1, blobType: 'text/plain', revoked: [['blob:planner-export']]});

		const discard = within(toolbar).getByRole('button', {name: 'Discard local planner'});
		await user.click(discard);
		const confirmation = screen.getByRole('alertdialog', {name: 'Discard local planner?'});
		expect(within(confirmation).getByText(/no Blueprint Library record/).textContent).toBe(
			'This planner has no Blueprint Library record. Its local draft will be discarded.',
		);
		await user.click(within(confirmation).getByRole('button', {name: 'Keep planner'}));
		await waitFor(() => {
			expect(document.activeElement).toBe(discard);
		});
		await user.click(discard);
		await user.click(
			within(screen.getByRole('alertdialog', {name: 'Discard local planner?'})).getByRole('button', {
				name: 'Discard local draft',
			}),
		);
		await waitFor(() => {
			expect(screen.queryByRole('dialog', {name: 'Upgrade Planner'})).toBeNull();
		});
		expect(vi.mocked(db.deleteLibraryRecord).mock.calls).toStrictEqual([]);
		Object.defineProperty(navigator, 'clipboard', {configurable: true, value: originalClipboard});
	});

	test('deletes a loaded planner from its Blueprint Library location after confirmation', async () => {
		const user = userEvent.setup();
		const planner: UpgradePlanner = {
			item: 'upgrade-planner',
			label: 'Library planner',
			version: 0,
			settings: {mappers: []},
		};
		libraryRecords.push(storedPlanner('planner-to-delete', planner, 'Library planner', 0));
		render(<TransformPanel blueprint={blueprint} />);

		openUpgradePlanner();
		await choosePlanner(user, 'Library planner');
		await user.click(screen.getByRole('button', {name: 'Delete planner from Blueprint Library'}));
		const confirmation = screen.getByRole('alertdialog', {name: 'Delete saved planner?'});
		expect(within(confirmation).getByText(/loaded blueprint is not changed/).textContent).toBe(
			'This removes the planner from the Blueprint Library. The loaded blueprint is not changed.',
		);
		await user.click(within(confirmation).getByRole('button', {name: 'Delete from Library'}));
		await waitFor(() => {
			expect(screen.queryByRole('dialog', {name: 'Upgrade Planner'})).toBeNull();
		});
		expect({
			deleteCalls: vi.mocked(db.deleteLibraryRecord).mock.calls,
			libraryRecords,
			navigation: navigate.mock.calls,
		}).toStrictEqual({deleteCalls: [[{id: 'planner-to-delete'}]], libraryRecords: [], navigation: []});
	});

	test('preserves unused mappings and unsupported serialized fields when planner metadata is updated', async () => {
		const user = userEvent.setup();
		const planner = parseUpgradePlanner(`{
			upgrade_planner: {
				item: 'upgrade-planner',
				label: 'Opaque planner',
				version: 0,
				planner_extension: {owner: 'Alice'},
				settings: {
					description: 'Opaque description',
					settings_extension: 42,
					icons: [{
						index: 1,
						signal: {type: 'virtual', name: 'signal-blue', signal_extension: true},
						icon_extension: 'kept',
					}],
					mappers: [{
						index: 91,
						from: {type: 'entity', name: 'stone-furnace', source_extension: 'kept'},
						to: {type: 'entity', name: 'steel-furnace', target_extension: 'kept'},
						mapper_extension: ['kept'],
					}],
				},
			},
		}`);
		libraryRecords.push(storedPlanner('opaque-planner-id', planner, 'Opaque planner', 0));
		render(<TransformPanel blueprint={blueprint} />);

		openUpgradePlanner();
		await choosePlanner(user, 'Opaque planner');
		expect(screen.getByLabelText('0 matches').getAttribute('aria-label')).toBe('0 matches');
		await user.click(screen.getByRole('button', {name: 'Edit planner name'}));
		const name = screen.getByRole('textbox', {name: 'Name'});
		await user.clear(name);
		await user.type(name, 'Renamed opaque planner');
		await user.click(screen.getByRole('button', {name: 'Confirm planner metadata'}));
		await user.click(screen.getByRole('button', {name: 'Save Planner'}));
		await user.click(
			within(screen.getByRole('dialog', {name: 'Save to Blueprint Library'})).getByRole('button', {
				name: 'Update Planner',
			}),
		);

		expect(parseUpgradePlanner(vi.mocked(db.updateLibraryRecord).mock.calls[0][0].content.data)).toStrictEqual({
			...planner,
			label: 'Renamed opaque planner',
		});
	});

	test('opens the Factorio tools with B and U except while editing text or choosing an icon', async () => {
		const user = userEvent.setup();
		render(<TransformPanel blueprint={blueprint} />);

		fireEvent.keyDown(window, {code: 'KeyB'});
		const blueprintEditor = screen.getByRole('dialog', {name: 'Blueprint Editor'});
		expect(blueprintEditor.getAttribute('aria-modal')).toBe('true');

		await user.click(screen.getByRole('button', {name: 'Choose icon 1'}));
		fireEvent.keyDown(window, {code: 'KeyU'});
		expect({
			blueprintEditorAriaHidden: blueprintEditor.getAttribute('aria-hidden'),
			blueprintEditorInert: blueprintEditor.inert,
			picker: screen.getByRole('dialog', {name: 'Choose label icon 1'}).getAttribute('aria-modal'),
			upgradePlanner: screen.queryByRole('dialog', {name: 'Upgrade Planner'}),
		}).toStrictEqual({
			blueprintEditorAriaHidden: 'true',
			blueprintEditorInert: true,
			picker: 'true',
			upgradePlanner: null,
		});

		fireEvent.keyDown(window, {code: 'Escape', key: 'Escape'});
		fireEvent.keyDown(window, {code: 'KeyU'});
		expect({
			blueprintEditor: screen.queryByRole('dialog', {name: 'Blueprint Editor'}),
			upgradePlanner: screen.getByRole('dialog', {name: 'Upgrade Planner'}).getAttribute('aria-modal'),
		}).toStrictEqual({blueprintEditor: null, upgradePlanner: 'true'});

		const findInput = screen.getByRole<HTMLInputElement>('textbox', {name: 'Find'});
		await user.type(findInput, 'b');
		fireEvent.keyDown(findInput, {code: 'KeyB'});
		expect({
			blueprintEditor: screen.queryByRole('dialog', {name: 'Blueprint Editor'}),
			find: screen.getByRole<HTMLInputElement>('textbox', {name: 'Find'}).value,
			upgradePlanner: screen.getByRole('dialog', {name: 'Upgrade Planner'}).getAttribute('aria-modal'),
		}).toStrictEqual({blueprintEditor: null, find: 'b', upgradePlanner: 'true'});
	});

	test('keeps editor changes as a draft until they are saved', async () => {
		const user = userEvent.setup();
		render(<TransformPanel blueprint={blueprint} />);

		openBlueprintEditor();
		expect(screen.getByRole<HTMLButtonElement>('button', {name: 'Save blueprint'}).disabled).toBe(true);
		await user.click(screen.getByRole('button', {name: 'Close Blueprint Editor'}));

		expect({
			dialog: screen.queryByRole('dialog', {name: 'Blueprint Editor'}),
			navigation: navigate.mock.calls,
		}).toStrictEqual({
			dialog: null,
			navigation: [],
		});
	});

	test('commits a post-capture Blueprint Editor draft as the first root blueprint', async () => {
		const user = userEvent.setup();
		const onBlueprintCommit = vi.fn<(committedRoot: BlueprintString) => void>();
		const capturedBlueprint: BlueprintString = {
			blueprint: {item: 'blueprint', label: '', version: 0},
		};
		render(
			<TransformPanel
				blueprint={capturedBlueprint}
				blueprintEditorSourceMode={BlueprintEditorSourceMode.CapturedDraft}
				onBlueprintCommit={onBlueprintCommit}
			/>,
		);

		const editorTool = screen.getByRole('button', {name: 'Open Blueprint Editor'});
		await user.click(editorTool);
		const createButton = screen.getByRole<HTMLButtonElement>('button', {name: 'Create blueprint'});
		expect({
			createDisabled: createButton.disabled,
			dialogState: interactionState(),
		}).toStrictEqual({
			createDisabled: false,
			dialogState: {
				activeElement: {name: 'Edit blueprint title', tagName: 'BUTTON'},
				dialogStack: [
					{
						ariaHidden: null,
						inert: false,
						modal: 'true',
						name: 'Blueprint Editor',
						role: 'dialog',
					},
				],
			},
		});
		await user.click(createButton);
		await Promise.resolve();

		expect({
			commit: onBlueprintCommit.mock.calls,
			dialogState: interactionState(),
			navigation: navigate.mock.calls,
		}).toStrictEqual({
			commit: [[{blueprint: {item: 'blueprint', version: 0}}]],
			dialogState: {
				activeElement: {name: 'Open Blueprint Editor', tagName: 'BUTTON'},
				dialogStack: [],
			},
			navigation: [],
		});
	});

	test('applies captured-draft tile, train, and vehicle defaults before the first commit', async () => {
		const user = userEvent.setup();
		const onBlueprintCommit = vi.fn<(committedRoot: BlueprintString) => void>();
		const capturedBlueprint: BlueprintString = {
			blueprint: {
				item: 'blueprint',
				version: 0,
				entities: [
					{entity_number: 100, name: 'assembling-machine-3', position: {x: 0, y: 0}},
					{entity_number: 200, name: 'locomotive', position: {x: 1, y: 0}},
					{entity_number: 300, name: 'car', position: {x: 2, y: 0}},
				],
				tiles: [{name: 'concrete', position: {x: 0, y: 1}}],
			},
		};
		render(
			<TransformPanel
				blueprint={capturedBlueprint}
				blueprintEditorSourceMode={BlueprintEditorSourceMode.CapturedDraft}
				onBlueprintCommit={onBlueprintCommit}
			/>,
		);

		openBlueprintEditor();
		const filtersSection = screen.getByRole('heading', {name: 'Filters'}).closest('section');
		if (filtersSection === null) {
			throw new Error('Expected the captured blueprint filters section.');
		}
		expect(
			within(filtersSection)
				.getAllByRole<HTMLInputElement>('checkbox')
				.map((checkbox) => ({
					checked: checkbox.checked,
					label: checkbox.labels?.[0]?.textContent,
				})),
		).toStrictEqual([
			{checked: true, label: 'Entities'},
			{checked: false, label: 'Tiles'},
			{checked: false, label: 'Trains'},
			{checked: false, label: 'Vehicles'},
		]);
		await user.click(screen.getByRole('button', {name: 'Create blueprint'}));

		expect(onBlueprintCommit.mock.calls).toStrictEqual([
			[
				{
					blueprint: {
						item: 'blueprint',
						version: 0,
						entities: [
							{
								entity_number: 100,
								name: 'assembling-machine-3',
								position: {x: 0, y: 0},
							},
						],
					},
				},
			],
		]);
	});

	test('dismisses an unchanged editor directly through both Escape and the title-bar close button', () => {
		render(<TransformPanel blueprint={blueprint} />);

		openBlueprintEditor();
		fireEvent.keyDown(window, {key: 'Escape'});
		expect(screen.queryByRole('dialog', {name: 'Blueprint Editor'})).toBeNull();

		openBlueprintEditor();
		fireEvent.click(screen.getByRole('button', {name: 'Close Blueprint Editor'}));
		expect({
			confirmation: screen.queryByRole('alertdialog', {name: 'Confirmation'}),
			dialog: screen.queryByRole('dialog', {name: 'Blueprint Editor'}),
			navigation: navigate.mock.calls,
		}).toStrictEqual({confirmation: null, dialog: null, navigation: []});
	});

	test.each([
		{
			blueprint: {
				blueprint: {item: 'blueprint', label: "Alice's new blueprint", version: 0},
			} satisfies BlueprintString,
			expected: {
				breadcrumb: "Alice's new blueprint",
				caption: 'Set up new blueprint',
				contextLabel: 'New blueprint',
			},
			name: 'new root blueprint',
			rootBlueprint: undefined,
			selectedPath: '',
			sourceMode: BlueprintEditorSourceMode.CapturedDraft,
		},
		{
			blueprint: {
				blueprint: {item: 'blueprint', label: "Alice's existing blueprint", version: 0},
			} satisfies BlueprintString,
			expected: {
				breadcrumb: "Alice's existing blueprint",
				caption: 'Blueprint item',
				contextLabel: 'Existing blueprint',
			},
			name: 'existing blueprint item',
			rootBlueprint: undefined,
			selectedPath: '',
			sourceMode: BlueprintEditorSourceMode.ExistingRecord,
		},
		{
			blueprint: {
				blueprint_book: {
					item: 'blueprint-book',
					label: "Alice's library book",
					version: 0,
					blueprints: [],
				},
			} satisfies BlueprintString,
			expected: {
				breadcrumb: "Alice's library book",
				caption: 'Blueprint book in the blueprint library',
				contextLabel: 'Blueprint library record',
			},
			name: 'blueprint library book',
			rootBlueprint: undefined,
			selectedPath: '',
			sourceMode: BlueprintEditorSourceMode.ExistingRecord,
		},
		{
			blueprint: {
				blueprint: {item: 'blueprint', label: "Bob's child blueprint", version: 0},
			} satisfies BlueprintString,
			expected: {
				breadcrumb: "Alice's library book › Bob's child blueprint",
				caption: 'Blueprint in the blueprint library',
				contextLabel: 'Child blueprint record',
			},
			name: 'child blueprint record',
			rootBlueprint: {
				blueprint_book: {
					item: 'blueprint-book',
					label: "Alice's library book",
					version: 0,
					blueprints: [
						{
							index: 100,
							blueprint: {item: 'blueprint', label: "Bob's child blueprint", version: 0},
						},
					],
				},
			} satisfies BlueprintString,
			selectedPath: '1',
			sourceMode: BlueprintEditorSourceMode.ExistingRecord,
		},
	])(
		'labels the $name context and routes X through confirmClose',
		({blueprint: contextBlueprint, expected, rootBlueprint, selectedPath, sourceMode}) => {
			render(
				<TransformPanel
					blueprint={contextBlueprint}
					blueprintEditorSourceMode={sourceMode}
					rootBlueprint={rootBlueprint}
					selectedPath={selectedPath}
				/>,
			);

			openBlueprintEditor();
			const dialog = screen.getByRole('dialog', {name: 'Blueprint Editor'});
			const context = within(dialog).getByRole('navigation', {name: 'Blueprint context'});
			const close = within(dialog).getByRole('button', {name: 'Close Blueprint Editor'});
			const closeDescription = document.getElementById(close.getAttribute('aria-describedby') ?? '');
			const caption = within(dialog).getByRole('heading', {name: expected.caption});

			expect({
				caption: {
					source: caption.dataset.factorioSource,
					text: caption.textContent,
				},
				close: {
					action: close.dataset.factorioCloseAction,
					description: closeDescription?.textContent.trim(),
					source: close.dataset.factorioSource,
					title: close.title,
				},
				context: [...context.children].map((part) => ({
					current: part.getAttribute('aria-current'),
					text: part.textContent,
				})),
				contextExtension: context.dataset.websiteExtension,
				dialogDescription: dialog.getAttribute('aria-describedby'),
			}).toStrictEqual({
				caption: {
					source: 'BlueprintSetupGui::getTitle',
					text: expected.caption,
				},
				close: {
					action: 'request-close',
					description: 'Uncommitted changes require confirmation before they are discarded.',
					source: 'BlueprintSetupGui::confirmClose',
					title: 'Close Blueprint Editor (asks before discarding changes)',
				},
				context: [
					{current: null, text: expected.contextLabel},
					{current: null, text: '›'},
					{current: 'page', text: expected.breadcrumb},
				],
				contextExtension: 'record-context',
				dialogDescription: context.id,
			});
		},
	);

	test('keeps or discards dirty title, icon, description, and filter drafts on every close path', async () => {
		const user = userEvent.setup();
		const sourceBlueprint: BlueprintString = {
			blueprint: {
				item: 'blueprint',
				label: 'Alice',
				description: 'Source description',
				version: 0,
				icons: [{index: 1, signal: {type: 'virtual', name: 'signal-green'}}],
				entities: [
					{
						entity_number: 1,
						name: 'assembling-machine-1',
						position: {x: 0, y: 0},
						items: [
							{
								id: {name: 'speed-module'},
								items: {in_inventory: [{inventory: 1, stack: 0, count: 1}]},
							},
						],
					},
					{entity_number: 2, name: 'locomotive', position: {x: 1, y: 0}},
				],
				tiles: [{name: 'landfill', position: {x: 0, y: 0}}],
			},
		};
		render(<TransformPanel blueprint={sourceBlueprint} />);

		const editorTool = screen.getByRole('button', {name: 'Open Blueprint Editor'});
		await user.click(editorTool);
		await user.click(screen.getByRole('button', {name: 'Edit blueprint title'}));
		await user.clear(screen.getByRole('textbox', {name: 'Blueprint title'}));
		await user.type(screen.getByRole('textbox', {name: 'Blueprint title'}), 'Bob{Enter}');
		await user.clear(screen.getByRole('textbox', {name: 'Blueprint description'}));
		await user.type(screen.getByRole('textbox', {name: 'Blueprint description'}), 'Draft description');
		await user.click(screen.getByRole('button', {name: 'Edit icon 1'}));
		await searchSignals(user, 'red');
		await chooseSignal(user, 'Signal red');
		await user.click(screen.getByRole('checkbox', {name: 'Modules'}));
		await user.click(screen.getByRole('checkbox', {name: 'Tiles'}));

		fireEvent.keyDown(screen.getByRole('dialog', {name: 'Blueprint Editor'}), {key: 'Escape'});
		const firstConfirmation = screen.getByRole('alertdialog', {name: 'Confirmation'});
		await waitFor(() => {
			expect({
				buttons: within(firstConfirmation)
					.getAllByRole('button')
					.map((button) => button.textContent),
				dialogState: interactionState(),
				navigation: navigate.mock.calls,
			}).toStrictEqual({
				buttons: ['Cancel', 'Discard changes'],
				dialogState: {
					activeElement: {name: 'Cancel', tagName: 'BUTTON'},
					dialogStack: [
						{
							ariaHidden: 'true',
							inert: true,
							modal: 'true',
							name: 'Blueprint Editor',
							role: 'dialog',
						},
						{
							ariaHidden: null,
							inert: false,
							modal: 'true',
							name: 'Confirmation',
							role: 'alertdialog',
						},
					],
				},
				navigation: [],
			});
		});

		await user.click(within(firstConfirmation).getByRole('button', {name: 'Cancel'}));
		await Promise.resolve();
		expect({
			description: screen.getByRole<HTMLTextAreaElement>('textbox', {name: 'Blueprint description'}).value,
			dialogState: interactionState(),
			filters: ['Modules', 'Entities', 'Trains', 'Tiles'].map(
				(name) => screen.getByRole<HTMLInputElement>('checkbox', {name}).checked,
			),
			icon: screen.getByRole('button', {name: 'Edit icon 1'}).getAttribute('title'),
			title: screen.getByText('Bob', {selector: '.blueprint-editor__title'}).textContent,
		}).toStrictEqual({
			description: 'Draft description',
			dialogState: {
				activeElement: {name: 'Tiles', tagName: 'INPUT'},
				dialogStack: [
					{
						ariaHidden: null,
						inert: false,
						modal: 'true',
						name: 'Blueprint Editor',
						role: 'dialog',
					},
				],
			},
			filters: [false, true, true, false],
			icon: 'Signal red\nvirtual:signal-red',
			title: 'Bob',
		});

		await user.click(screen.getByRole('button', {name: 'Close Blueprint Editor'}));
		const secondConfirmation = screen.getByRole('alertdialog', {name: 'Confirmation'});
		await user.click(within(secondConfirmation).getByRole('button', {name: 'Discard changes'}));
		await Promise.resolve();
		expect({
			dialogState: interactionState(),
			navigation: navigate.mock.calls,
		}).toStrictEqual({
			dialogState: {
				activeElement: {name: 'Open Blueprint Editor', tagName: 'BUTTON'},
				dialogStack: [],
			},
			navigation: [],
		});

		await user.click(editorTool);
		expect({
			description: screen.getByRole<HTMLTextAreaElement>('textbox', {name: 'Blueprint description'}).value,
			filters: ['Modules', 'Entities', 'Trains', 'Tiles'].map(
				(name) => screen.getByRole<HTMLInputElement>('checkbox', {name}).checked,
			),
			icon: screen.getByRole('button', {name: 'Edit icon 1'}).getAttribute('title'),
			saveDisabled: screen.getByRole<HTMLButtonElement>('button', {name: 'Save blueprint'}).disabled,
			title: screen.getByText('Alice', {selector: '.blueprint-editor__title'}).textContent,
		}).toStrictEqual({
			description: 'Source description',
			filters: [true, true, true, true],
			icon: 'Signal green\nvirtual:signal-green',
			saveDisabled: true,
			title: 'Alice',
		});
	});

	test('saves Blueprint parametrisation edits and preserves unsupported parameter rows', async () => {
		const user = userEvent.setup();
		const parameterizedBlueprint: BlueprintString = {
			blueprint: {
				item: 'blueprint',
				version: 0,
				parameters: [
					{
						type: 'id',
						name: 'Plate',
						id: 'iron-plate',
						'quality-condition': {quality: 'normal', comparator: '='},
					},
					{
						type: 'number',
						name: 'Count',
						number: '10',
						variable: 'N',
						dependent: true,
						formula: 'N + 2',
					},
				],
			},
		};
		render(<TransformPanel blueprint={parameterizedBlueprint} />);

		openBlueprintEditor();
		const editor = screen.getByRole('dialog', {name: 'Blueprint Editor'});
		const parameterButton = screen.getByRole('button', {name: 'Parametrise or reconfigure the blueprint'});
		await user.click(parameterButton);
		const parameterDialog = screen.getByRole('dialog', {name: 'Blueprint parametrisation'});
		const parameterName = screen.getByRole('textbox', {name: 'Parameter 1 name'});
		expect({
			activeElement: document.activeElement,
			editorAriaHidden: editor.getAttribute('aria-hidden'),
			editorInert: editor.inert,
			expanded: parameterButton.getAttribute('aria-expanded'),
			parameterDialogId: parameterDialog.id,
		}).toStrictEqual({
			activeElement: parameterName,
			editorAriaHidden: 'true',
			editorInert: true,
			expanded: 'true',
			parameterDialogId: parameterButton.getAttribute('aria-controls'),
		});
		await user.clear(parameterName);
		await user.type(parameterName, 'Any plate');
		await user.click(screen.getByRole('button', {name: 'Confirm'}));
		await waitFor(() => {
			expect(document.activeElement).toBe(parameterButton);
		});
		expect({
			editorAriaHidden: editor.getAttribute('aria-hidden'),
			editorInert: editor.inert,
			expanded: parameterButton.getAttribute('aria-expanded'),
		}).toStrictEqual({
			editorAriaHidden: null,
			editorInert: false,
			expanded: 'false',
		});
		await user.click(screen.getByRole('button', {name: 'Save blueprint'}));

		expect(navigate).toHaveBeenCalledExactlyOnceWith({
			to: '/',
			search: {
				pasted: serializeBlueprint({
					blueprint: {
						item: 'blueprint',
						version: 0,
						parameters: [
							{
								type: 'id',
								id: 'iron-plate',
								'quality-condition': {quality: 'normal', comparator: '='},
								name: 'Any plate',
							},
							{
								type: 'number',
								name: 'Count',
								number: '10',
								variable: 'N',
								dependent: true,
								formula: 'N + 2',
							},
						],
					},
				}),
				selection: '',
			},
		});
	});

	test('removes and restores blueprint components within the editor draft', async () => {
		const user = userEvent.setup();
		render(<TransformPanel blueprint={blueprint} />);

		openBlueprintEditor();
		const activeComponent = screen.getByRole('button', {name: /Transport belt, 1/});
		const contextMenuAllowed = fireEvent.contextMenu(activeComponent);
		const removedComponent = screen.getByRole('button', {name: /Transport belt, removed/});
		expect({
			contextMenuAllowed,
			count: removedComponent.querySelector('.blueprint-components__count')?.textContent,
			navigation: navigate.mock.calls,
			saveDisabled: screen.getByRole<HTMLButtonElement>('button', {name: 'Save blueprint'}).disabled,
		}).toStrictEqual({
			contextMenuAllowed: false,
			count: '0',
			navigation: [],
			saveDisabled: false,
		});

		await user.click(removedComponent);
		const restoredComponent = screen.getByRole('button', {name: /Transport belt, 1/});
		expect({
			count: restoredComponent.querySelector('.blueprint-components__count')?.textContent,
			saveDisabled: screen.getByRole<HTMLButtonElement>('button', {name: 'Save blueprint'}).disabled,
		}).toStrictEqual({
			count: '1',
			saveDisabled: true,
		});

		fireEvent.keyDown(restoredComponent, {key: 'Delete'});
		await user.click(screen.getByRole('button', {name: 'Save blueprint'}));

		expect(navigate).toHaveBeenCalledExactlyOnceWith({
			to: '/',
			search: {
				pasted: serializeBlueprint({
					blueprint: {
						item: 'blueprint',
						version: 0,
						entities: [],
					},
				}),
				selection: '',
			},
		});
	});

	test('requires an explicit icon source and clears an incomplete mapping', async () => {
		const user = userEvent.setup();
		const iconBlueprint: BlueprintString = {
			blueprint: {
				item: 'blueprint',
				version: 0,
				icons: [{index: 1, signal: {type: 'virtual', name: 'signal-red'}}],
			},
		};
		render(<TransformPanel blueprint={iconBlueprint} />);

		openUpgradePlanner();
		await user.click(screen.getByRole('button', {name: /Icon replacements/i}));
		const sourceSlot = screen.getByRole('button', {name: 'Choose source icon'});
		const targetSlot = screen.getByRole('button', {name: 'Choose target icon'});
		expect({
			clearButton: screen.queryByRole('button', {name: /Clear source/}),
			sourceImage: sourceSlot.querySelector('img'),
			targetDisabled: targetSlot.getAttribute('aria-disabled'),
		}).toStrictEqual({clearButton: null, sourceImage: null, targetDisabled: 'true'});

		await user.click(sourceSlot);
		await chooseSignal(user, 'Signal red');
		expect({
			clearButtonLabel: screen.getByRole('button', {name: 'Clear source Signal red'}).getAttribute('aria-label'),
			sourceImage: sourceSlot.querySelector('img')?.getAttribute('src'),
			targetDisabled: targetSlot.getAttribute('aria-disabled'),
		}).toStrictEqual({
			clearButtonLabel: 'Clear source Signal red',
			sourceImage: 'https://factorio-icon-cdn.pages.dev/virtual-signal/signal-red.webp',
			targetDisabled: 'false',
		});

		await user.click(screen.getByRole('button', {name: 'Clear source Signal red'}));
		expect({
			clearButton: screen.queryByRole('button', {name: /Clear source/}),
			sourceImage: sourceSlot.querySelector('img'),
			targetDisabled: targetSlot.getAttribute('aria-disabled'),
		}).toStrictEqual({clearButton: null, sourceImage: null, targetDisabled: 'true'});
	});

	test('applies book operations to the live result', async () => {
		const user = userEvent.setup();
		const book: BlueprintString = {
			blueprint_book: {
				item: 'blueprint-book',
				version: 20,
				active_index: 10,
				blueprints: [
					{index: 10, blueprint: {item: 'blueprint', label: 'Bob', version: 10}},
					{index: 20, blueprint: {item: 'blueprint', label: 'Alice', version: 20}},
				],
			},
		};
		render(<TransformPanel blueprint={book} />);

		openBlueprintEditor();
		await user.click(screen.getByRole('checkbox', {name: 'Sort entries by label'}));
		await user.click(screen.getByRole('button', {name: 'Save blueprint'}));

		expect(navigate).toHaveBeenCalledExactlyOnceWith({
			to: '/',
			search: {
				pasted: serializeBlueprint({
					blueprint_book: {
						item: 'blueprint-book',
						version: 20,
						active_index: 0,
						blueprints: [
							{index: 0, blueprint: {item: 'blueprint', label: 'Alice', version: 20}},
							{index: 1, blueprint: {item: 'blueprint', label: 'Bob', version: 10}},
						],
					},
				}),
				selection: '',
			},
		});
	});

	test('applies the current planner draft directly without opening another selector', async () => {
		const user = userEvent.setup();
		render(<TransformPanel blueprint={blueprint} />);

		const plannerTool = screen.getByRole('button', {name: 'Open Upgrade Planner'});
		await user.click(plannerTool);

		expect({
			dialogState: interactionState(),
			plannerActions: [
				'Save Planner',
				'Apply Upgrade to Current Blueprint',
				'Apply Downgrade to Current Blueprint',
			].map((name) => screen.queryByRole('button', {name})?.textContent ?? null),
			exportActions: ['Copy String', 'Copy JSON', 'Download String'].map((name) =>
				screen.queryByRole('button', {name}),
			),
		}).toStrictEqual({
			dialogState: {
				activeElement: {name: 'Upgrade mappings', tagName: 'DIV'},
				dialogStack: [
					{
						ariaHidden: null,
						inert: false,
						modal: 'true',
						name: 'Upgrade Planner',
						role: 'dialog',
					},
				],
			},
			plannerActions: [
				'Save Planner',
				'Apply Upgrade to Current Blueprint',
				'Apply Downgrade to Current Blueprint',
			],
			exportActions: [null, null, null],
		});

		await applyPlanner(user);
		await Promise.resolve();
		expect({
			dialogState: interactionState(),
			navigation: navigate.mock.calls,
		}).toStrictEqual({
			dialogState: {
				activeElement: {name: 'Open Upgrade Planner', tagName: 'BUTTON'},
				dialogStack: [],
			},
			navigation: [
				[
					{
						to: '/',
						search: {
							pasted: serializeBlueprint({
								blueprint: {
									item: 'blueprint',
									version: 0,
									entities: [
										{
											entity_number: 1,
											name: 'fast-transport-belt',
											position: {x: 0, y: 0},
										},
									],
								},
							}),
							selection: '',
						},
					},
				],
			],
		});
	});

	test('closes an untouched planner without changing the loaded blueprint', async () => {
		const user = userEvent.setup();
		render(<TransformPanel blueprint={blueprint} />);

		openUpgradePlanner();
		await user.click(screen.getByRole('button', {name: 'Close Planner'}));

		expect({
			dialog: screen.queryByRole('dialog', {name: 'Upgrade Planner'}),
			navigation: navigate.mock.calls,
		}).toStrictEqual({
			dialog: null,
			navigation: [],
		});
	});

	test('applies the same mapping set in the downgrade direction', async () => {
		const user = userEvent.setup();
		const qualityBlueprint: BlueprintString = {
			blueprint: {
				item: 'blueprint',
				version: 0,
				entities: [{entity_number: 1, name: 'fast-transport-belt', quality: 'rare', position: {x: 0, y: 0}}],
			},
		};
		render(<TransformPanel blueprint={qualityBlueprint} />);

		openUpgradePlanner();
		expect(screen.queryByRole('button', {name: 'Strip quality'})).toBe(null);
		await applyPlanner(user, 'downgrade');

		expect(navigate).toHaveBeenCalledExactlyOnceWith({
			to: '/',
			search: {
				pasted: serializeBlueprint({
					blueprint: {
						item: 'blueprint',
						version: 0,
						entities: [{entity_number: 1, name: 'transport-belt', quality: 'rare', position: {x: 0, y: 0}}],
					},
				}),
				selection: '',
			},
		});
	});

	test('sets target quality from the game-style mapping picker', async () => {
		const user = userEvent.setup();
		render(<TransformPanel blueprint={blueprint} />);

		openUpgradePlanner();
		await user.click(screen.getByRole('button', {name: 'Choose target for Transport belt'}));
		await user.click(screen.getByRole('button', {name: 'Rare quality'}));
		await chooseSignal(user, 'Fast transport belt');

		expect(
			screen
				.getByRole('button', {name: 'Choose target for Transport belt'})
				.querySelector('img[data-testid="quality"]')
				?.getAttribute('src'),
		).toBe('https://factorio-icon-cdn.pages.dev/quality/rare.webp');

		await applyPlanner(user);

		expect(navigate).toHaveBeenCalledExactlyOnceWith({
			to: '/',
			search: {
				pasted: serializeBlueprint({
					blueprint: {
						item: 'blueprint',
						version: 0,
						entities: [
							{
								entity_number: 1,
								name: 'fast-transport-belt',
								position: {x: 0, y: 0},
								quality: 'rare',
							},
						],
					},
				}),
				selection: '',
			},
		});
	});

	test('applies source and target quality changes from one mapping row', async () => {
		const user = userEvent.setup();
		const qualityBlueprint: BlueprintString = {
			blueprint: {
				item: 'blueprint',
				version: 0,
				entities: [{entity_number: 1, name: 'transport-belt', quality: 'epic', position: {x: 0, y: 0}}],
			},
		};
		render(<TransformPanel blueprint={qualityBlueprint} />);

		openUpgradePlanner();
		await user.click(screen.getByRole('button', {name: 'Choose source, currently Transport belt'}));
		await user.click(screen.getByRole('button', {name: 'Epic quality'}));
		await chooseSignal(user, 'Transport belt');
		await user.click(screen.getByRole('button', {name: 'Choose target for Transport belt'}));
		await user.click(screen.getByRole('button', {name: 'Normal quality'}));
		await chooseSignal(user, 'Fast transport belt');
		await applyPlanner(user);

		expect(navigate).toHaveBeenCalledExactlyOnceWith({
			to: '/',
			search: {
				pasted: serializeBlueprint({
					blueprint: {
						item: 'blueprint',
						version: 0,
						entities: [
							{
								entity_number: 1,
								name: 'fast-transport-belt',
								position: {x: 0, y: 0},
							},
						],
					},
				}),
				selection: '',
			},
		});
	});

	test('commits source quality and comparator selection with an explicit target quality', async () => {
		const user = userEvent.setup();
		const qualityBlueprint: BlueprintString = {
			blueprint: {
				item: 'blueprint',
				version: 0,
				entities: [{entity_number: 1, name: 'transport-belt', quality: 'epic', position: {x: 0, y: 0}}],
			},
		};
		render(<TransformPanel blueprint={qualityBlueprint} />);

		openUpgradePlanner();
		await choosePlanner(user, 'Empty Planner');
		await user.click(firstEmptyMappingSourceButton());
		await user.click(screen.getByRole('button', {name: 'Rare quality'}));
		await user.click(screen.getByRole('button', {name: 'Quality comparison: ='}));
		await user.click(screen.getByRole('menuitemradio', {name: '>'}));
		await chooseSignal(user, 'Transport belt');

		await user.click(screen.getByRole('button', {name: 'Choose target for Transport belt'}));
		await user.click(screen.getByRole('button', {name: 'Epic quality'}));
		await chooseSignal(user, 'Fast transport belt');

		const mappingRow = screen.getByRole('listitem', {
			name: 'Mapping from Transport belt to Fast transport belt',
		});
		expect({
			matchSummary: mappingRow.querySelector('.transform-visually-hidden')?.textContent,
			source: within(mappingRow).getByRole('button', {name: 'Choose source, currently Transport belt'}).title,
			target: within(mappingRow).getByRole('button', {name: 'Choose target for Transport belt'}).title,
		}).toStrictEqual({
			matchSummary: `1 match. ${mappingInstructions}`,
			source: 'Transport belt\nentity:transport-belt\nQuality: > rare',
			target: 'Fast transport belt\nentity:fast-transport-belt\nQuality: = epic',
		});

		await applyPlanner(user);
		expect(navigate).toHaveBeenCalledExactlyOnceWith({
			to: '/',
			search: {
				pasted: serializeBlueprint({
					blueprint: {
						item: 'blueprint',
						version: 0,
						entities: [
							{entity_number: 1, name: 'fast-transport-belt', quality: 'epic', position: {x: 0, y: 0}},
						],
					},
				}),
				selection: '',
			},
		});
	});

	test('returns from a confirmed source picker without changing To or auto-advancing', async () => {
		const user = userEvent.setup();
		render(<TransformPanel blueprint={blueprint} />);

		await user.click(screen.getByRole('button', {name: 'Open Upgrade Planner'}));
		const targetBefore = screen.getByRole('button', {name: 'Choose target for Transport belt'}).title;
		await user.click(screen.getByRole('button', {name: 'Choose source, currently Transport belt'}));
		await user.click(screen.getByRole('button', {name: 'Rare quality'}));
		await chooseSignal(user, 'Transport belt');
		await Promise.resolve();

		expect({
			dialogState: interactionState(),
			sourceAfter: screen.getByRole('button', {name: 'Choose source, currently Transport belt'}).title,
			targetAfter: screen.getByRole('button', {name: 'Choose target for Transport belt'}).title,
		}).toStrictEqual({
			dialogState: {
				activeElement: {name: 'Choose source, currently Transport belt', tagName: 'BUTTON'},
				dialogStack: [
					{
						ariaHidden: null,
						inert: false,
						modal: 'true',
						name: 'Upgrade Planner',
						role: 'dialog',
					},
				],
			},
			sourceAfter: 'Transport belt\nentity:transport-belt\nQuality: = rare',
			targetAfter: targetBefore,
		});
	});

	test('keeps an incomplete mapping row through picker cancellation until it is removed', async () => {
		const user = userEvent.setup();
		render(<TransformPanel blueprint={blueprint} />);

		openUpgradePlanner();
		const plannerDialog = screen.getByRole('dialog', {name: 'Upgrade Planner'});
		await choosePlanner(user, 'Empty Planner');

		const emptySource = firstEmptyMappingSourceButton();
		const emptyTarget = within(emptySource.parentElement!).getByRole('button', {
			name: 'Choose target for new mapping',
		});
		expect({
			row: emptySource.parentElement?.textContent,
			sourceIcon: emptySource.querySelector('img'),
			targetDisabled: emptyTarget.getAttribute('aria-disabled'),
			targetIcon: emptyTarget.querySelector('img'),
		}).toStrictEqual({
			row: '',
			sourceIcon: null,
			targetDisabled: 'false',
			targetIcon: null,
		});

		await user.click(emptySource);
		await user.click(screen.getByRole('button', {name: 'Close Set the filter'}));
		expect(screen.queryByRole('dialog', {name: 'Set the filter'})).toBe(null);

		await user.click(emptySource);
		await chooseSignal(user, 'Transport belt');
		const incompleteRow = screen.getByRole('listitem', {
			name: 'Incomplete mapping from Transport belt',
		});
		expect({
			plannerAriaHidden: plannerDialog.getAttribute('aria-hidden'),
			plannerInert: plannerDialog.inert,
			source: within(incompleteRow).getByRole('button', {name: /Choose source/}).title,
			target: within(incompleteRow).getByRole('button', {name: /Choose target/}).title,
			targetPicker: screen.queryByRole('dialog', {name: 'Select upgrade'}),
		}).toStrictEqual({
			plannerAriaHidden: null,
			plannerInert: false,
			source: 'Transport belt\nentity:transport-belt',
			target: '',
			targetPicker: null,
		});

		await user.click(within(incompleteRow).getByRole('button', {name: 'Choose target for Transport belt'}));
		expect({
			plannerAriaHidden: plannerDialog.getAttribute('aria-hidden'),
			plannerInert: plannerDialog.inert,
			targetPicker: screen.getByRole('dialog', {name: 'Select upgrade'}).getAttribute('aria-modal'),
		}).toStrictEqual({
			plannerAriaHidden: 'true',
			plannerInert: true,
			targetPicker: 'true',
		});
		await user.click(screen.getByRole('button', {name: 'Close Select upgrade'}));

		expect({
			committedRows: renderedMappingRows().length,
			incompleteRow: screen
				.getByRole('listitem', {
					name: 'Incomplete mapping from Transport belt',
				})
				.getAttribute('aria-label'),
			targetDialog: screen.queryByRole('dialog', {name: 'Select upgrade'}),
		}).toStrictEqual({
			committedRows: 1,
			incompleteRow: 'Incomplete mapping from Transport belt',
			targetDialog: null,
		});

		await user.click(screen.getByRole('button', {name: 'Choose target for Transport belt'}));
		await user.click(screen.getByRole('button', {name: 'Close Select upgrade'}));
		fireEvent.contextMenu(screen.getByRole('button', {name: 'Choose source, currently Transport belt'}));
		expect({
			emptyRow: firstEmptyMappingSourceButton().parentElement?.getAttribute('aria-label'),
			remove: screen.queryByRole('button', {name: /Remove incomplete mapping/}),
		}).toStrictEqual({
			emptyRow: 'Empty mapping slot 1',
			remove: null,
		});
	});

	test('swaps complete mapping records into occupied or empty fixed slots from the keyboard', async () => {
		const user = userEvent.setup();
		render(<TransformPanel blueprint={blueprint} />);

		openUpgradePlanner();
		await choosePlanner(user, 'Paste upgrade planner…');
		fireEvent.change(screen.getByRole('textbox', {name: 'Planner string or JSON'}), {
			target: {
				value: JSON.stringify({
					upgrade_planner: {
						item: 'upgrade-planner',
						version: 0,
						settings: {
							mappers: [
								{
									index: 1,
									from: {type: 'entity', name: 'transport-belt'},
									to: {type: 'entity', name: 'fast-transport-belt'},
								},
								{
									index: 2,
									from: {type: 'item', name: 'speed-module'},
									to: {type: 'item', name: 'speed-module-2'},
								},
							],
						},
					},
				}),
			},
		});

		const beltSource = screen.getByRole('button', {name: 'Choose source, currently Transport belt'});
		const moduleSource = screen.getByRole('button', {name: 'Choose source, currently Speed module'});
		beltSource.focus();
		await user.keyboard('{Control>}{ArrowRight}{/Control}');
		expect({
			beltSlot: mappingSlotIndex(beltSource),
			beltTarget: beltSource
				.closest('[data-mapping-key]')
				?.querySelector<HTMLButtonElement>('button[aria-label^="Choose target"]')?.title,
			moduleSlot: mappingSlotIndex(moduleSource),
			moduleTarget: moduleSource
				.closest('[data-mapping-key]')
				?.querySelector<HTMLButtonElement>('button[aria-label^="Choose target"]')?.title,
		}).toStrictEqual({
			beltSlot: 1,
			beltTarget: 'Fast transport belt\nentity:fast-transport-belt',
			moduleSlot: 0,
			moduleTarget: 'Speed module 2\nitem:speed-module-2',
		});

		await user.keyboard('{Control>}{ArrowRight}{/Control}');
		expect({
			beltSlot: mappingSlotIndex(beltSource),
			moduleSlot: mappingSlotIndex(moduleSource),
		}).toStrictEqual({
			beltSlot: 2,
			moduleSlot: 0,
		});
	});

	test('offers the source catalog independently of blueprint matches and preserves zero-match mappings', async () => {
		const user = userEvent.setup();
		const mixedBlueprint: BlueprintString = {
			blueprint: {
				item: 'blueprint',
				version: 0,
				entities: [
					{entity_number: 1, name: 'transport-belt', position: {x: 0, y: 0}},
					{entity_number: 2, name: 'assembling-machine-1', position: {x: 1, y: 0}},
				],
			},
		};
		render(<TransformPanel blueprint={mixedBlueprint} />);

		openUpgradePlanner();
		await choosePlanner(user, 'Paste upgrade planner…');
		fireEvent.change(screen.getByRole('textbox', {name: 'Planner string or JSON'}), {
			target: {
				value: JSON.stringify({
					upgrade_planner: {
						item: 'upgrade-planner',
						version: 0,
						settings: {
							mappers: [
								{
									index: 100,
									from: {type: 'entity', name: 'transport-belt'},
									to: {type: 'entity', name: 'fast-transport-belt'},
								},
								{
									index: 200,
									from: {type: 'item', name: 'speed-module'},
									to: {type: 'item', name: 'speed-module-2'},
								},
							],
						},
					},
				}),
			},
		});

		await user.click(firstEmptyMappingSourceButton());
		const sourcePicker = screen.getByRole('dialog', {name: 'Set the filter'});
		const sourceChoices = new Set<string | null>();
		for (const tab of within(sourcePicker).getAllByRole('tab')) {
			await user.click(tab);
			for (const button of within(sourcePicker).getAllByRole('button', {name: /^Choose /})) {
				sourceChoices.add(button.getAttribute('aria-label'));
			}
		}
		expect({
			assemblers: [
				'Choose Assembling machine 1',
				'Choose Assembling machine 2',
				'Choose Assembling machine 3',
			].map((choice) => sourceChoices.has(choice)),
			belts: ['Choose Transport belt', 'Choose Express transport belt', 'Choose Turbo underground belt'].map(
				(choice) => sourceChoices.has(choice),
			),
			modules: ['Choose Speed module', 'Choose Productivity module 3', 'Choose Empty module slot'].map((choice) =>
				sourceChoices.has(choice),
			),
			qualityOnlyEntity: sourceChoices.has('Choose Accumulator'),
			unrelatedItem: sourceChoices.has('Choose Iron plate'),
		}).toStrictEqual({
			assemblers: [true, true, true],
			belts: [true, true, true],
			modules: [true, true, true],
			qualityOnlyEntity: true,
			unrelatedItem: false,
		});

		await chooseSignal(user, 'Assembling machine 1');
		await user.click(screen.getByRole('button', {name: 'Choose target for Assembling machine 1'}));
		const targetPicker = screen.getByRole('dialog', {name: 'Select upgrade'});
		expect(
			within(targetPicker)
				.getAllByRole('button', {name: /^Choose /})
				.map((button) => button.getAttribute('aria-label')),
		).toStrictEqual(['Choose Assembling machine 1', 'Choose Assembling machine 2', 'Choose Assembling machine 3']);
		await chooseSignal(user, 'Assembling machine 2');

		expect(
			renderedMappingRows().map((row) => ({
				label: row.getAttribute('aria-label'),
				matchSummary: row.querySelector('.transform-visually-hidden')?.textContent,
				slot: [...(row.parentElement?.children ?? [])].indexOf(row),
			})),
		).toStrictEqual([
			{
				label: 'Mapping from Assembling machine 1 to Assembling machine 2',
				matchSummary: `1 match. ${mappingInstructions}`,
				slot: 0,
			},
			{
				label: 'Mapping from Transport belt to Fast transport belt',
				matchSummary: `1 match. ${mappingInstructions}`,
				slot: 99,
			},
			{
				label: 'Mapping from Speed module to Speed module 2',
				matchSummary: `0 matches. ${mappingInstructions}`,
				slot: 199,
			},
		]);
	});

	test('uses the same entity-family constraints for new and edited mapping rows', async () => {
		const user = userEvent.setup();
		const mixedBlueprint: BlueprintString = {
			blueprint: {
				item: 'blueprint',
				version: 0,
				entities: [
					{entity_number: 1, name: 'transport-belt', position: {x: 0, y: 0}},
					{entity_number: 2, name: 'assembling-machine-1', position: {x: 1, y: 0}},
				],
			},
		};
		render(<TransformPanel blueprint={mixedBlueprint} />);

		openUpgradePlanner();
		await choosePlanner(user, 'Empty Planner');
		await user.click(firstEmptyMappingSourceButton());
		await chooseSignal(user, 'Transport belt');
		await user.click(screen.getByRole('button', {name: 'Choose target for Transport belt'}));

		const newTargetPicker = screen.getByRole('dialog', {name: 'Select upgrade'});
		expect(
			within(newTargetPicker)
				.getAllByRole('button', {name: /^Choose /})
				.map((button) => button.getAttribute('aria-label')),
		).toStrictEqual([
			'Choose Transport belt',
			'Choose Fast transport belt',
			'Choose Express transport belt',
			'Choose Turbo transport belt',
		]);

		await chooseSignal(user, 'Fast transport belt');
		const mappingKeyBeforeSourceEdit = screen
			.getByRole('listitem', {name: 'Mapping from Transport belt to Fast transport belt'})
			.getAttribute('data-mapping-key');
		await user.click(screen.getByRole('button', {name: 'Choose source, currently Transport belt'}));
		await chooseSignal(user, 'Assembling machine 1');
		const clearedTarget = screen.getByRole('button', {name: 'Choose target for Assembling machine 1'});
		expect({
			icon: clearedTarget.querySelector('img'),
			mappingKey: clearedTarget.closest('[data-mapping-key]')?.getAttribute('data-mapping-key'),
			title: clearedTarget.title,
		}).toStrictEqual({
			icon: null,
			mappingKey: mappingKeyBeforeSourceEdit,
			title: '',
		});
		await user.click(clearedTarget);

		const editedTargetPicker = screen.getByRole('dialog', {name: 'Select upgrade'});
		expect(
			within(editedTargetPicker)
				.getAllByRole('button', {name: /^Choose /})
				.map((button) => button.getAttribute('aria-label')),
		).toStrictEqual(['Choose Assembling machine 1', 'Choose Assembling machine 2', 'Choose Assembling machine 3']);

		await chooseSignal(user, 'Assembling machine 2');

		const row = screen.getByRole('listitem', {
			name: 'Mapping from Assembling machine 1 to Assembling machine 2',
		});
		expect({
			matchSummary: row.querySelector('.transform-visually-hidden')?.textContent,
			source: within(row).getByRole('button', {name: /Choose source/}).title,
			target: within(row).getByRole('button', {name: /Choose target/}).title,
		}).toStrictEqual({
			matchSummary: `1 match. ${mappingInstructions}`,
			source: 'Assembling machine 1\nentity:assembling-machine-1',
			target: 'Assembling machine 2\nentity:assembling-machine-2\nQuality: = normal',
		});
	});

	test('accepts the same prototype as a quality-only mapping target', async () => {
		const user = userEvent.setup();
		render(<TransformPanel blueprint={blueprint} />);

		openUpgradePlanner();
		await choosePlanner(user, 'Empty Planner');
		await user.click(firstEmptyMappingSourceButton());
		await chooseSignal(user, 'Transport belt');
		await user.click(screen.getByRole('button', {name: 'Choose target for Transport belt'}));
		const confirm = screen.getByRole<HTMLButtonElement>('button', {name: 'Confirm'});
		expect(confirm.disabled).toBe(true);
		await user.click(screen.getByRole('button', {name: 'Rare quality'}));
		expect(confirm.disabled).toBe(true);
		await user.click(screen.getByRole('button', {name: 'Choose Transport belt'}));
		expect(confirm.disabled).toBe(false);
		await user.click(confirm);

		const row = screen.getByRole('listitem', {name: 'Mapping from Transport belt to Transport belt'});
		expect({
			source: within(row).getByRole('button', {name: /Choose source/}).title,
			target: within(row).getByRole('button', {name: /Choose target/}).title,
		}).toStrictEqual({
			source: 'Transport belt\nentity:transport-belt',
			target: 'Transport belt\nentity:transport-belt\nQuality: = rare',
		});

		await applyPlanner(user);
		expect(navigate).toHaveBeenCalledExactlyOnceWith({
			to: '/',
			search: {
				pasted: serializeBlueprint({
					blueprint: {
						item: 'blueprint',
						version: 0,
						entities: [
							{
								entity_number: 1,
								name: 'transport-belt',
								position: {x: 0, y: 0},
								quality: 'rare',
							},
						],
					},
				}),
				selection: '',
			},
		});
	});

	test('commits local label-icon edits in exact slot order', async () => {
		const user = userEvent.setup();
		const iconBlueprint: BlueprintString = {
			blueprint: {
				item: 'blueprint',
				label: 'Red starter',
				description: 'Old description',
				version: 0,
				icons: [
					{index: 2, signal: {type: 'virtual', name: 'signal-green'}},
					{index: 3, signal: {type: 'virtual', name: 'signal-blue'}},
					{index: 1, signal: {type: 'virtual', name: 'signal-red'}},
				],
			},
		};
		render(<TransformPanel blueprint={iconBlueprint} />);

		await user.click(screen.getByRole('button', {name: 'Open Blueprint Editor'}));
		await user.click(screen.getByRole('button', {name: 'Edit blueprint title'}));
		await user.clear(screen.getByRole('textbox', {name: 'Blueprint title'}));
		await user.type(screen.getByRole('textbox', {name: 'Blueprint title'}), 'Blue starter{Enter}');
		await user.clear(screen.getByRole('textbox', {name: 'Blueprint description'}));
		await user.type(screen.getByRole('textbox', {name: 'Blueprint description'}), 'New description');
		await user.click(screen.getByRole('button', {name: 'Edit icon 1'}));
		await searchSignals(user, 'yellow');
		await chooseSignal(user, 'Signal yellow');
		fireEvent.contextMenu(screen.getByRole('button', {name: 'Edit icon 2'}));
		await user.click(screen.getByRole('button', {name: 'Edit icon 3'}));
		await searchSignals(user, 'green');
		await chooseSignal(user, 'Signal green');
		await user.click(screen.getByRole('button', {name: 'Save blueprint'}));
		await Promise.resolve();

		expect({
			dialogState: interactionState(),
			navigation: navigate.mock.calls,
		}).toStrictEqual({
			dialogState: {
				activeElement: {name: 'Open Blueprint Editor', tagName: 'BUTTON'},
				dialogStack: [],
			},
			navigation: [
				[
					{
						to: '/',
						search: {
							pasted: serializeBlueprint({
								blueprint: {
									item: 'blueprint',
									version: 0,
									description: 'New description',
									icons: [
										{index: 1, signal: {type: 'virtual', name: 'signal-yellow'}},
										{index: 3, signal: {type: 'virtual', name: 'signal-green'}},
									],
									label: 'Blue starter',
								},
							}),
							selection: '',
						},
					},
				],
			],
		});
	});

	test('saves grid metadata without changing blueprint entities', async () => {
		const user = userEvent.setup();
		const gridBlueprint: BlueprintString = {
			blueprint: {
				item: 'blueprint',
				version: 0,
				'snap-to-grid': {x: 32, y: 64},
				'absolute-snapping': true,
				'position-relative-to-grid': {x: 0, y: -16},
				entities: [{entity_number: 100, name: 'transport-belt', position: {x: 0, y: 0}}],
			},
		};
		render(<TransformPanel blueprint={gridBlueprint} />);

		openBlueprintEditor();
		fireEvent.change(screen.getByRole('spinbutton', {name: 'Width'}), {target: {value: '16'}});
		await user.click(screen.getByRole('radio', {name: 'Relative'}));
		await user.click(screen.getByRole('button', {name: 'Save blueprint'}));

		expect(navigate).toHaveBeenCalledExactlyOnceWith({
			to: '/',
			search: {
				pasted: serializeBlueprint({
					blueprint: {
						item: 'blueprint',
						version: 0,
						entities: [{entity_number: 100, name: 'transport-belt', position: {x: 0, y: 0}}],
						'snap-to-grid': {x: 16, y: 64},
						'absolute-snapping': false,
					},
				}),
				selection: '',
			},
		});
	});

	test('commits a nested-book child through the dirty-close confirmation', async () => {
		const user = userEvent.setup();
		const rootBlueprint: BlueprintString = {
			blueprint_book: {
				item: 'blueprint-book',
				label: "Alice's test book",
				version: 0,
				blueprints: [
					{index: 100, blueprint: {item: 'blueprint', label: 'Old label', version: 0}},
					{
						index: 200,
						blueprint: {
							item: 'blueprint',
							label: 'Unchanged',
							version: 0,
							icons: [{index: 1, signal: {type: 'virtual', name: 'signal-green'}}],
						},
					},
				],
			},
		};
		const selectedBlueprint = rootBlueprint.blueprint_book?.blueprints[0];
		const savedRoot: BlueprintString = {
			blueprint_book: {
				item: 'blueprint-book',
				label: "Alice's test book",
				version: 0,
				blueprints: [
					{
						index: 100,
						blueprint: {
							item: 'blueprint',
							version: 0,
							icons: [{index: 1, signal: {type: 'virtual', name: 'signal-red'}}],
							label: 'New label',
						},
					},
					{
						index: 200,
						blueprint: {
							item: 'blueprint',
							label: 'Unchanged',
							version: 0,
							icons: [{index: 1, signal: {type: 'virtual', name: 'signal-green'}}],
						},
					},
				],
			},
		};
		const {rerender} = render(
			<TransformPanel blueprint={selectedBlueprint} rootBlueprint={rootBlueprint} selectedPath="1" />,
		);

		const editorTool = screen.getByRole('button', {name: 'Open Blueprint Editor'});
		await user.click(editorTool);
		await user.click(screen.getByRole('button', {name: 'Edit blueprint title'}));
		await user.clear(screen.getByRole('textbox', {name: 'Blueprint title'}));
		await user.type(screen.getByRole('textbox', {name: 'Blueprint title'}), 'New label{Enter}');
		await user.click(screen.getByRole('button', {name: 'Choose icon 1'}));
		await searchSignals(user, 'red');
		await chooseSignal(user, 'Signal red');
		await user.click(screen.getByRole('button', {name: 'Close Blueprint Editor'}));

		await waitFor(() => {
			expect({
				dialogState: interactionState(),
				navigation: navigate.mock.calls,
			}).toStrictEqual({
				dialogState: {
					activeElement: {name: 'Cancel', tagName: 'BUTTON'},
					dialogStack: [
						{
							ariaHidden: 'true',
							inert: true,
							modal: 'true',
							name: 'Blueprint Editor',
							role: 'dialog',
						},
						{
							ariaHidden: null,
							inert: false,
							modal: 'true',
							name: 'Confirmation',
							role: 'alertdialog',
						},
					],
				},
				navigation: [],
			});
		});

		await user.click(screen.getByRole('button', {name: 'Cancel'}));
		await user.click(screen.getByRole('button', {name: 'Save blueprint'}));
		await Promise.resolve();

		expect({
			dialogState: interactionState(),
			navigation: navigate.mock.calls,
		}).toStrictEqual({
			dialogState: {
				activeElement: {name: 'Open Blueprint Editor', tagName: 'BUTTON'},
				dialogStack: [],
			},
			navigation: [
				[
					{
						to: '/',
						search: {
							pasted: serializeBlueprint(savedRoot),
							selection: '1',
						},
					},
				],
			],
		});

		const savedBlueprint = savedRoot.blueprint_book?.blueprints[0];
		rerender(<TransformPanel blueprint={savedBlueprint} rootBlueprint={savedRoot} selectedPath="1" />);
		openBlueprintEditor();
		expect({
			icon: screen.getByRole('button', {name: 'Edit icon 1'}).getAttribute('title'),
			saveDisabled: screen.getByRole<HTMLButtonElement>('button', {name: 'Save blueprint'}).disabled,
			title: screen.getByText('New label', {selector: '.blueprint-editor__title'}).textContent,
		}).toStrictEqual({
			icon: 'Signal red\nvirtual:signal-red',
			saveDisabled: true,
			title: 'New label',
		});
	});

	test('dismisses icon pickers with Escape or Q without stealing Q from search', async () => {
		const user = userEvent.setup();
		render(<TransformPanel blueprint={blueprint} />);

		openBlueprintEditor();
		const blueprintEditor = screen.getByRole('dialog', {name: 'Blueprint Editor'});
		await user.click(screen.getByRole('button', {name: 'Edit blueprint title'}));
		await user.clear(screen.getByRole('textbox', {name: 'Blueprint title'}));
		await user.type(screen.getByRole('textbox', {name: 'Blueprint title'}), 'Dirty picker priority{Enter}');
		await user.click(screen.getByRole('button', {name: 'Choose icon 1'}));
		await searchSignals(user, 'q');
		const search = screen.getByRole<HTMLInputElement>('searchbox', {name: 'Search'});
		expect({
			blueprintEditorAriaHidden: blueprintEditor.getAttribute('aria-hidden'),
			blueprintEditorInert: blueprintEditor.inert,
			picker: screen.getByRole('dialog', {name: 'Choose label icon 1'}).getAttribute('aria-modal'),
			search: search.value,
		}).toStrictEqual({
			blueprintEditorAriaHidden: 'true',
			blueprintEditorInert: true,
			picker: 'true',
			search: 'q',
		});

		fireEvent.keyDown(search, {key: 'Escape', code: 'Escape'});
		expect({
			blueprintEditor: screen.getByRole('dialog', {name: 'Blueprint Editor'}).getAttribute('aria-modal'),
			picker: screen.queryByRole('dialog', {name: 'Choose label icon 1'}),
		}).toStrictEqual({blueprintEditor: 'true', picker: null});

		await user.click(screen.getByRole('button', {name: 'Choose icon 1'}));
		fireEvent.keyDown(window, {key: 'q', code: 'KeyQ'});
		expect({
			blueprintEditor: screen.getByRole('dialog', {name: 'Blueprint Editor'}).getAttribute('aria-modal'),
			picker: screen.queryByRole('dialog', {name: 'Choose label icon 1'}),
		}).toStrictEqual({blueprintEditor: 'true', picker: null});

		fireEvent.keyDown(window, {key: 'Escape', code: 'Escape'});
		expect({
			confirmation: screen.getByRole('alertdialog', {name: 'Confirmation'}).getAttribute('aria-modal'),
			editorHidden: blueprintEditor.getAttribute('aria-hidden'),
			title: screen.getByText('Dirty picker priority', {selector: '.blueprint-editor__title'}).textContent,
		}).toStrictEqual({
			confirmation: 'true',
			editorHidden: 'true',
			title: 'Dirty picker priority',
		});
	});

	test('applies a transformation within the selected book path', async () => {
		const user = userEvent.setup();
		const rootBlueprint: BlueprintString = {
			blueprint_book: {
				item: 'blueprint-book',
				label: "Alice's test book",
				version: 20,
				blueprints: [
					{
						index: 10,
						blueprint: {
							item: 'blueprint',
							label: 'Bob',
							version: 10,
							entities: [{entity_number: 1, name: 'transport-belt', position: {x: 0, y: 0}}],
						},
					},
					{index: 20, blueprint: {item: 'blueprint', label: 'Charlie', version: 20}},
				],
			},
		};
		const selectedBlueprint = rootBlueprint.blueprint_book?.blueprints[0];
		render(<TransformPanel blueprint={selectedBlueprint} rootBlueprint={rootBlueprint} selectedPath="1" />);

		openUpgradePlanner();
		const scope = within(screen.getByRole('radiogroup', {name: 'Apply mappings to'})).getByRole<HTMLInputElement>(
			'radio',
			{checked: true},
		).value;
		await applyPlanner(user);

		expect({
			dialog: screen.queryByRole('dialog', {name: 'Upgrade Planner'}),
			navigation: navigate.mock.calls,
			scope,
		}).toStrictEqual({
			dialog: null,
			navigation: [
				[
					{
						to: '/',
						search: {
							pasted: serializeBlueprint({
								blueprint_book: {
									item: 'blueprint-book',
									label: "Alice's test book",
									version: 20,
									blueprints: [
										{
											index: 10,
											blueprint: {
												item: 'blueprint',
												label: 'Bob',
												version: 10,
												entities: [
													{
														entity_number: 1,
														name: 'fast-transport-belt',
														position: {x: 0, y: 0},
													},
												],
											},
										},
										{index: 20, blueprint: {item: 'blueprint', label: 'Charlie', version: 20}},
									],
								},
							}),
							selection: '1',
						},
					},
				],
			],
			scope: 'selection',
		});
	});

	test('combines selection-scoped entity mappings with root-book icon and text replacements', async () => {
		const user = userEvent.setup();
		const rootBlueprint: BlueprintString = {
			blueprint_book: {
				item: 'blueprint-book',
				label: "Alice's Red belt book",
				version: 0,
				blueprints: [
					{
						index: 100,
						blueprint: {
							item: 'blueprint',
							label: 'Red balancer',
							description: 'Uses red belts',
							version: 0,
							icons: [{index: 1, signal: {type: 'virtual', name: 'signal-red'}}],
							entities: [{entity_number: 100, name: 'fast-transport-belt', position: {x: 0, y: 0}}],
						},
					},
					{
						index: 200,
						blueprint: {
							item: 'blueprint',
							version: 0,
							icons: [{index: 1, signal: {type: 'virtual', name: 'signal-red'}}],
						},
					},
				],
			},
		};
		const selectedBlueprint = rootBlueprint.blueprint_book?.blueprints[0];
		render(<TransformPanel blueprint={selectedBlueprint} rootBlueprint={rootBlueprint} selectedPath="1" />);

		openUpgradePlanner();
		expect({
			entityScope: within(
				screen.getByRole('radiogroup', {name: 'Apply mappings to'}),
			).getByRole<HTMLInputElement>('radio', {checked: true}).value,
			replacementScope: screen.getByText(
				'Always applies to titles, descriptions, and label icons throughout the entire root book, regardless of the selected blueprint.',
			).textContent,
		}).toStrictEqual({
			entityScope: 'selection',
			replacementScope:
				'Always applies to titles, descriptions, and label icons throughout the entire root book, regardless of the selected blueprint.',
		});
		await user.click(screen.getByRole('button', {name: /Icon replacements/i}));
		await user.click(screen.getByRole('button', {name: 'Choose source icon'}));
		await chooseSignal(user, 'Signal red');
		await user.click(screen.getByRole('button', {name: 'Choose target icon'}));
		await searchSignals(user, 'blue');
		await chooseSignal(user, 'Signal blue');
		await user.click(screen.getByRole('button', {name: 'Done'}));
		await user.type(screen.getByRole('textbox', {name: 'Find'}), 'red');
		await user.type(screen.getByRole('textbox', {name: 'Replace'}), 'blue');

		expect({
			status: screen.getByLabelText('7 matches').getAttribute('aria-label'),
			textAffected: screen.getByText('3 affected').textContent,
			textReplacement: screen.getByRole<HTMLInputElement>('checkbox', {
				name: 'Enable text replacement',
			}).checked,
		}).toStrictEqual({
			status: '7 matches',
			textAffected: '3 affected',
			textReplacement: true,
		});

		await applyPlanner(user);

		expect(navigate).toHaveBeenCalledExactlyOnceWith({
			to: '/',
			search: {
				pasted: serializeBlueprint({
					blueprint_book: {
						item: 'blueprint-book',
						label: "Alice's Blue belt book",
						version: 0,
						blueprints: [
							{
								index: 100,
								blueprint: {
									item: 'blueprint',
									label: 'Blue balancer',
									description: 'Uses blue belts',
									version: 0,
									icons: [{index: 1, signal: {type: 'virtual', name: 'signal-blue'}}],
									entities: [
										{
											entity_number: 100,
											name: 'express-transport-belt',
											position: {x: 0, y: 0},
										},
									],
								},
							},
							{
								index: 200,
								blueprint: {
									item: 'blueprint',
									version: 0,
									icons: [{index: 1, signal: {type: 'virtual', name: 'signal-blue'}}],
								},
							},
						],
					},
				}),
				selection: '1',
			},
		});
	});

	test('applies an upgrade planner selected from the book to the root book', async () => {
		const user = userEvent.setup();
		const planner: BlueprintString = {
			upgrade_planner: {
				item: 'upgrade-planner',
				label: "Alice's belt planner",
				version: 0,
				settings: {
					mappers: [
						{
							index: 100,
							from: {type: 'entity', name: 'transport-belt'},
							to: {type: 'entity', name: 'express-transport-belt'},
						},
					],
				},
			},
		};
		const rootBlueprint: BlueprintString = {
			blueprint_book: {
				item: 'blueprint-book',
				version: 0,
				blueprints: [
					{
						index: 100,
						blueprint: {
							item: 'blueprint',
							version: 0,
							entities: [{entity_number: 100, name: 'transport-belt', position: {x: 0, y: 0}}],
						},
					},
					{index: 200, ...planner},
				],
			},
		};
		render(<TransformPanel blueprint={planner} rootBlueprint={rootBlueprint} selectedPath="2" />);

		openUpgradePlanner();
		expect({
			scope: within(screen.getByRole('radiogroup', {name: 'Apply mappings to'})).getByRole<HTMLInputElement>(
				'radio',
				{checked: true},
			).value,
			status: screen.getByLabelText('1 match').getAttribute('aria-label'),
		}).toStrictEqual({scope: 'root', status: '1 match'});

		await applyPlanner(user);

		expect(navigate).toHaveBeenCalledExactlyOnceWith({
			to: '/',
			search: {
				pasted: serializeBlueprint({
					blueprint_book: {
						item: 'blueprint-book',
						version: 0,
						blueprints: [
							{
								index: 100,
								blueprint: {
									item: 'blueprint',
									version: 0,
									entities: [
										{
											entity_number: 100,
											name: 'express-transport-belt',
											position: {x: 0, y: 0},
										},
									],
								},
							},
							{index: 200, ...planner},
						],
					},
				}),
				selection: '2',
			},
		});
	});

	test('loads each planner-library source as an exact editable mapping draft', async () => {
		const bookPlanner: UpgradePlanner = {
			item: 'upgrade-planner',
			label: "Alice's library planner",
			version: 0,
			settings: {
				mappers: [
					{
						index: 100,
						from: {type: 'entity', name: 'transport-belt'},
						to: {type: 'entity', name: 'fast-transport-belt'},
					},
					{
						index: 200,
						from: {type: 'item', name: 'speed-module'},
						to: {type: 'item', name: 'speed-module-2'},
					},
				],
			},
		};
		const recentPlanner: UpgradePlanner = {
			item: 'upgrade-planner',
			label: "Bob's recent planner",
			version: 0,
			settings: {
				mappers: [
					{
						index: 100,
						from: {type: 'entity', name: 'transport-belt'},
						to: {type: 'entity', name: 'express-transport-belt'},
					},
					{
						index: 200,
						from: {type: 'entity', name: 'inserter'},
						to: {type: 'entity', name: 'fast-inserter'},
					},
				],
			},
		};
		const selectedBlueprint: BlueprintString = {
			blueprint: {
				item: 'blueprint',
				version: 0,
				entities: [{entity_number: 100, name: 'transport-belt', position: {x: 0, y: 0}}],
			},
		};
		const rootBlueprint: BlueprintString = {
			blueprint_book: {
				item: 'blueprint-book',
				version: 0,
				blueprints: [
					{index: 100, ...selectedBlueprint},
					{index: 200, upgrade_planner: bookPlanner},
				],
			},
		};
		libraryRecords.push(
			storedPlanner('planner-alice', bookPlanner, 'Duplicate book planner', 0),
			storedPlanner('planner-bob', recentPlanner, "Bob's library planner", 1),
		);
		render(<TransformPanel blueprint={selectedBlueprint} rootBlueprint={rootBlueprint} selectedPath="1" />);

		openUpgradePlanner();
		const loadPlanner = screen.getByRole('button', {name: 'Load planner to replace draft'});
		loadPlanner.focus();
		fireEvent.click(loadPlanner);
		const draftChooser = screen.getByRole('dialog', {name: 'Choose a planner for this draft'});
		expect({
			controls: loadPlanner.getAttribute('aria-controls'),
			dialogId: draftChooser.id,
			expanded: loadPlanner.getAttribute('aria-expanded'),
			instructions: document.getElementById(draftChooser.getAttribute('aria-describedby') ?? '')?.textContent,
		}).toStrictEqual({
			controls: draftChooser.id,
			dialogId: draftChooser.id,
			expanded: 'true',
			instructions:
				'Choosing a planner replaces this editable draft and returns to the Upgrade Planner. It does not apply changes to the blueprint.',
		});
		expect(
			within(screen.getByRole('grid', {name: 'Upgrade planners'}))
				.getAllByRole('button')
				.map((button) => button.getAttribute('aria-label')),
		).toStrictEqual([
			'Default Upgrade',
			"Alice's library planner",
			'Duplicate book planner',
			"Bob's library planner",
			'Empty Planner',
			'Paste upgrade planner…',
		]);

		fireEvent.click(screen.getByRole('button', {name: 'Empty Planner'}));
		await waitFor(() => {
			expect({
				activeElement: document.activeElement?.getAttribute('aria-label'),
				draftSource: screen.getByLabelText('Draft source: Empty Planner').querySelector('strong')?.textContent,
				expanded: loadPlanner.getAttribute('aria-expanded'),
				nestedDialog: screen.queryByRole('dialog', {name: 'Choose a planner for this draft'}),
			}).toStrictEqual({
				activeElement: 'Load planner to replace draft',
				draftSource: 'Empty Planner',
				expanded: 'false',
				nestedDialog: null,
			});
		});
		fireEvent.click(firstEmptyMappingSourceButton());
		chooseSignalWithClicks('Transport belt');
		fireEvent.click(screen.getByRole('button', {name: 'Choose target for Transport belt'}));
		chooseSignalWithClicks('Express transport belt');
		expect(screen.getByRole('button', {name: 'Choose target for Transport belt'}).title).toBe(
			'Express transport belt\nentity:express-transport-belt\nQuality: = normal',
		);

		choosePlannerWithClicks("Alice's library planner");
		const bookSourceButtons = screen.getAllByRole('button', {name: /Choose source, currently/});
		const loadedDraftSource = screen.getByLabelText("Draft source: Alice's library planner");
		expect({
			loadedSource: {
				icon: loadedDraftSource.querySelector('img')?.getAttribute('src'),
				label: loadedDraftSource.querySelector('strong')?.textContent,
			},
			mappings: bookSourceButtons.map((sourceButton) => ({
				matchSummary: sourceButton.closest('[data-mapping-key]')?.querySelector('.transform-visually-hidden')
					?.textContent,
				slot: mappingSlotIndex(sourceButton),
				from: sourceButton.title,
				to: sourceButton
					.closest('[data-mapping-key]')
					?.querySelector<HTMLButtonElement>('button[aria-label^="Choose target"]')?.title,
			})),
		}).toStrictEqual({
			loadedSource: {
				icon: 'https://factorio-icon-cdn.pages.dev/item/upgrade-planner.webp',
				label: "Alice's library planner",
			},
			mappings: [
				{
					from: 'Transport belt\nentity:transport-belt',
					matchSummary: `1 match. ${mappingInstructions}`,
					slot: 99,
					to: 'Fast transport belt\nentity:fast-transport-belt',
				},
				{
					from: 'Speed module\nitem:speed-module',
					matchSummary: `0 matches. ${mappingInstructions}`,
					slot: 199,
					to: 'Speed module 2\nitem:speed-module-2',
				},
			],
		});

		fireEvent.click(screen.getByRole('button', {name: 'Choose source, currently Transport belt'}));
		chooseSignalWithClicks('Transport belt');
		fireEvent.click(screen.getByRole('button', {name: 'Choose target for Transport belt'}));
		chooseSignalWithClicks('Express transport belt');
		expect(
			screen.getAllByRole('button', {name: /Choose source, currently/}).map((sourceButton) => sourceButton.title),
		).toStrictEqual(['Transport belt\nentity:transport-belt', 'Speed module\nitem:speed-module']);

		choosePlannerWithClicks("Bob's library planner");
		expect(
			screen.getAllByRole('button', {name: /Choose source, currently/}).map((sourceButton) => ({
				from: sourceButton.title,
				matchSummary: sourceButton.closest('[data-mapping-key]')?.querySelector('.transform-visually-hidden')
					?.textContent,
				slot: mappingSlotIndex(sourceButton),
				to: sourceButton
					.closest('[data-mapping-key]')
					?.querySelector<HTMLButtonElement>('button[aria-label^="Choose target"]')?.title,
			})),
		).toStrictEqual([
			{
				from: 'Transport belt\nentity:transport-belt',
				matchSummary: `1 match. ${mappingInstructions}`,
				slot: 99,
				to: 'Express transport belt\nentity:express-transport-belt',
			},
			{
				from: 'Inserter\nentity:inserter',
				matchSummary: `0 matches. ${mappingInstructions}`,
				slot: 199,
				to: 'Fast inserter\nentity:fast-inserter',
			},
		]);

		choosePlannerWithClicks('Default Upgrade');
		expect({
			label: screen.getByLabelText('Draft source: Default Upgrade').querySelector('strong')?.textContent,
			target: screen.getByRole('button', {name: 'Choose target for Transport belt'}).title,
		}).toStrictEqual({
			label: 'Default Upgrade',
			target: 'Fast transport belt\nentity:fast-transport-belt',
		});

		choosePlannerWithClicks('Paste upgrade planner…');
		expect({
			label: screen.getByLabelText('Draft source: Paste upgrade planner…').querySelector('strong')?.textContent,
			pasteInput: screen.getByRole('textbox', {name: 'Planner string or JSON'}).tagName,
		}).toStrictEqual({
			label: 'Paste upgrade planner…',
			pasteInput: 'TEXTAREA',
		});
	}, 10_000);

	test('keeps pasted planner parsing feedback distinct from mapping-rule validation', async () => {
		const user = userEvent.setup();
		render(<TransformPanel blueprint={blueprint} />);

		openUpgradePlanner();
		const mappingRegion = screen.getByRole('region', {name: 'Upgrade mappings'});
		expect({
			pastePanel: screen.queryByRole('region', {name: 'Paste planner definition'}),
			pasteTextbox: screen.queryByRole('textbox', {name: 'Planner string or JSON'}),
		}).toStrictEqual({pastePanel: null, pasteTextbox: null});

		await choosePlanner(user, 'Paste upgrade planner…');
		const pastePanel = screen.getByRole('region', {name: 'Paste planner definition'});
		const pasteTextbox = screen.getByRole<HTMLTextAreaElement>('textbox', {name: 'Planner string or JSON'});
		expect({
			alert: within(pastePanel).queryByRole('alert'),
			describedBy: document.getElementById(pasteTextbox.getAttribute('aria-describedby') ?? '')?.textContent,
			extension: pastePanel.dataset.websiteExtension,
			invalid: pasteTextbox.getAttribute('aria-invalid'),
			state: pastePanel.dataset.validationState,
		}).toStrictEqual({
			alert: null,
			describedBy: 'Paste an encoded upgrade planner string or its JSON representation.',
			extension: 'planner-paste-import',
			invalid: null,
			state: 'empty',
		});

		fireEvent.change(pasteTextbox, {target: {value: '{'}});
		expect({
			alert: within(pastePanel).getByRole('alert').textContent,
			invalid: pasteTextbox.getAttribute('aria-invalid'),
			mappingCount: mappingRegion.querySelectorAll('[data-mapping-key]').length,
			mappingRegionPreserved: screen.getByRole('region', {name: 'Upgrade mappings'}),
			state: pastePanel.dataset.validationState,
		}).toStrictEqual({
			alert: 'JSON5: invalid end of input at 1:2',
			invalid: 'true',
			mappingCount: 0,
			mappingRegionPreserved: mappingRegion,
			state: 'invalid',
		});

		fireEvent.change(pasteTextbox, {
			target: {
				value: JSON.stringify({
					upgrade_planner: {
						item: 'upgrade-planner',
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
					},
				}),
			},
		});
		const zeroMatchMapping = screen.getByRole('button', {name: 'Choose source, currently Speed module'});
		expect({
			alert: within(pastePanel).queryByRole('alert'),
			describedBy: document.getElementById(pasteTextbox.getAttribute('aria-describedby') ?? '')?.textContent,
			invalid: pasteTextbox.getAttribute('aria-invalid'),
			mapping: {
				from: zeroMatchMapping.title,
				matchSummary: zeroMatchMapping
					.closest('[data-mapping-key]')
					?.querySelector('.transform-visually-hidden')?.textContent,
				to: screen.getByRole('button', {name: 'Choose target for Speed module'}).title,
			},
			state: pastePanel.dataset.validationState,
		}).toStrictEqual({
			alert: null,
			describedBy: 'Planner loaded into the editable mapping grid.',
			invalid: null,
			mapping: {
				from: 'Speed module\nitem:speed-module',
				matchSummary: `0 matches. ${mappingInstructions}`,
				to: 'Speed module 2\nitem:speed-module-2',
			},
			state: 'valid',
		});

		fireEvent.change(pasteTextbox, {
			target: {
				value: JSON.stringify({
					upgrade_planner: {
						item: 'upgrade-planner',
						version: 0,
						settings: {
							mappers: [
								{
									index: 100,
									from: {type: 'entity', name: 'transport-belt'},
									to: {type: 'entity', name: 'fast-transport-belt'},
								},
								{
									index: 200,
									from: {type: 'entity', name: 'transport-belt'},
									to: {type: 'entity', name: 'express-transport-belt'},
								},
							],
						},
					},
				}),
			},
		});
		expect({
			fieldAlert: within(pastePanel).queryByRole('alert'),
			globalAlert: screen.getByRole('alert').textContent,
			invalid: pasteTextbox.getAttribute('aria-invalid'),
			mappingCount: mappingRegion.querySelectorAll('[data-mapping-key]').length,
			state: pastePanel.dataset.validationState,
		}).toStrictEqual({
			fieldAlert: null,
			globalAlert: 'Upgrade planner defines more than one target for transport-belt.',
			invalid: null,
			mappingCount: 2,
			state: 'valid',
		});

		await choosePlanner(user, 'Default Upgrade');
		expect({
			alert: screen.queryByRole('alert'),
			pastePanel: screen.queryByRole('region', {name: 'Paste planner definition'}),
			pasteTextbox: screen.queryByRole('textbox', {name: 'Planner string or JSON'}),
		}).toStrictEqual({alert: null, pastePanel: null, pasteTextbox: null});
	});

	test('saves a pasted planner with a zero-match mapping and applies its matching rule', async () => {
		const user = userEvent.setup();
		const pastedPlanner: UpgradePlanner = {
			item: 'upgrade-planner',
			label: 'Zero-match planner',
			version: 0,
			settings: {
				mappers: [
					{
						index: 100,
						from: {type: 'entity', name: 'transport-belt'},
						to: {type: 'entity', name: 'express-transport-belt'},
					},
					{
						index: 200,
						from: {type: 'item', name: 'speed-module'},
						to: {type: 'item', name: 'speed-module-2'},
					},
				],
			},
		};
		render(<TransformPanel blueprint={blueprint} />);

		await user.click(screen.getByRole('button', {name: 'Open Upgrade Planner'}));
		await choosePlanner(user, 'Paste upgrade planner…');
		fireEvent.change(screen.getByRole('textbox', {name: 'Planner string or JSON'}), {
			target: {
				value: JSON.stringify({upgrade_planner: pastedPlanner}),
			},
		});

		expect(
			screen
				.getByRole('button', {name: 'Choose target for Transport belt'})
				.querySelector('img')
				?.getAttribute('src'),
		).toBe('https://factorio-icon-cdn.pages.dev/entity/express-transport-belt.webp');
		expect({
			emptyMessage: screen.queryByText('No matching entities or modules in this scope.'),
			unmatchedSource: screen.getByRole('button', {name: 'Choose source, currently Speed module'}).title,
			unmatchedTarget: screen.getByRole('button', {name: 'Choose target for Speed module'}).title,
			unmatchedMapping: screen
				.getByRole('button', {name: 'Choose source, currently Speed module'})
				.closest('[data-mapping-key]')
				?.querySelector('.transform-visually-hidden')?.textContent,
		}).toStrictEqual({
			emptyMessage: null,
			unmatchedSource: 'Speed module\nitem:speed-module',
			unmatchedTarget: 'Speed module 2\nitem:speed-module-2',
			unmatchedMapping: `0 matches. ${mappingInstructions}`,
		});

		await user.click(screen.getByRole('button', {name: 'Save Planner'}));
		const savePrompt = screen.getByRole('dialog', {name: 'Save to Blueprint Library'});
		await user.click(within(savePrompt).getByRole('button', {name: 'Save Planner'}));
		await Promise.resolve();
		const {data: savedRecordData, ...savedRecordMetadata} = libraryRecords[0];
		const saveInput = vi.mocked(db.saveLibraryCopy).mock.calls[0][0];
		const {data: saveInputData, ...saveInputMetadata} = saveInput;
		expect({
			dialogState: interactionState(),
			libraryRecord: {...savedRecordMetadata, planner: parseUpgradePlanner(savedRecordData)},
			navigation: navigate.mock.calls,
			saveInput: {...saveInputMetadata, planner: parseUpgradePlanner(saveInputData)},
		}).toStrictEqual({
			dialogState: {
				activeElement: {name: 'Save Planner', tagName: 'BUTTON'},
				dialogStack: [
					{
						ariaHidden: null,
						inert: false,
						modal: 'true',
						name: 'Upgrade Planner',
						role: 'dialog',
					},
				],
			},
			libraryRecord: {
				id: 'saved-planner-1',
				createdOn: 1,
				updatedOn: 1,
				gameData: {
					type: 'upgrade_planner',
					label: 'Zero-match planner',
					description: undefined,
					gameVersion: '0',
					icons: [],
				},
				selection: undefined,
				parentId: LIBRARY_ROOT_ID,
				position: 0,
				planner: pastedPlanner,
			},
			navigation: [],
			saveInput: {
				destination: {parentId: LIBRARY_ROOT_ID, position: 0},
				gameData: {
					type: 'upgrade_planner',
					label: 'Zero-match planner',
					description: undefined,
					gameVersion: '0',
					icons: [],
				},
				planner: pastedPlanner,
			},
		});

		await applyPlanner(user);
		await Promise.resolve();

		expect({
			dialogState: interactionState(),
			navigation: navigate.mock.calls,
		}).toStrictEqual({
			dialogState: {
				activeElement: {name: 'Open Upgrade Planner', tagName: 'BUTTON'},
				dialogStack: [],
			},
			navigation: [
				[
					{
						to: '/',
						search: {
							pasted: serializeBlueprint({
								blueprint: {
									item: 'blueprint',
									version: 0,
									entities: [
										{
											entity_number: 1,
											name: 'express-transport-belt',
											position: {x: 0, y: 0},
										},
									],
								},
							}),
							selection: '',
						},
					},
				],
			],
		});
	});

	test('applies selected train and tile filters to the live result', async () => {
		const user = userEvent.setup();
		const stripBlueprint: BlueprintString = {
			blueprint: {
				item: 'blueprint',
				version: 0,
				entities: [
					{entity_number: 1, name: 'locomotive', position: {x: 0, y: 0}},
					{entity_number: 10, name: 'train-stop', position: {x: 1, y: 0}},
				],
				tiles: [{name: 'landfill', position: {x: 0, y: 0}}],
			},
		};
		render(<TransformPanel blueprint={stripBlueprint} />);

		openBlueprintEditor();
		await user.click(screen.getByRole('checkbox', {name: 'Trains'}));
		await user.click(screen.getByRole('checkbox', {name: 'Tiles'}));
		await user.click(screen.getByRole('button', {name: 'Save blueprint'}));

		expect(navigate).toHaveBeenCalledExactlyOnceWith({
			to: '/',
			search: {
				pasted: serializeBlueprint(stripTiles(stripTrains(stripBlueprint))),
				selection: '',
			},
		});
	});

	test('keeps trains when ordinary entities are excluded', async () => {
		const user = userEvent.setup();
		const mixedBlueprint: BlueprintString = {
			blueprint: {
				item: 'blueprint',
				version: 0,
				entities: [
					{entity_number: 1, name: 'locomotive', position: {x: 0, y: 0}},
					{entity_number: 10, name: 'train-stop', position: {x: 1, y: 0}},
				],
			},
		};
		render(<TransformPanel blueprint={mixedBlueprint} />);

		openBlueprintEditor();
		await user.click(screen.getByRole('checkbox', {name: 'Entities'}));
		await user.click(screen.getByRole('button', {name: 'Save blueprint'}));

		expect(navigate).toHaveBeenCalledExactlyOnceWith({
			to: '/',
			search: {
				pasted: serializeBlueprint({
					blueprint: {
						item: 'blueprint',
						version: 0,
						entities: [{entity_number: 1, name: 'locomotive', position: {x: 0, y: 0}}],
					},
				}),
				selection: '',
			},
		});
	});
});
