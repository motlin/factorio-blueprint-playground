import {fireEvent, render, screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {beforeEach, describe, expect, test, vi} from 'vite-plus/test';

import {TransformPanel} from '../../src/components/blueprint/panels/transform/TransformPanel';
import {serializeBlueprint} from '../../src/parsing/blueprintParser';
import type {BlueprintString} from '../../src/parsing/types';
import {stripTiles, stripTrains} from '../../src/transform/strip';
import {applyUpgradeRules, builtInUpgradeRules} from '../../src/transform/upgradePlanner';

const {navigate} = vi.hoisted(() => ({navigate: vi.fn<(options: unknown) => void>()}));

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

	test('presents staged transform operations with one apply action', async () => {
		const user = userEvent.setup();
		render(<TransformPanel blueprint={blueprint} />);

		expect({
			applyButtons: screen.getAllByRole('button', {name: 'Apply changes'}).map((button) => button.textContent),
			changeIn: ['Entities 1', 'Tiles 0', 'Icons 0', 'Text 0'].map((name) => {
				const checkbox = screen.getByRole<HTMLInputElement>('checkbox', {name});
				return {checked: checkbox.checked, disabled: checkbox.disabled, name};
			}),
			iconSummary: screen
				.getByRole('button', {name: /Icon Replacements/})
				.textContent.replaceAll(/\s+/g, ' ')
				.trim(),
			preserveCapitalization: screen.queryByRole('checkbox', {name: 'Preserve capitalization'}),
			upgradeSummary: screen
				.getByRole('button', {name: /Upgrade Planner/})
				.textContent.replaceAll(/\s+/g, ' ')
				.trim(),
		}).toStrictEqual({
			applyButtons: ['Apply changes'],
			changeIn: [
				{checked: true, disabled: true, name: 'Entities 1'},
				{checked: true, disabled: true, name: 'Tiles 0'},
				{checked: true, disabled: true, name: 'Icons 0'},
				{checked: true, disabled: false, name: 'Text 0'},
			],
			iconSummary: '+Icon Replacements0 mappings · 0 replacementsEdit…',
			preserveCapitalization: null,
			upgradeSummary: 'Upgrade Planner1 mapping · 1 replacementEdit…',
		});

		await user.click(screen.getByRole('button', {name: /Upgrade Planner/}));
		expect({
			dialog: screen.getByRole('dialog', {name: 'Upgrade Planner'}).getAttribute('aria-modal'),
			mappingChecked: screen.getByRole<HTMLInputElement>('checkbox', {
				name: 'Replace transport-belt with fast-transport-belt',
			}).checked,
			sourceIcon: screen
				.getByRole('button', {name: 'Source Transport belt'})
				.querySelector('img')
				?.getAttribute('src'),
			targetIcon: screen
				.getByRole('button', {name: 'Choose target for Transport belt'})
				.querySelector('img')
				?.getAttribute('src'),
		}).toStrictEqual({
			dialog: 'true',
			mappingChecked: true,
			sourceIcon: 'https://factorio-icon-cdn.pages.dev/entity/transport-belt.webp',
			targetIcon: 'https://factorio-icon-cdn.pages.dev/entity/fast-transport-belt.webp',
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

		await user.click(screen.getByRole('button', {name: /Icon Replacements/}));
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

	test('stages and applies book operations through the shared action', async () => {
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

		await user.click(screen.getByText('Book operations'));
		await user.click(screen.getByRole('checkbox', {name: 'Sort entries by label'}));
		await user.click(screen.getByRole('button', {name: 'Apply changes'}));
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

	test('renders reusable export actions after applying changes', async () => {
		const user = userEvent.setup();
		render(<TransformPanel blueprint={blueprint} />);

		await user.click(screen.getByRole('button', {name: 'Apply changes'}));

		expect(screen.getAllByRole('button').map((button) => button.textContent.trim())).toStrictEqual([
			'Upgrade Planner1 mapping · 1 replacementEdit…',
			'+Icon Replacements0 mappings · 0 replacementsEdit…',
			'Apply changes',
			'Copy String',
			'Copy JSON',
			'Download String',
			'Open in Playground',
		]);
		expect(screen.getByRole('heading', {name: 'Export Transformed Blueprint'}).textContent).toBe(
			'Export Transformed Blueprint',
		);
	});

	test('opens the serialized result in the playground', async () => {
		const user = userEvent.setup();
		render(<TransformPanel blueprint={blueprint} />);

		await user.click(screen.getByRole('button', {name: 'Apply changes'}));
		await user.click(screen.getByRole('button', {name: 'Open in Playground'}));

		expect(navigate).toHaveBeenCalledExactlyOnceWith({
			to: '/',
			search: {
				pasted: serializeBlueprint(applyUpgradeRules(blueprint, builtInUpgradeRules('upgrade'))),
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

		await user.click(screen.getByRole('button', {name: 'Apply changes'}));
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

		await user.selectOptions(screen.getByRole('combobox', {name: 'Apply to'}), 'root');
		await user.click(screen.getByRole('button', {name: /Icon Replacements/}));
		await user.click(screen.getByRole('button', {name: 'Choose source icon'}));
		await user.click(screen.getByRole('button', {name: 'Choose Signal red'}));
		await user.click(screen.getByRole('button', {name: 'Choose target icon'}));
		await user.type(screen.getByRole('searchbox', {name: 'Search'}), 'blue');
		await user.click(screen.getByRole('button', {name: 'Choose Signal blue'}));
		await user.click(screen.getByRole('button', {name: 'Done'}));
		await user.type(screen.getByRole('textbox', {name: 'Find'}), 'red');
		await user.type(screen.getByRole('textbox', {name: 'Replace with'}), 'blue');

		expect({
			entityFilter: screen.getByRole<HTMLInputElement>('checkbox', {name: 'Entities 1'}).checked,
			iconFilter: screen.getByRole<HTMLInputElement>('checkbox', {name: 'Icons 2'}).checked,
			summary: screen.getByText('6 replacements').textContent,
			textFilter: screen.getByRole<HTMLInputElement>('checkbox', {name: 'Text 3'}).checked,
		}).toStrictEqual({entityFilter: true, iconFilter: true, summary: '6 replacements', textFilter: true});

		await user.click(screen.getByRole('button', {name: 'Apply changes'}));
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

		expect({
			scope: screen.getByRole<HTMLSelectElement>('combobox', {name: 'Apply to'}).value,
			summary: screen
				.getByRole('button', {name: /Upgrade Planner/})
				.textContent.replaceAll(/\s+/g, ' ')
				.trim(),
		}).toStrictEqual({scope: 'root', summary: 'Upgrade Planner1 mapping · 1 replacementEdit…'});

		await user.click(screen.getByRole('button', {name: 'Apply changes'}));
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

		await user.click(screen.getByRole('button', {name: /Upgrade Planner/}));
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

		await user.click(screen.getByRole('button', {name: 'Done'}));
		await user.click(screen.getByRole('button', {name: 'Apply changes'}));
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

	test('applies selected cleanup transforms through the shared action', async () => {
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

		await user.click(screen.getByText('Cleanup'));
		await user.click(screen.getByRole('checkbox', {name: 'Strip trains'}));
		await user.click(screen.getByRole('checkbox', {name: 'Strip tiles'}));
		await user.click(screen.getByRole('button', {name: 'Apply changes'}));
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
