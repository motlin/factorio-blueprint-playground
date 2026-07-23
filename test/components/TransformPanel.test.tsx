import {fireEvent, render, screen, within} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {beforeEach, describe, expect, test, vi} from 'vite-plus/test';

import {TransformPanel} from '../../src/components/blueprint/panels/transform/TransformPanel';
import {serializeBlueprint} from '../../src/parsing/blueprintParser';
import type {BlueprintString, BlueprintStringWithIndex, UpgradePlanner} from '../../src/parsing/types';
import type {DatabaseBlueprint} from '../../src/storage/db';
import {stripTiles, stripTrains} from '../../src/transform/strip';
import {applyUpgradeRules, builtInUpgradeRules} from '../../src/transform/upgradePlanner';

const {historyBlueprints, navigate} = vi.hoisted(() => ({
	historyBlueprints: [] as DatabaseBlueprint[],
	navigate: vi.fn<(options: unknown) => void>(),
}));

vi.mock('dexie-react-hooks', () => ({
	useLiveQuery: () => historyBlueprints,
}));
vi.mock('@tanstack/react-router', async (importOriginal) => ({
	...(await importOriginal()),
	useNavigate: () => navigate,
}));

const blueprint: BlueprintString = {
	blueprint: {
		item: 'blueprint',
		version: 0,
		entities: [{entity_number: 1, name: 'transport-belt', position: {x: 0, y: 0}}],
	},
};

function openUpgradePlanner() {
	fireEvent.click(screen.getByRole('button', {name: 'Open Upgrade Planner'}));
}

function openBlueprintEditor() {
	fireEvent.click(screen.getByRole('button', {name: 'Open Blueprint Editor'}));
}

async function choosePlanner(user: ReturnType<typeof userEvent.setup>, label: string) {
	await user.click(screen.getByRole('button', {name: /Load planner, currently/}));
	await user.click(screen.getByRole('button', {name: label}));
}

async function chooseSignal(user: ReturnType<typeof userEvent.setup>, label: string) {
	if (screen.queryByRole('button', {name: `Choose ${label}`}) === null && label.startsWith('Signal ')) {
		await user.click(screen.getByRole('tab', {name: 'Virtual signals'}));
	}
	await user.click(screen.getByRole('button', {name: `Choose ${label}`}));
	await user.click(screen.getByRole('button', {name: 'Confirm'}));
}

function storedPlanner(sha: string, planner: UpgradePlanner, label: string): DatabaseBlueprint {
	return {
		metadata: {
			sha,
			createdOn: 0,
			lastUpdatedOn: 0,
			data: serializeBlueprint({upgrade_planner: planner}),
			fetchMethod: 'data',
		},
		gameData: {type: 'upgrade_planner', label, icons: []},
	};
}

