import {fireEvent, render, screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {beforeEach, describe, expect, test, vi} from 'vite-plus/test';

import {TransformPanel} from '../../src/components/blueprint/panels/transform/TransformPanel';
import {serializeBlueprint} from '../../src/parsing/blueprintParser';
import type {BlueprintString} from '../../src/parsing/types';
import {stripTiles, stripTrains} from '../../src/transform/strip';
import {applyUpgradeRules, builtInUpgradeRules} from '../../src/transform/upgradePlanner';

const {navigate} = vi.hoisted(() => ({
	navigate: vi.fn<(options: unknown) => void>(),
}));

vi.mock('dexie-react-hooks', () => ({
	useLiveQuery: () => [],
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

describe('TransformPanel', () => {
	beforeEach(() => {
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
		expect({
			changeIn: screen.queryByRole('group', {name: 'Change in'}),
			dialog: screen.getByRole('dialog', {name: 'Upgrade Planner'}).getAttribute('aria-modal'),
			exportActions: ['Copy String', 'Copy JSON', 'Download String', 'Open in Playground'].map((name) =>
				screen.queryByRole('button', {name}),
			),
			liveResult: screen.queryByText('Live result'),
			operationButtons: ['Apply upgrades', 'Apply downgrades'].map(
				(name) => screen.getByRole('button', {name}).textContent,
			),
			stripQuality: screen.queryByRole('button', {name: 'Strip quality'}),
			preserveCapitalization: screen.queryByRole('checkbox', {name: 'Preserve capitalization'}),
			sourceIcon: screen
				.getByRole('button', {name: 'Choose source, currently Transport belt'})
				.querySelector('img')
				?.getAttribute('src'),
			targetIcon: screen
				.getByRole('button', {name: 'Choose target for Transport belt'})
				.querySelector('img')
				?.getAttribute('src'),
			bookWideReplacements: screen.getByRole('heading', {name: 'Book-wide replacements'}).textContent,
		}).toStrictEqual({
			changeIn: null,
			dialog: 'true',
			exportActions: [null, null, null, null],
			liveResult: null,
			operationButtons: ['Apply upgrades', 'Apply downgrades'],
			stripQuality: null,
			preserveCapitalization: null,
			sourceIcon: 'https://factorio-icon-cdn.pages.dev/entity/transport-belt.webp',
			targetIcon: 'https://factorio-icon-cdn.pages.dev/entity/fast-transport-belt.webp',
			bookWideReplacements: 'Book-wide replacements',
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
			toolbarActions: ['Upgrade items and entities in the blueprint'],
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

		await user.click(screen.getByRole('button', {name: 'Default Upgrade'}));
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
		await user.click(screen.getByRole('button', {name: 'Choose Signal red'}));
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
		await user.click(screen.getByRole('button', {name: 'Choose Fast transport belt'}));

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
		await user.click(screen.getByRole('button', {name: 'Choose Transport belt'}));

		expect(screen.getByRole('button', {name: 'Set as source'}).getAttribute('aria-pressed')).toBe('true');
		await user.click(screen.getByRole('button', {name: 'Choose Fast transport belt'}));

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
		await user.click(screen.getByRole('button', {name: 'Choose Transport belt'}));

		expect({
			assembler: screen.queryByRole('button', {name: 'Choose Assembling machine 1'}),
			fastBelt: screen.getByRole('button', {name: 'Choose Fast transport belt'}).getAttribute('aria-label'),
			sameBelt: screen.getByRole('button', {name: 'Choose Transport belt'}).getAttribute('aria-label'),
		}).toStrictEqual({assembler: null, fastBelt: 'Choose Fast transport belt', sameBelt: 'Choose Transport belt'});

		await user.click(screen.getByRole('button', {name: 'Choose Fast transport belt'}));
		await user.click(screen.getByRole('button', {name: 'Choose source, currently Transport belt'}));

		expect(screen.getByRole('dialog', {name: 'Choose mapping source'}).getAttribute('aria-modal')).toBe('true');
	});

	test('edits blueprint metadata and label icons one by one', async () => {
		const user = userEvent.setup();
		const iconBlueprint: BlueprintString = {
			blueprint: {
				item: 'blueprint',
				label: 'Red starter',
				description: 'Old description',
				version: 0,
				icons: [
					{index: 1, signal: {type: 'virtual', name: 'signal-red'}},
					{index: 2, signal: {type: 'virtual', name: 'signal-green'}},
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
		await user.type(screen.getByRole('searchbox', {name: 'Search'}), 'blue');
		await user.click(screen.getByRole('button', {name: 'Choose Signal blue'}));
		fireEvent.contextMenu(screen.getByRole('button', {name: 'Edit icon 2'}));
		await user.click(screen.getByRole('button', {name: 'Save blueprint'}));

		expect(navigate).toHaveBeenCalledExactlyOnceWith({
			to: '/',
			search: {
				pasted: serializeBlueprint({
					blueprint: {
						item: 'blueprint',
						version: 0,
						description: 'New description',
						icons: [{index: 1, signal: {type: 'virtual', name: 'signal-blue'}}],
						label: 'Blue starter',
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
					{index: 200, blueprint: {item: 'blueprint', label: 'Unchanged', version: 0}},
				],
			},
		};
		const selectedBlueprint = rootBlueprint.blueprint_book?.blueprints[0];
		render(<TransformPanel blueprint={selectedBlueprint} rootBlueprint={rootBlueprint} selectedPath="1" />);

		openBlueprintEditor();
		await user.click(screen.getByRole('button', {name: 'Edit blueprint title'}));
		await user.clear(screen.getByRole('textbox', {name: 'Blueprint title'}));
		await user.type(screen.getByRole('textbox', {name: 'Blueprint title'}), 'New label{Enter}');
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
				pasted: serializeBlueprint({
					blueprint_book: {
						item: 'blueprint-book',
						label: "Alice's test book",
						version: 0,
						blueprints: [
							{index: 100, blueprint: {item: 'blueprint', version: 0, label: 'New label'}},
							{index: 200, blueprint: {item: 'blueprint', label: 'Unchanged', version: 0}},
						],
					},
				}),
				selection: '1',
			},
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
		await user.click(screen.getByRole('button', {name: 'Choose Signal red'}));
		await user.click(screen.getByRole('button', {name: 'Choose target icon'}));
		await user.type(screen.getByRole('searchbox', {name: 'Search'}), 'blue');
		await user.click(screen.getByRole('button', {name: 'Choose Signal blue'}));
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
