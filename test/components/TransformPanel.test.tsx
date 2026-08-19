import {fireEvent, render, screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {beforeEach, describe, expect, test, vi} from 'vite-plus/test';

import {TransformPanel} from '../../src/components/blueprint/panels/transform/TransformPanel';
import {serializeBlueprint} from '../../src/parsing/blueprintParser';
import type {BlueprintString} from '../../src/parsing/types';
import {stripTiles, stripTrains} from '../../src/transform/strip';
import {applyUpgradeRules, builtInUpgradeRules} from '../../src/transform/upgradePlanner';

const {navigate, writeText} = vi.hoisted(() => ({
	navigate: vi.fn<(options: unknown) => void>(),
	writeText: vi.fn<(text: string) => Promise<void>>(),
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

describe('TransformPanel', () => {
	beforeEach(() => {
		navigate.mockReset();
		writeText.mockReset().mockResolvedValue();
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
			toolExpanded: screen.getByRole('button', {name: 'Open Upgrade Planner'}).getAttribute('aria-expanded'),
		}).toStrictEqual({applyButton: null, blueprintEditorExpanded: 'false', dialog: null, toolExpanded: 'false'});

		openUpgradePlanner();
		expect({
			changeIn: screen.queryByRole('group', {name: 'Change in'}),
			dialog: screen.getByRole('dialog', {name: 'Upgrade Planner'}).getAttribute('aria-modal'),
			exportActions: ['Copy String', 'Copy JSON', 'Download String', 'Open in Playground'].map((name) =>
				screen.getByRole('button', {name}).textContent.trim(),
			),
			liveResult: screen.queryByText('Live result'),
			mappingChecked: screen.getByRole<HTMLInputElement>('checkbox', {
				name: 'Replace transport-belt with fast-transport-belt',
			}).checked,
			operations: ['Upgrade', 'Downgrade', 'Strip quality'].map((name) =>
				screen.getByRole('button', {name}).getAttribute('aria-pressed'),
			),
			preserveCapitalization: screen.queryByRole('checkbox', {name: 'Preserve capitalization'}),
			sourceIcon: screen
				.getByRole('button', {name: 'Source Transport belt'})
				.querySelector('img')
				?.getAttribute('src'),
			targetIcon: screen
				.getByRole('button', {name: 'Choose target for Transport belt'})
				.querySelector('img')
				?.getAttribute('src'),
			websiteReplacements: screen.queryByRole('heading', {name: 'Website replacements'}),
		}).toStrictEqual({
			changeIn: null,
			dialog: 'true',
			exportActions: ['Copy String', 'Copy JSON', 'Download String', 'Open in Playground'],
			liveResult: null,
			mappingChecked: true,
			operations: ['true', 'false', 'false'],
			preserveCapitalization: null,
			sourceIcon: 'https://factorio-icon-cdn.pages.dev/entity/transport-belt.webp',
			targetIcon: 'https://factorio-icon-cdn.pages.dev/entity/fast-transport-belt.webp',
			websiteReplacements: null,
		});
	});

	test('keeps blueprint editing in its own popup', () => {
		render(<TransformPanel blueprint={blueprint} />);

		openBlueprintEditor();
		const textReplacement = screen.getByRole<HTMLInputElement>('checkbox', {name: 'Text replacement 0'});
		expect({
			cleanup: screen.getByRole('heading', {name: 'Cleanup'}).textContent,
			dialog: screen.getByRole('dialog', {name: 'Blueprint Editor'}).getAttribute('aria-modal'),
			plannerMappings: screen.queryByRole('group', {name: 'Planner operation'}),
			textReplacement: {checked: textReplacement.checked, disabled: textReplacement.disabled},
			websiteReplacements: screen.getByRole('heading', {name: 'Website replacements'}).textContent,
		}).toStrictEqual({
			cleanup: 'Cleanup',
			dialog: 'true',
			plannerMappings: null,
			textReplacement: {checked: true, disabled: false},
			websiteReplacements: 'Website replacements',
		});
	});

	test('does not apply upgrade suggestions when only the blueprint editor is opened', async () => {
		const user = userEvent.setup();
		Object.defineProperty(navigator, 'clipboard', {configurable: true, value: {writeText}});
		render(<TransformPanel blueprint={blueprint} />);

		openBlueprintEditor();
		await user.click(screen.getByRole('button', {name: 'Copy JSON'}));

		expect(writeText).toHaveBeenCalledExactlyOnceWith(JSON.stringify(blueprint, null, 2));
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

		openBlueprintEditor();
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
		await user.click(screen.getByRole('button', {name: 'Open in Playground'}));

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

	test('exports the live result without an apply step', async () => {
		const user = userEvent.setup();
		Object.defineProperty(navigator, 'clipboard', {configurable: true, value: {writeText}});
		render(<TransformPanel blueprint={blueprint} />);

		openUpgradePlanner();

		expect({
			applyButton: screen.queryByRole('button', {name: 'Apply changes'}),
			actions: ['Copy String', 'Copy JSON', 'Download String', 'Open in Playground'].map((name) =>
				screen.getByRole('button', {name}).textContent.trim(),
			),
			liveResult: screen.queryByText('Live result'),
		}).toStrictEqual({
			applyButton: null,
			actions: ['Copy String', 'Copy JSON', 'Download String', 'Open in Playground'],
			liveResult: null,
		});

		await user.click(screen.getByRole('button', {name: 'Copy JSON'}));
		expect(writeText).toHaveBeenCalledExactlyOnceWith(
			JSON.stringify(applyUpgradeRules(blueprint, builtInUpgradeRules('upgrade')), null, 2),
		);
	});

	test('opens the serialized result in the playground', async () => {
		const user = userEvent.setup();
		render(<TransformPanel blueprint={blueprint} />);

		openUpgradePlanner();
		await user.click(screen.getByRole('button', {name: 'Open in Playground'}));

		expect(navigate).toHaveBeenCalledExactlyOnceWith({
			to: '/',
			search: {
				pasted: serializeBlueprint(applyUpgradeRules(blueprint, builtInUpgradeRules('upgrade'))),
				selection: '',
			},
		});
	});

	test('downgrades entities and strips quality as planner operations', async () => {
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
		await user.click(screen.getByRole('button', {name: 'Downgrade'}));
		await user.click(screen.getByRole('button', {name: 'Strip quality'}));

		expect({
			downgrade: screen.getByRole('button', {name: 'Downgrade'}).getAttribute('aria-pressed'),
			stripQuality: screen.getByRole('button', {name: 'Strip quality'}).getAttribute('aria-pressed'),
			target: screen.getByRole('button', {name: 'Choose target for Fast transport belt'}).title,
		}).toStrictEqual({downgrade: 'true', stripQuality: 'true', target: 'Transport belt\nentity:transport-belt'});

		await user.click(screen.getByRole('button', {name: 'Open in Playground'}));

		expect(navigate).toHaveBeenCalledExactlyOnceWith({
			to: '/',
			search: {
				pasted: serializeBlueprint({
					blueprint: {
						item: 'blueprint',
						version: 0,
						entities: [{entity_number: 1, name: 'transport-belt', position: {x: 0, y: 0}}],
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

		await user.click(screen.getByRole('button', {name: 'Open in Playground'}));

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
		await user.click(screen.getByRole('button', {name: 'Open in Playground'}));

		expect({
			navigation: navigate.mock.calls,
			scope: screen.getByRole<HTMLSelectElement>('combobox', {name: 'Apply to'}).value,
		}).toStrictEqual({
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
		await user.click(screen.getByRole('button', {name: 'Close Upgrade Planner'}));
		openBlueprintEditor();
		await user.selectOptions(screen.getByRole('combobox', {name: 'Apply to'}), 'root');
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
			status: screen.getByLabelText('5 replacements ready').getAttribute('aria-label'),
			textReplacement: screen.getByRole<HTMLInputElement>('checkbox', {name: 'Text replacement 3'}).checked,
		}).toStrictEqual({
			status: '5 replacements ready',
			textReplacement: true,
		});

		await user.click(screen.getByRole('button', {name: 'Open in Playground'}));

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
			status: screen.getByLabelText('1 replacement ready').getAttribute('aria-label'),
		}).toStrictEqual({scope: 'root', status: '1 replacement ready'});

		await user.click(screen.getByRole('button', {name: 'Open in Playground'}));

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
		await user.selectOptions(screen.getByRole('combobox', {name: 'Planner'}), 'pasted');
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
			unmatchedSource: screen.getByRole('button', {name: 'Source Speed module'}).title,
			unmatchedTarget: screen.getByRole('button', {name: 'Choose target for Speed module'}).title,
		}).toStrictEqual({
			emptyMessage: null,
			unmatchedSource: 'Speed module\nitem:speed-module',
			unmatchedTarget: 'Speed module 2\nitem:speed-module-2',
		});

		await user.click(screen.getByRole('button', {name: 'Open in Playground'}));

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

	test('applies selected cleanup transforms to the live result', async () => {
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
		await user.click(screen.getByRole('checkbox', {name: 'Strip trains'}));
		await user.click(screen.getByRole('checkbox', {name: 'Strip tiles'}));
		await user.click(screen.getByRole('button', {name: 'Open in Playground'}));

		expect(navigate).toHaveBeenCalledExactlyOnceWith({
			to: '/',
			search: {
				pasted: serializeBlueprint(stripTiles(stripTrains(stripBlueprint))),
				selection: '',
			},
		});
	});
});
