import {beforeEach, describe, expect, test, vi} from 'vite-plus/test';
import {fireEvent, render, screen, within} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {TransformPanel} from '../../src/components/blueprint/panels/transform/TransformPanel';
import {serializeBlueprint} from '../../src/parsing/blueprintParser';
import type {BlueprintString} from '../../src/parsing/types';
import {type LibraryRecord} from '../../src/storage/db';
import {
	applyPlanner,
	blueprint,
	choosePlanner,
	chooseSignal,
	clearAllMappings,
	firstEmptyMappingSourceButton,
	installLibraryDbMocks,
	interactionState,
	mappingInstructions,
	mappingSlotIndex,
	openUpgradePlanner,
	renderedMappingRows,
	searchSignals,
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

describe('TransformPanel upgrade mapping rows and pickers', () => {
	beforeEach(() => {
		vi.restoreAllMocks();
		libraryRecords.length = 0;
		navigate.mockReset();
		installLibraryDbMocks(libraryRecords);
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

	test('offers hidden module-slot candidates and blocks only exact duplicate sources in Set the filter', async () => {
		const user = userEvent.setup();
		render(<TransformPanel blueprint={blueprint} />);

		openUpgradePlanner();
		await user.click(firstEmptyMappingSourceButton());

		const picker = screen.getByRole('dialog', {name: 'Set the filter'});
		const duplicate = within(picker).getByRole('button', {name: 'Choose Transport belt'});
		expect(duplicate.getAttribute('aria-disabled')).toBe('true');

		await user.click(within(picker).getByRole('button', {name: 'Rare quality'}));
		expect(duplicate.getAttribute('aria-disabled')).toBe('false');

		await searchSignals(user, 'Empty module slot');
		expect(
			within(picker).getByRole('button', {name: 'Choose Empty module slot'}).getAttribute('aria-disabled'),
		).toBe('false');
	});

	test('restricts Select upgrade for a module source to the module family including the empty slot', async () => {
		const user = userEvent.setup();
		render(<TransformPanel blueprint={blueprint} />);

		openUpgradePlanner();
		await user.click(firstEmptyMappingSourceButton());
		await chooseSignal(user, 'Speed module');
		await user.click(screen.getByRole('button', {name: 'Choose target for Speed module'}));

		const targetPicker = screen.getByRole('dialog', {name: 'Select upgrade'});
		expect(
			within(targetPicker)
				.getAllByRole('button', {name: /^Choose /})
				.map((button) => button.getAttribute('aria-label')),
		).toStrictEqual([
			'Choose Speed module',
			'Choose Speed module 2',
			'Choose Speed module 3',
			'Choose Efficiency module',
			'Choose Efficiency module 2',
			'Choose Efficiency module 3',
			'Choose Productivity module',
			'Choose Productivity module 2',
			'Choose Productivity module 3',
			'Choose Quality module',
			'Choose Quality module 2',
			'Choose Quality module 3',
			'Choose Empty module slot',
		]);
	});

	test('scopes a module source to one machine through the Set the filter entity-filter extras', async () => {
		const user = userEvent.setup();
		render(<TransformPanel blueprint={blueprint} />);

		openUpgradePlanner();
		await user.click(firstEmptyMappingSourceButton());
		const sourcePicker = screen.getByRole('dialog', {name: 'Set the filter'});
		expect(within(sourcePicker).queryByRole('button', {name: 'Choose entity filter'})).toBe(null);

		await searchSignals(user, 'Speed module');
		await user.click(within(sourcePicker).getByRole('button', {name: 'Choose Speed module'}));
		await user.click(within(sourcePicker).getByRole('button', {name: 'Choose entity filter'}));

		const entityPicker = screen.getByRole('dialog', {name: 'Choose entity filter'});
		const labels = within(entityPicker)
			.getAllByRole('button', {name: /^Choose /})
			.map((button) => button.getAttribute('aria-label'));
		expect({
			hasAssembler: labels.includes('Choose Assembling machine 2'),
			hasBelt: labels.includes('Choose Transport belt'),
			hasModuleItem: labels.includes('Choose Speed module'),
		}).toStrictEqual({
			hasAssembler: true,
			hasBelt: false,
			hasModuleItem: false,
		});
		await user.click(within(entityPicker).getByRole('button', {name: 'Choose Assembling machine 2'}));
		await user.click(within(sourcePicker).getByRole('button', {name: 'Confirm'}));

		await user.click(screen.getByRole('button', {name: 'Choose source, currently Speed module'}));
		expect(
			screen
				.getByRole('button', {name: 'Edit entity filter, currently Assembling machine 2'})
				.getAttribute('aria-label'),
		).toBe('Edit entity filter, currently Assembling machine 2');
	});

	test('applies nothing after every suggested mapping is cleared', async () => {
		const user = userEvent.setup();
		render(<TransformPanel blueprint={blueprint} />);

		openUpgradePlanner();
		clearAllMappings();

		expect({
			mappingRows: renderedMappingRows().length,
			matchSummary: screen.getByLabelText('0 matches').textContent,
		}).toStrictEqual({
			mappingRows: 0,
			matchSummary: '0 matches',
		});

		await applyPlanner(user);

		expect(navigate).toHaveBeenCalledExactlyOnceWith({
			to: '/',
			search: {
				pasted: serializeBlueprint(blueprint),
				selection: '',
			},
		});
	});

	test('edits an entity destination module-slot plan through the Entity settings extras', async () => {
		const user = userEvent.setup();
		render(<TransformPanel blueprint={blueprint} />);

		openUpgradePlanner();
		fireEvent.contextMenu(screen.getByRole('button', {name: 'Choose source, currently Assembling machine 1'}));
		fireEvent.contextMenu(screen.getByRole('button', {name: 'Choose source, currently Assembling machine 2'}));
		await user.click(firstEmptyMappingSourceButton());
		await user.click(screen.getByRole('button', {name: 'Rare quality'}));
		await chooseSignal(user, 'Assembling machine 1');
		const newRow = screen.getByRole('listitem', {name: 'Incomplete mapping from Assembling machine 1'});
		await user.click(within(newRow).getByRole('button', {name: 'Choose target for Assembling machine 1'}));

		const targetPicker = screen.getByRole('dialog', {name: 'Select upgrade'});
		expect(within(targetPicker).queryByRole('checkbox', {name: 'Module slots'})).toBe(null);

		await user.click(within(targetPicker).getByRole('button', {name: 'Choose Assembling machine 2'}));
		await user.click(within(targetPicker).getByRole('checkbox', {name: 'Module slots'}));
		const slotButtons = within(targetPicker).getAllByRole('button', {name: /^Choose module for slot /});
		expect(slotButtons).toHaveLength(2);

		await user.click(slotButtons[0]);
		await user.click(
			within(screen.getByRole('dialog', {name: 'Choose module'})).getByRole('button', {
				name: 'Choose Speed module',
			}),
		);
		await user.click(within(targetPicker).getByRole('button', {name: 'Confirm'}));

		await user.click(
			within(
				screen.getByRole('listitem', {name: 'Mapping from Assembling machine 1 to Assembling machine 2'}),
			).getByRole('button', {name: 'Choose target for Assembling machine 1'}),
		);
		const reopened = screen.getByRole('dialog', {name: 'Select upgrade'});
		expect({
			checked: within(reopened).getByRole<HTMLInputElement>('checkbox', {name: 'Module slots'}).checked,
			slotOne: within(reopened)
				.getByRole('button', {name: 'Edit module slot 1, currently Speed module'})
				.getAttribute('aria-label'),
			slotTwo: within(reopened)
				.getByRole('button', {name: 'Choose module for slot 2'})
				.getAttribute('aria-label'),
		}).toStrictEqual({
			checked: true,
			slotOne: 'Edit module slot 1, currently Speed module',
			slotTwo: 'Choose module for slot 2',
		});
	});

	test('offers fuel sources and restricts their Select upgrade targets to the fuel family', async () => {
		const user = userEvent.setup();
		render(<TransformPanel blueprint={blueprint} />);

		openUpgradePlanner();
		await user.click(firstEmptyMappingSourceButton());
		await chooseSignal(user, 'Coal');
		await user.click(screen.getByRole('button', {name: 'Choose target for Coal'}));

		const targetPicker = screen.getByRole('dialog', {name: 'Select upgrade'});
		const labels = within(targetPicker)
			.getAllByRole('button', {name: /^Choose /})
			.map((button) => button.getAttribute('aria-label'));
		expect({
			count: labels.length,
			hasBelts: labels.some((label) => label?.includes('belt') === true),
			hasModules: labels.some((label) => label?.includes('module') === true),
			rocketFuel: labels.includes('Choose Rocket fuel'),
			solidFuel: labels.includes('Choose Solid fuel'),
		}).toStrictEqual({
			count: 20,
			hasBelts: false,
			hasModules: false,
			rocketFuel: true,
			solidFuel: true,
		});
	});

	test('edits a module limit in the Select upgrade extras and shows it on the target slot', async () => {
		const user = userEvent.setup();
		render(<TransformPanel blueprint={blueprint} />);

		openUpgradePlanner();
		await user.click(firstEmptyMappingSourceButton());
		await chooseSignal(user, 'Speed module');
		await user.click(screen.getByRole('button', {name: 'Choose target for Speed module'}));

		const targetPicker = screen.getByRole('dialog', {name: 'Select upgrade'});
		expect(within(targetPicker).queryByRole('checkbox', {name: 'Module limit'})).toBe(null);

		await user.click(within(targetPicker).getByRole('button', {name: 'Choose Speed module 2'}));
		await user.click(within(targetPicker).getByRole('checkbox', {name: 'Module limit'}));
		const limitValue = within(targetPicker).getByRole('spinbutton', {name: 'Module limit value'});
		fireEvent.change(limitValue, {target: {value: '2'}});
		await user.click(within(targetPicker).getByRole('button', {name: 'Confirm'}));

		const row = screen.getByRole('listitem', {name: 'Mapping from Speed module to Speed module 2'});
		const target = within(row).getByRole('button', {name: 'Choose target for Speed module'});
		expect(target.querySelector('.transform-signal-slot__count')?.textContent).toBe('2');

		await user.click(target);
		const reopenedPicker = screen.getByRole('dialog', {name: 'Select upgrade'});
		expect({
			limitChecked: within(reopenedPicker).getByRole<HTMLInputElement>('checkbox', {name: 'Module limit'})
				.checked,
			limitValue: within(reopenedPicker).getByRole<HTMLInputElement>('spinbutton', {name: 'Module limit value'})
				.value,
		}).toStrictEqual({
			limitChecked: true,
			limitValue: '2',
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
									index: 0,
									from: {type: 'entity', name: 'transport-belt'},
									to: {type: 'entity', name: 'fast-transport-belt'},
								},
								{
									index: 1,
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
				slot: 100,
			},
			{
				label: 'Mapping from Speed module to Speed module 2',
				matchSummary: `0 matches. ${mappingInstructions}`,
				slot: 200,
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
});