describe('TransformPanel', () => {
	beforeEach(() => {
		historyBlueprints.length = 0;
		navigate.mockReset();
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
		const configuration = within(dialog).getByRole('region', {name: 'Upgrade Planner configuration'});
		const dialogHeading = within(dialog).getByRole('heading', {name: 'Upgrade Planner'});
		expect(dialog.getAttribute('aria-labelledby')).toBe(dialogHeading.id);
		expect({
			bodyClass: configuration.className,
			bookWidePanel: within(configuration)
				.getByRole('heading', {name: 'Book-wide replacements'})
				.closest('section')?.className,
			changeIn: screen.queryByRole('group', {name: 'Change in'}),
			closeButton: within(dialog).getByRole('button', {name: 'Close Upgrade Planner'}).getAttribute('aria-label'),
			configurationPanel: within(configuration)
				.getByRole('heading', {name: 'Upgrade mappings'})
				.closest('section')?.className,
			dialog: dialog.getAttribute('aria-modal'),
			exportActions: ['Copy String', 'Copy JSON', 'Download String', 'Open in Playground'].map((name) =>
				screen.queryByRole('button', {name}),
			),
			footerElement: dialog.lastElementChild?.tagName,
			fromToGroup: within(configuration)
				.getByRole('group', {name: 'From and To mappings'})
				.getAttribute('aria-label'),
			headerElement: dialog.firstElementChild?.tagName,
			liveResult: screen.queryByText('Live result'),
			modeButtons: ['Upgrade', 'Downgrade', 'Strip quality'].map((name) => screen.queryByRole('button', {name})),
			operationButtons: ['Apply upgrades', 'Apply downgrades'].map(
				(name) => screen.getByRole('button', {name}).textContent,
			),
			preserveCapitalization: screen.queryByRole('checkbox', {name: 'Preserve capitalization'}),
			scrollTabIndex: configuration.tabIndex,
			sourceIcon: screen
				.getByRole('button', {name: 'Choose source, currently Transport belt'})
				.querySelector('img')
				?.getAttribute('src'),
			targetIcon: screen
				.getByRole('button', {name: 'Choose target for Transport belt'})
				.querySelector('img')
				?.getAttribute('src'),
			bookWideReplacements: screen.getByRole('heading', {name: 'Book-wide replacements'}).textContent,
			websiteLabel: within(configuration).getByText('Website extension').textContent,
		}).toStrictEqual({
			bodyClass: 'transform-workbench__body upgrade-planner-dialog__scroll-region',
			bookWidePanel: 'panel-hole transform-workflow__section transform-workflow__website-replacements',
			changeIn: null,
			closeButton: 'Close Upgrade Planner',
			configurationPanel: 'panel-hole upgrade-planner-dialog__configuration',
			dialog: 'true',
			exportActions: [null, null, null, null],
			footerElement: 'FOOTER',
			fromToGroup: 'From and To mappings',
			headerElement: 'HEADER',
			liveResult: null,
			modeButtons: [null, null, null],
			operationButtons: ['Apply upgrades', 'Apply downgrades'],
			preserveCapitalization: null,
			scrollTabIndex: 0,
			sourceIcon: 'https://factorio-icon-cdn.pages.dev/entity/transport-belt.webp',
			targetIcon: 'https://factorio-icon-cdn.pages.dev/entity/fast-transport-belt.webp',
			bookWideReplacements: 'Book-wide replacements',
			websiteLabel: 'Website extension',
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
		expect({
			bookWideReplacements: screen.queryByRole('heading', {name: 'Book-wide replacements'}),
			bodyClass: dialog.querySelector('.transform-workbench__body')?.className,
			cleanup: screen.queryByRole('heading', {name: 'Cleanup'}),
			components: screen.getByRole('heading', {name: 'Components'}).textContent,
			description: screen.getByRole('textbox', {name: 'Blueprint description'}).textContent,
			dialog: dialog.getAttribute('aria-modal'),
			footerElement: dialog.lastElementChild?.tagName,
			filters: ['Modules', 'Entities', 'Trains', 'Tiles'].map(
				(name) => screen.getByRole<HTMLInputElement>('checkbox', {name}).checked,
			),
			headerElement: dialog.firstElementChild?.tagName,
			iconSlots: [1, 2, 3, 4].map((index) =>
				screen.getByRole('button', {name: `Choose icon ${index.toString()}`}).getAttribute('aria-label'),
			),
			title: dialog.querySelector('.blueprint-editor__title')?.textContent,
			plannerMappings: screen.queryByRole('group', {name: 'Planner operation'}),
			preview: screen.queryByRole('heading', {name: 'Preview'}),
			saveDestination: screen.queryByLabelText('Save destination'),
		}).toStrictEqual({
			bookWideReplacements: null,
			bodyClass: 'transform-workbench__body blueprint-editor__layout',
			cleanup: null,
			components: 'Components',
			description: '',
			dialog: 'true',
			footerElement: 'FOOTER',
			filters: [true, true, true, true],
			headerElement: 'HEADER',
			iconSlots: ['Choose icon 1', 'Choose icon 2', 'Choose icon 3', 'Choose icon 4'],
			title: 'Untitled blueprint',
			plannerMappings: null,
			preview: null,
			saveDestination: null,
		});
	});

	test('opens the upgrade planner selector from the editor toolbar and keeps the draft open', async () => {
		const user = userEvent.setup();
		render(<TransformPanel blueprint={blueprint} />);

		openBlueprintEditor();
		const upgradeButton = screen.getByRole<HTMLButtonElement>('button', {
			name: 'Upgrade items and entities in the blueprint',
		});
		expect({
			controlledDialog: document.getElementById(upgradeButton.getAttribute('aria-controls') ?? ''),
			disabled: upgradeButton.disabled,
			expanded: upgradeButton.getAttribute('aria-expanded'),
			icon: upgradeButton.querySelector('img')?.getAttribute('src'),
			inTitleRow: upgradeButton.closest('.blueprint-editor__title-row') !== null,
			toolbarActions: [
				...screen.getByRole('toolbar', {name: 'Blueprint editor actions'}).querySelectorAll('button'),
			].map((button) => button.getAttribute('aria-label')),
		}).toStrictEqual({
			controlledDialog: null,
			disabled: false,
			expanded: 'false',
			icon: 'https://factorio-icon-cdn.pages.dev/item/upgrade-planner.webp',
			inTitleRow: true,
			toolbarActions: [
				'Upgrade items and entities in the blueprint',
				'Choose upgrade planner for toolbar slot',
				'Parametrise or reconfigure the blueprint',
			],
		});

		await user.click(upgradeButton);
		const selector = screen.getByRole('dialog', {name: 'Select the upgrade planner to apply'});
		expect({
			blueprintEditor: screen.getByRole('dialog', {name: 'Blueprint Editor'}).getAttribute('aria-modal'),
			controls: upgradeButton.getAttribute('aria-controls'),
			expanded: upgradeButton.getAttribute('aria-expanded'),
			selector: selector.getAttribute('aria-modal'),
			standalonePlanner: screen.queryByRole('dialog', {name: 'Upgrade Planner'}),
		}).toStrictEqual({
			blueprintEditor: 'true',
			controls: selector.id,
			expanded: 'true',
			selector: 'true',
			standalonePlanner: null,
		});

		await user.click(screen.getByRole('button', {name: 'Close upgrade planner selector'}));
		await user.type(screen.getByRole('textbox', {name: 'Blueprint description'}), 'Draft description');
		const draftUpgradeButton = screen.getByRole<HTMLButtonElement>('button', {
			name: 'Upgrade items and entities in the blueprint',
		});
		await user.click(draftUpgradeButton);
		expect({
			description: screen.getByRole<HTMLTextAreaElement>('textbox', {name: 'Blueprint description'}).value,
			disabled: draftUpgradeButton.disabled,
			expanded: draftUpgradeButton.getAttribute('aria-expanded'),
			selector: screen
				.getByRole('dialog', {name: 'Select the upgrade planner to apply'})
				.getAttribute('aria-modal'),
		}).toStrictEqual({description: 'Draft description', disabled: false, expanded: 'true', selector: 'true'});

		await user.click(screen.getByRole('button', {name: /Default Upgrade/}));
		const placedUpgradeButton = screen.getByRole('button', {name: 'Apply Default Upgrade as upgrade'});
		expect({
			description: screen.getByRole<HTMLTextAreaElement>('textbox', {name: 'Blueprint description'}).value,
			navigation: navigate.mock.calls,
			placedPlanner: screen
				.getByRole('button', {name: 'Change placed upgrade planner, currently Default Upgrade'})
				.querySelector('img')
				?.getAttribute('src'),
			removePlanner: screen.getByRole('button', {name: 'Remove Default Upgrade from toolbar slot'}).textContent,
			selector: screen.queryByRole('dialog', {name: 'Select the upgrade planner to apply'}),
		}).toStrictEqual({
			description: 'Draft description',
			navigation: [],
			placedPlanner: 'https://factorio-icon-cdn.pages.dev/item/upgrade-planner.webp',
			removePlanner: '×',
			selector: null,
		});

		await user.click(placedUpgradeButton);
		expect(navigate).toHaveBeenCalledExactlyOnceWith({
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
		const emptySlot = screen.getByRole('button', {name: 'Choose upgrade planner for toolbar slot'});
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
			slot: screen.getByRole('button', {name: 'Choose upgrade planner for toolbar slot'}).textContent,
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
			name: "Change placed upgrade planner, currently Alice's dropped planner",
		});
		expect({
			apply: screen
				.getByRole('button', {name: "Apply Alice's dropped planner as upgrade"})
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

		const removeButton = screen.getByRole('button', {
			name: "Remove Alice's dropped planner from toolbar slot",
		});
		removeButton.focus();
		await user.keyboard('{Enter}');
		expect({
			apply: screen
				.getByRole('button', {
					name: 'Upgrade items and entities in the blueprint',
				})
				.getAttribute('aria-expanded'),
			remove: screen.queryByRole('button', {
				name: "Remove Alice's dropped planner from toolbar slot",
			}),
			slot: screen.getByRole('button', {name: 'Choose upgrade planner for toolbar slot'}).textContent,
		}).toStrictEqual({
			apply: 'false',
			remove: null,
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
			await user.click(
				screen.getByRole('button', {
					name: `Apply Default Upgrade as ${direction}`,
				}),
			);

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

	test('opens the Factorio tools with B and U except while editing text or choosing an icon', async () => {
		const user = userEvent.setup();
		render(<TransformPanel blueprint={blueprint} />);

		fireEvent.keyDown(window, {code: 'KeyB'});
		expect(screen.getByRole('dialog', {name: 'Blueprint Editor'}).getAttribute('aria-modal')).toBe('true');

		await user.click(screen.getByRole('button', {name: 'Choose icon 1'}));
		fireEvent.keyDown(window, {code: 'KeyU'});
		expect({
			blueprintEditor: screen.getByRole('dialog', {name: 'Blueprint Editor'}).getAttribute('aria-modal'),
			picker: screen.getByRole('dialog', {name: 'Choose label icon 1'}).getAttribute('aria-modal'),
			upgradePlanner: screen.queryByRole('dialog', {name: 'Upgrade Planner'}),
		}).toStrictEqual({blueprintEditor: 'true', picker: 'true', upgradePlanner: null});

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
		await user.click(screen.getByRole('button', {name: 'Cancel'}));

		expect({
			dialog: screen.queryByRole('dialog', {name: 'Blueprint Editor'}),
			navigation: navigate.mock.calls,
		}).toStrictEqual({
			dialog: null,
			navigation: [],
		});
	});

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

		openBlueprintEditor();
		await user.click(screen.getByRole('button', {name: 'Edit blueprint title'}));
		await user.clear(screen.getByRole('textbox', {name: 'Blueprint title'}));
		await user.type(screen.getByRole('textbox', {name: 'Blueprint title'}), 'Bob{Enter}');
		await user.clear(screen.getByRole('textbox', {name: 'Blueprint description'}));
		await user.type(screen.getByRole('textbox', {name: 'Blueprint description'}), 'Draft description');
		await user.click(screen.getByRole('button', {name: 'Edit icon 1'}));
		await user.type(screen.getByRole('searchbox', {name: 'Search'}), 'red');
		await chooseSignal(user, 'Signal red');
		await user.click(screen.getByRole('checkbox', {name: 'Modules'}));
		await user.click(screen.getByRole('checkbox', {name: 'Tiles'}));

		fireEvent.keyDown(screen.getByRole('dialog', {name: 'Blueprint Editor'}), {key: 'Escape'});
		const firstConfirmation = screen.getByRole('alertdialog', {name: 'Discard unsaved changes?'});
		expect({
			buttons: within(firstConfirmation)
				.getAllByRole('button')
				.map((button) => button.textContent),
			navigation: navigate.mock.calls,
		}).toStrictEqual({
			buttons: ['Keep editing', 'Discard changes', 'Save blueprint'],
			navigation: [],
		});

		await user.click(within(firstConfirmation).getByRole('button', {name: 'Keep editing'}));
		expect({
			confirmation: screen.queryByRole('alertdialog', {name: 'Discard unsaved changes?'}),
			description: screen.getByRole<HTMLTextAreaElement>('textbox', {name: 'Blueprint description'}).value,
			filters: ['Modules', 'Entities', 'Trains', 'Tiles'].map(
				(name) => screen.getByRole<HTMLInputElement>('checkbox', {name}).checked,
			),
			icon: screen.getByRole('button', {name: 'Edit icon 1'}).getAttribute('title'),
			title: screen.getByText('Bob', {selector: '.blueprint-editor__title'}).textContent,
		}).toStrictEqual({
			confirmation: null,
			description: 'Draft description',
			filters: [false, true, true, false],
			icon: 'Signal red\nvirtual:signal-red',
			title: 'Bob',
		});

		await user.click(screen.getByRole('button', {name: 'Close Blueprint Editor'}));
		const secondConfirmation = screen.getByRole('alertdialog', {name: 'Discard unsaved changes?'});
		await user.click(within(secondConfirmation).getByRole('button', {name: 'Discard changes'}));
		expect({
			dialog: screen.queryByRole('dialog', {name: 'Blueprint Editor'}),
			navigation: navigate.mock.calls,
		}).toStrictEqual({dialog: null, navigation: []});

		openBlueprintEditor();
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
		await user.click(screen.getByRole('button', {name: 'Parametrise or reconfigure the blueprint'}));
		await user.clear(screen.getByRole('textbox', {name: 'Parameter 1 name'}));
		await user.type(screen.getByRole('textbox', {name: 'Parameter 1 name'}), 'Any plate');
		await user.click(screen.getByRole('button', {name: 'Confirm'}));
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

	test('keeps export actions outside the planner and applies the visible mapping set', async () => {
		const user = userEvent.setup();
		render(<TransformPanel blueprint={blueprint} />);

		openUpgradePlanner();

		expect({
			applyActions: ['Apply upgrades', 'Apply downgrades'].map(
				(name) => screen.getByRole('button', {name}).textContent,
			),
			exportActions: ['Copy String', 'Copy JSON', 'Download String'].map((name) =>
				screen.queryByRole('button', {name}),
			),
		}).toStrictEqual({
			applyActions: ['Apply upgrades', 'Apply downgrades'],
			exportActions: [null, null, null],
		});

		await user.click(screen.getByRole('button', {name: 'Apply upgrades'}));
		expect(navigate).toHaveBeenCalledExactlyOnceWith({
			to: '/',
			search: {
				pasted: serializeBlueprint(applyUpgradeRules(blueprint, builtInUpgradeRules('upgrade'))),
				selection: '',
			},
		});
	});

	test('closes an untouched planner without changing the loaded blueprint', async () => {
		const user = userEvent.setup();
		render(<TransformPanel blueprint={blueprint} />);

		openUpgradePlanner();
		await user.click(screen.getByRole('button', {name: 'Cancel'}));

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
		await user.click(screen.getByRole('button', {name: 'Apply downgrades'}));

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

		await user.click(screen.getByRole('button', {name: 'Apply upgrades'}));

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

	test('adds a custom quality mapping with a source comparator and source-preserving target', async () => {
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
		await choosePlanner(user, 'Empty planner');
		await user.click(screen.getByRole('button', {name: /Add mapping/}));
		await user.click(screen.getByRole('button', {name: 'Rare quality'}));
		await user.selectOptions(screen.getByRole('combobox', {name: 'Quality comparison'}), '>');
		await chooseSignal(user, 'Transport belt');

		expect(screen.getByRole('button', {name: 'Set as source'}).getAttribute('aria-pressed')).toBe('true');
		await chooseSignal(user, 'Fast transport belt');

		expect({
			count: screen
				.getByRole('button', {name: 'Choose source, currently Transport belt'})
				.parentElement?.querySelector('strong')?.textContent,
			remove: screen.getByRole('button', {name: 'Remove mapping from Transport belt'}).textContent,
			source: screen.getByRole('button', {name: 'Choose source, currently Transport belt'}).title,
		}).toStrictEqual({
			count: '1',
			remove: '×',
			source: 'Transport belt\nentity:transport-belt\nQuality: > rare',
		});

		await user.click(screen.getByRole('button', {name: 'Apply upgrades'}));
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

	test('constrains a new mapping target immediately and keeps completed sources editable', async () => {
		const user = userEvent.setup();
		render(<TransformPanel blueprint={blueprint} />);

		openUpgradePlanner();
		await choosePlanner(user, 'Empty planner');
		await user.click(screen.getByRole('button', {name: '+ Add mapping'}));
		await chooseSignal(user, 'Transport belt');

		expect({
			assembler: screen.queryByRole('button', {name: 'Choose Assembling machine 1'}),
			fastBelt: screen.getByRole('button', {name: 'Choose Fast transport belt'}).getAttribute('aria-label'),
			sameBelt: screen.getByRole('button', {name: 'Choose Transport belt'}).getAttribute('aria-label'),
		}).toStrictEqual({assembler: null, fastBelt: 'Choose Fast transport belt', sameBelt: 'Choose Transport belt'});

		await chooseSignal(user, 'Fast transport belt');
		await user.click(screen.getByRole('button', {name: 'Choose source, currently Transport belt'}));

		expect(screen.getByRole('dialog', {name: 'Choose mapping source'}).getAttribute('aria-modal')).toBe('true');
	});

	test('adds, replaces, removes, and serializes label icons in slot order', async () => {
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

		openBlueprintEditor();
		await user.click(screen.getByRole('button', {name: 'Edit blueprint title'}));
		await user.clear(screen.getByRole('textbox', {name: 'Blueprint title'}));
		await user.type(screen.getByRole('textbox', {name: 'Blueprint title'}), 'Blue starter{Enter}');
		await user.clear(screen.getByRole('textbox', {name: 'Blueprint description'}));
		await user.type(screen.getByRole('textbox', {name: 'Blueprint description'}), 'New description');
		await user.click(screen.getByRole('button', {name: 'Edit icon 1'}));
		await user.type(screen.getByRole('searchbox', {name: 'Search'}), 'yellow');
		await chooseSignal(user, 'Signal yellow');
		fireEvent.contextMenu(screen.getByRole('button', {name: 'Edit icon 2'}));
		await user.click(screen.getByRole('button', {name: 'Choose icon 3'}));
		await user.type(screen.getByRole('searchbox', {name: 'Search'}), 'green');
		await chooseSignal(user, 'Signal green');
		await user.click(screen.getByRole('button', {name: 'Save blueprint'}));

		expect(navigate).toHaveBeenCalledExactlyOnceWith({
			to: '/',
			search: {
				pasted: serializeBlueprint({
					blueprint: {
						item: 'blueprint',
						version: 0,
						description: 'New description',
						icons: [
							{index: 1, signal: {type: 'virtual', name: 'signal-yellow'}},
							{index: 2, signal: {type: 'virtual', name: 'signal-blue'}},
							{index: 3, signal: {type: 'virtual', name: 'signal-green'}},
						],
						label: 'Blue starter',
					},
				}),
				selection: '',
			},
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

	test('saves a child blueprint back into its root book and protects dirty drafts', async () => {
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

		openBlueprintEditor();
		await user.click(screen.getByRole('button', {name: 'Edit blueprint title'}));
		await user.clear(screen.getByRole('textbox', {name: 'Blueprint title'}));
		await user.type(screen.getByRole('textbox', {name: 'Blueprint title'}), 'New label{Enter}');
		await user.click(screen.getByRole('button', {name: 'Choose icon 1'}));
		await user.type(screen.getByRole('searchbox', {name: 'Search'}), 'red');
		await chooseSignal(user, 'Signal red');
		await user.click(screen.getByRole('button', {name: 'Close Blueprint Editor'}));

		expect({
			confirmation: screen
				.getByRole('alertdialog', {name: 'Discard unsaved changes?'})
				.getAttribute('aria-modal'),
			navigation: navigate.mock.calls,
		}).toStrictEqual({confirmation: 'true', navigation: []});

		await user.click(screen.getByRole('button', {name: 'Keep editing'}));
		await user.click(screen.getByRole('button', {name: 'Save to book'}));

		expect(navigate).toHaveBeenCalledExactlyOnceWith({
			to: '/',
			search: {
				pasted: serializeBlueprint(savedRoot),
				selection: '1',
			},
		});

		const savedBlueprint = savedRoot.blueprint_book?.blueprints[0];
		rerender(<TransformPanel blueprint={savedBlueprint} rootBlueprint={savedRoot} selectedPath="1" />);
		openBlueprintEditor();
		expect({
			icon: screen.getByRole('button', {name: 'Edit icon 1'}).getAttribute('title'),
			saveDisabled: screen.getByRole<HTMLButtonElement>('button', {name: 'Save to book'}).disabled,
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
		await user.click(screen.getByRole('button', {name: 'Choose icon 1'}));
		const search = screen.getByRole<HTMLInputElement>('searchbox', {name: 'Search'});
		await user.type(search, 'q');
		expect({
			blueprintEditor: screen.getByRole('dialog', {name: 'Blueprint Editor'}).getAttribute('aria-modal'),
			picker: screen.getByRole('dialog', {name: 'Choose label icon 1'}).getAttribute('aria-modal'),
			search: search.value,
		}).toStrictEqual({blueprintEditor: 'true', picker: 'true', search: 'q'});

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
		const scope = screen.getByRole<HTMLSelectElement>('combobox', {name: 'Apply to'}).value;
		await user.click(screen.getByRole('button', {name: 'Apply upgrades'}));

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

	test('combines entity, visual icon, and text replacements across the root book', async () => {
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
		await user.click(screen.getByRole('button', {name: /Icon replacements/i}));
		await user.click(screen.getByRole('button', {name: 'Choose source icon'}));
		await chooseSignal(user, 'Signal red');
		await user.click(screen.getByRole('button', {name: 'Choose target icon'}));
		await user.type(screen.getByRole('searchbox', {name: 'Search'}), 'blue');
		await chooseSignal(user, 'Signal blue');
		await user.click(screen.getByRole('button', {name: 'Done'}));
		await user.type(screen.getByRole('textbox', {name: 'Find'}), 'red');
		await user.type(screen.getByRole('textbox', {name: 'Replace with'}), 'blue');

		expect({
			status: screen.getByLabelText('7 matches').getAttribute('aria-label'),
			textReplacement: screen.getByRole<HTMLInputElement>('checkbox', {name: 'Text replacement 3'}).checked,
		}).toStrictEqual({
			status: '7 matches',
			textReplacement: true,
		});

		await user.click(screen.getByRole('button', {name: 'Apply upgrades'}));

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
			scope: screen.getByRole<HTMLSelectElement>('combobox', {name: 'Apply to'}).value,
			status: screen.getByLabelText('1 match').getAttribute('aria-label'),
		}).toStrictEqual({scope: 'root', status: '1 match'});

		await user.click(screen.getByRole('button', {name: 'Apply upgrades'}));

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
		const user = userEvent.setup();
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
		historyBlueprints.push(
			storedPlanner('sha-100', bookPlanner, 'Duplicate book planner'),
			storedPlanner('sha-200', recentPlanner, "Bob's recent planner"),
		);
		render(<TransformPanel blueprint={selectedBlueprint} rootBlueprint={rootBlueprint} selectedPath="1" />);

		openUpgradePlanner();
		await user.click(screen.getByRole('button', {name: /Load planner, currently Default Upgrade/}));
		expect(
			within(screen.getByRole('grid', {name: 'Upgrade planners'}))
				.getAllByRole('button')
				.map((button) => button.getAttribute('aria-label')),
		).toStrictEqual([
			'Default Upgrade',
			"Alice's library planner",
			"Bob's recent planner",
			'Empty planner',
			'Paste upgrade planner…',
		]);

		await user.click(screen.getByRole('button', {name: 'Empty planner'}));
		await user.click(screen.getByRole('button', {name: '+ Add mapping'}));
		await chooseSignal(user, 'Transport belt');
		await chooseSignal(user, 'Express transport belt');
		expect(screen.getByRole('button', {name: 'Choose target for Transport belt'}).title).toBe(
			'Express transport belt\nentity:express-transport-belt',
		);

		await choosePlanner(user, "Alice's library planner");
		const bookSourceButtons = screen.getAllByRole('button', {name: /Choose source, currently/});
		expect({
			loadedSource: {
				icon: screen
					.getByRole('button', {name: /Load planner, currently Alice's library planner/})
					.querySelector('img')
					?.getAttribute('src'),
				label: screen.getByRole('button', {
					name: /Load planner, currently Alice's library planner/,
				}).textContent,
			},
			mappings: bookSourceButtons.map((sourceButton) => ({
				count: sourceButton.parentElement?.querySelector('strong')?.textContent,
				from: sourceButton.title,
				to: sourceButton.parentElement?.querySelector<HTMLButtonElement>('button[aria-label^="Choose target"]')
					?.title,
			})),
		}).toStrictEqual({
			loadedSource: {
				icon: 'https://factorio-icon-cdn.pages.dev/item/upgrade-planner.webp',
				label: "Alice's library planner",
			},
			mappings: [
				{
					count: '1',
					from: 'Transport belt\nentity:transport-belt',
					to: 'Fast transport belt\nentity:fast-transport-belt',
				},
				{
					count: '0',
					from: 'Speed module\nitem:speed-module',
					to: 'Speed module 2\nitem:speed-module-2',
				},
			],
		});

		await choosePlanner(user, "Bob's recent planner");
		expect(
			screen.getAllByRole('button', {name: /Choose source, currently/}).map((sourceButton) => ({
				count: sourceButton.parentElement?.querySelector('strong')?.textContent,
				from: sourceButton.title,
				to: sourceButton.parentElement?.querySelector<HTMLButtonElement>('button[aria-label^="Choose target"]')
					?.title,
			})),
		).toStrictEqual([
			{
				count: '1',
				from: 'Transport belt\nentity:transport-belt',
				to: 'Express transport belt\nentity:express-transport-belt',
			},
			{
				count: '0',
				from: 'Inserter\nentity:inserter',
				to: 'Fast inserter\nentity:fast-inserter',
			},
		]);

		await choosePlanner(user, 'Default Upgrade');
		expect({
			label: screen.getByRole('button', {name: /Load planner, currently Default Upgrade/}).textContent,
			target: screen.getByRole('button', {name: 'Choose target for Transport belt'}).title,
		}).toStrictEqual({
			label: 'Default Upgrade',
			target: 'Fast transport belt\nentity:fast-transport-belt',
		});

		await choosePlanner(user, 'Paste upgrade planner…');
		expect({
			label: screen.getByRole('button', {
				name: /Load planner, currently Paste upgrade planner/,
			}).textContent,
			pasteInput: screen.getByPlaceholderText('Paste an upgrade planner string or JSON').tagName,
		}).toStrictEqual({
			label: 'Paste upgrade planner…',
			pasteInput: 'TEXTAREA',
		});
	});

	test('accepts a pasted upgrade planner inside the planner dialog', async () => {
		const user = userEvent.setup();
		render(<TransformPanel blueprint={blueprint} />);

		openUpgradePlanner();
		await choosePlanner(user, 'Paste upgrade planner…');
		fireEvent.change(screen.getByPlaceholderText('Paste an upgrade planner string or JSON'), {
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
									to: {type: 'entity', name: 'express-transport-belt'},
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
		}).toStrictEqual({
			emptyMessage: null,
			unmatchedSource: 'Speed module\nitem:speed-module',
			unmatchedTarget: 'Speed module 2\nitem:speed-module-2',
		});

		await user.click(screen.getByRole('button', {name: 'Apply upgrades'}));

		expect(navigate).toHaveBeenCalledExactlyOnceWith({
			to: '/',
			search: {
				pasted: serializeBlueprint({
					blueprint: {
						item: 'blueprint',
						version: 0,
						entities: [{entity_number: 1, name: 'express-transport-belt', position: {x: 0, y: 0}}],
					},
				}),
				selection: '',
			},
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
