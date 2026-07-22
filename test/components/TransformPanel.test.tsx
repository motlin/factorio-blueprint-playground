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
			iconSummary: screen
				.getByRole('button', {name: /Icon Replacements/})
				.textContent.replaceAll(/\s+/g, ' ')
				.trim(),
			upgradeSummary: screen
				.getByRole('button', {name: /Upgrade Planner/})
				.textContent.replaceAll(/\s+/g, ' ')
				.trim(),
		}).toStrictEqual({
			applyButtons: ['Apply changes'],
			iconSummary: '+Icon Replacements0 mappings · 0 replacementsEdit…',
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
		await user.click(screen.getByRole('button', {name: 'Choose target icon'}));
		await user.type(screen.getByRole('searchbox', {name: 'Search'}), 'blue');
		await user.click(screen.getByRole('button', {name: 'Choose Signal blue'}));
		await user.click(screen.getByRole('button', {name: 'Add replacement'}));
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
