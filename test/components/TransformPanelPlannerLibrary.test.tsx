import {beforeEach, describe, expect, test, vi} from 'vite-plus/test';
import {fireEvent, render, screen, waitFor, within} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {TransformPanel} from '../../src/components/blueprint/panels/transform/TransformPanel';
import {serializeBlueprint} from '../../src/parsing/blueprintParser';
import type {BlueprintString, BlueprintStringWithIndex, UpgradePlanner} from '../../src/parsing/types';
import {parseUpgradePlanner} from '../../src/transform/upgradePlanner';
import {db, LIBRARY_ROOT_ID, type LibraryRecord} from '../../src/storage/db';
import {
	applyPlanner,
	blueprint,
	choosePlanner,
	chooseSignal,
	installLibraryDbMocks,
	interactionState,
	openBlueprintEditor,
	openUpgradePlanner,
	rareBeltUpgradesPlanner,
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

describe('TransformPanel planner library records', () => {
	beforeEach(() => {
		vi.restoreAllMocks();
		libraryRecords.length = 0;
		navigate.mockReset();
		installLibraryDbMocks(libraryRecords);
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
		await user.click(screen.getByRole('button', {name: 'Save to Library'}));
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

	test('surfaces a failed library save and leaves the save prompt open for a retry', async () => {
		const user = userEvent.setup();
		vi.mocked(db.saveLibraryCopy).mockRejectedValue(new Error('An upgrade planner supports at most 4 icons.'));
		render(<TransformPanel blueprint={blueprint} />);

		openUpgradePlanner();
		await user.click(screen.getByRole('button', {name: 'Save to Library'}));
		const savePrompt = screen.getByRole('dialog', {name: 'Save to Blueprint Library'});
		await user.click(within(savePrompt).getByRole('button', {name: 'Save Planner'}));
		const failure = await within(savePrompt).findByRole('alert');

		expect({
			failure: failure.textContent,
			operations: within(savePrompt)
				.getAllByRole('button')
				.map((button) => ({disabled: (button as HTMLButtonElement).disabled, name: button.textContent})),
			promptOpen: screen.queryByRole('dialog', {name: 'Save to Blueprint Library'}) !== null,
		}).toStrictEqual({
			failure: 'An upgrade planner supports at most 4 icons.',
			operations: [
				{disabled: false, name: 'Cancel Save'},
				{disabled: false, name: 'Save Planner'},
			],
			promptOpen: true,
		});
	});

	test('surfaces a failed library update and clears the failure once the retry succeeds', async () => {
		const user = userEvent.setup();
		const planner: UpgradePlanner = {
			item: 'upgrade-planner',
			label: 'Library belts',
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
		};
		libraryRecords.push(storedPlanner('library-belts', planner, 'Library belts', 4));
		const updateLibraryRecord = vi.mocked(db.updateLibraryRecord);
		const succeedingUpdate = updateLibraryRecord.getMockImplementation();
		updateLibraryRecord.mockRejectedValueOnce(new Error('QuotaExceededError: the database is full.'));
		render(<TransformPanel blueprint={blueprint} />);

		openUpgradePlanner();
		await choosePlanner(user, 'Library belts');
		await user.click(screen.getByRole('button', {name: 'Save to Library'}));
		const savePrompt = screen.getByRole('dialog', {name: 'Save to Blueprint Library'});
		await user.click(within(savePrompt).getByRole('button', {name: 'Update Planner'}));
		const failure = await within(savePrompt).findByRole('alert');

		expect({
			failure: failure.textContent,
			promptOpen: screen.queryByRole('dialog', {name: 'Save to Blueprint Library'}) !== null,
		}).toStrictEqual({
			failure: 'QuotaExceededError: the database is full.',
			promptOpen: true,
		});

		updateLibraryRecord.mockImplementation(succeedingUpdate!);
		await user.click(within(savePrompt).getByRole('button', {name: 'Update Planner'}));

		expect({
			failure: screen.queryByRole('alert'),
			promptOpen: screen.queryByRole('dialog', {name: 'Save to Blueprint Library'}) !== null,
		}).toStrictEqual({
			failure: null,
			promptOpen: false,
		});
	});

	test('keeps quality-preserving upgrade semantics after saving the suggested planner to the library', async () => {
		const user = userEvent.setup();
		const legendaryBelts: BlueprintString = {
			blueprint: {
				item: 'blueprint',
				version: 0,
				entities: [{entity_number: 1, name: 'transport-belt', quality: 'legendary', position: {x: 0, y: 0}}],
			},
		};
		render(<TransformPanel blueprint={legendaryBelts} />);

		openUpgradePlanner();
		await user.click(screen.getByRole('button', {name: 'Save to Library'}));
		const savePrompt = screen.getByRole('dialog', {name: 'Save to Blueprint Library'});
		await user.click(within(savePrompt).getByRole('button', {name: 'Save Planner'}));
		await screen.findByRole('status');
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
								quality: 'legendary',
								position: {x: 0, y: 0},
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
		await user.click(screen.getByRole('button', {name: 'Save to Library'}));
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
		await user.click(screen.getByRole('button', {name: 'Save to Library'}));
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
		await user.click(screen.getByRole('button', {name: 'Save to Library'}));
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
			{label: 'Discard local planner', style: 'tool_button_red'},
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
		await user.click(screen.getByRole('button', {name: 'Save to Library'}));
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

	test('applies the current planner draft directly without opening another selector', async () => {
		const user = userEvent.setup();
		render(<TransformPanel blueprint={blueprint} />);

		const plannerTool = screen.getByRole('button', {name: 'Open Upgrade Planner'});
		await user.click(plannerTool);

		expect({
			dialogState: interactionState(),
			plannerActions: ['Save to Library', 'Apply Upgrade', 'Apply Downgrade'].map(
				(name) => screen.queryByRole('button', {name})?.textContent ?? null,
			),
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
			plannerActions: ['Save to Library', 'Apply Upgrade', 'Apply Downgrade'],
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
});
