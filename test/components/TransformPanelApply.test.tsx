import {beforeEach, describe, expect, test, vi} from 'vite-plus/test';
import {fireEvent, render, screen, waitFor, within} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {TransformPanel} from '../../src/components/blueprint/panels/transform/TransformPanel';
import {serializeBlueprint} from '../../src/parsing/blueprintParser';
import type {BlueprintString, UpgradeMapping, UpgradePlanner} from '../../src/parsing/types';
import {stripTiles, stripTrains} from '../../src/transform/strip';
import {parseUpgradePlanner} from '../../src/transform/upgradePlanner';
import {db, LIBRARY_ROOT_ID, type LibraryRecord} from '../../src/storage/db';
import {
	applyPlanner,
	blueprint,
	choosePlanner,
	choosePlannerWithClicks,
	chooseSignal,
	chooseSignalWithClicks,
	firstEmptyMappingSourceButton,
	installLibraryDbMocks,
	interactionState,
	mappingInstructions,
	mappingSlotIndex,
	openBlueprintEditor,
	openUpgradePlanner,
	searchSignals,
	storedPlanner,
} from './transformPanelSupport';

const {libraryRecords, navigate} = vi.hoisted(() => ({
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

describe('TransformPanel application scope and planner parsing', () => {
	beforeEach(() => {
		vi.restoreAllMocks();
		libraryRecords.length = 0;
		navigate.mockReset();
		installLibraryDbMocks(libraryRecords);
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
					slot: 100,
					to: 'Fast transport belt\nentity:fast-transport-belt',
				},
				{
					from: 'Speed module\nitem:speed-module',
					matchSummary: `0 matches. ${mappingInstructions}`,
					slot: 200,
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
				slot: 100,
				to: 'Express transport belt\nentity:express-transport-belt',
			},
			{
				from: 'Inserter\nentity:inserter',
				matchSummary: `0 matches. ${mappingInstructions}`,
				slot: 200,
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

	test('positions zero-based mapper indexes and reports mappers no grid can position', async () => {
		const user = userEvent.setup();
		render(<TransformPanel blueprint={blueprint} />);

		openUpgradePlanner();
		const mappingRegion = screen.getByRole('region', {name: 'Upgrade mappings'});
		await choosePlanner(user, 'Paste upgrade planner…');
		const pastePanel = screen.getByRole('region', {name: 'Paste planner definition'});
		const pasteTextbox = screen.getByRole<HTMLTextAreaElement>('textbox', {name: 'Planner string or JSON'});
		const pastedMappers = (mappers: readonly UpgradeMapping[]): string =>
			JSON.stringify({upgrade_planner: {item: 'upgrade-planner', version: 0, settings: {mappers}}});
		const belt = {type: 'entity', name: 'transport-belt'} as const;
		const fastBelt = {type: 'entity', name: 'fast-transport-belt'} as const;
		const speedModule = {type: 'item', name: 'speed-module'} as const;
		const speedModule2 = {type: 'item', name: 'speed-module-2'} as const;

		fireEvent.change(pasteTextbox, {
			target: {
				value: pastedMappers([
					{index: 0, from: belt, to: fastBelt},
					{index: 1, from: speedModule, to: speedModule2},
				]),
			},
		});
		expect({
			alert: within(pastePanel).queryByRole('alert'),
			beltSlot: mappingSlotIndex(screen.getByRole('button', {name: 'Choose source, currently Transport belt'})),
			mappingCount: mappingRegion.querySelectorAll('[data-mapping-key]').length,
			moduleSlot: mappingSlotIndex(screen.getByRole('button', {name: 'Choose source, currently Speed module'})),
			state: pastePanel.dataset.validationState,
		}).toStrictEqual({alert: null, beltSlot: 0, mappingCount: 2, moduleSlot: 1, state: 'valid'});

		fireEvent.change(pasteTextbox, {
			target: {
				value: pastedMappers([
					{index: 0, from: belt, to: fastBelt},
					{index: 0, from: speedModule, to: speedModule2},
				]),
			},
		});
		expect({
			alert: within(pastePanel).getByRole('alert').textContent,
			invalid: pasteTextbox.getAttribute('aria-invalid'),
			mappingCount: mappingRegion.querySelectorAll('[data-mapping-key]').length,
			mappingRegionPreserved: screen.getByRole('region', {name: 'Upgrade mappings'}),
			state: pastePanel.dataset.validationState,
		}).toStrictEqual({
			alert: 'Upgrade planner mapping index 0 is used more than once.',
			invalid: 'true',
			mappingCount: 0,
			mappingRegionPreserved: mappingRegion,
			state: 'invalid',
		});

		fireEvent.change(pasteTextbox, {target: {value: pastedMappers([{index: 0}])}});
		expect({
			alert: within(pastePanel).getByRole('alert').textContent,
			mappingCount: mappingRegion.querySelectorAll('[data-mapping-key]').length,
			mappingRegionPreserved: screen.getByRole('region', {name: 'Upgrade mappings'}),
			state: pastePanel.dataset.validationState,
		}).toStrictEqual({
			alert: 'Upgrade planner mapping 0 must define from, to, or both.',
			mappingCount: 0,
			mappingRegionPreserved: mappingRegion,
			state: 'invalid',
		});
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

		await user.click(screen.getByRole('button', {name: 'Save to Library'}));
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
				activeElement: {name: 'Save to Library', tagName: 'BUTTON'},
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

	test('applies an unnamed pasted planner while library saving stays disabled', async () => {
		const user = userEvent.setup();
		render(<TransformPanel blueprint={blueprint} />);

		openUpgradePlanner();
		await choosePlanner(user, 'Paste upgrade planner…');
		fireEvent.change(screen.getByRole('textbox', {name: 'Planner string or JSON'}), {
			target: {
				value: JSON.stringify({
					upgrade_planner: {
						item: 'upgrade-planner',
						label: '',
						version: 0,
						settings: {
							mappers: [
								{
									index: 0,
									from: {type: 'entity', name: 'transport-belt'},
									to: {type: 'entity', name: 'fast-transport-belt'},
								},
							],
						},
					},
				}),
			},
		});

		expect(
			Object.fromEntries(
				['Save to Library', 'Apply Downgrade', 'Apply Upgrade'].map((name) => [
					name,
					screen.getByRole<HTMLButtonElement>('button', {name}).disabled,
				]),
			),
		).toStrictEqual({
			'Apply Downgrade': false,
			'Apply Upgrade': false,
			'Save to Library': true,
		});

		await applyPlanner(user);
		await Promise.resolve();

		expect(navigate.mock.calls).toStrictEqual([
			[
				{
					to: '/',
					search: {
						pasted: serializeBlueprint({
							blueprint: {
								item: 'blueprint',
								version: 0,
								entities: [{entity_number: 1, name: 'fast-transport-belt', position: {x: 0, y: 0}}],
							},
						}),
						selection: '',
					},
				},
			],
		]);
	});
});
