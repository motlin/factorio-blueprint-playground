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

	test('offers detected replacement suggestions for blueprints and book operations for books', () => {
		const {rerender} = render(<TransformPanel blueprint={blueprint} />);
		expect({
			buttons: screen.getAllByRole('button').map((button) => button.textContent),
			mappingChecked: screen.getByRole<HTMLInputElement>('checkbox', {
				name: 'Replace transport-belt with fast-transport-belt',
			}).checked,
			sources: screen.getByRole('combobox', {name: 'Replacement source'}).textContent,
		}).toStrictEqual({
			buttons: ['Apply 1 replacement', 'Apply Strips'],
			mappingChecked: true,
			sources:
				'Suggested upgrades — base gameSuggested upgrades — include Space AgeSuggested downgradesPasted upgrade planner',
		});

		rerender(<TransformPanel blueprint={{blueprint_book: {item: 'blueprint-book', version: 0, blueprints: []}}} />);
		expect(screen.getAllByRole('button').map((button) => button.textContent)).toStrictEqual([
			'Apply 0 replacements',
			'Apply Strips',
			'Flatten Book',
			'Sort Book by Label',
		]);
	});

	test('offers and applies book operations only for books', async () => {
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

		await user.click(screen.getByRole('button', {name: 'Sort Book by Label'}));
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

	test('renders reusable export actions after applying a transformation', async () => {
		const user = userEvent.setup();
		render(<TransformPanel blueprint={blueprint} />);

		await user.click(screen.getByRole('button', {name: 'Apply 1 replacement'}));

		expect(screen.getAllByRole('button').map((button) => button.textContent.trim())).toStrictEqual([
			'Apply 1 replacement',
			'Apply Strips',
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

		await user.click(screen.getByRole('button', {name: 'Apply 1 replacement'}));
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

		await user.click(screen.getByRole('button', {name: 'Apply 1 replacement'}));
		await user.click(screen.getByRole('button', {name: 'Open in Playground'}));

		expect(screen.getByRole<HTMLSelectElement>('combobox', {name: 'Apply to'}).value).toBe('selection');
		expect(navigate).toHaveBeenCalledExactlyOnceWith({
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
		});
	});

	test('applies an upgrade planner selected from the book to the entire root book', async () => {
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
			source: screen.getByRole<HTMLSelectElement>('combobox', {name: 'Replacement source'}).value,
			scope: screen.getByRole<HTMLSelectElement>('combobox', {name: 'Apply to'}).value,
			buttons: screen.getAllByRole('button').map((button) => button.textContent),
		}).toStrictEqual({source: 'book:2', scope: 'root', buttons: ['Apply 1 replacement']});

		await user.click(screen.getByRole('button', {name: 'Apply 1 replacement'}));
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

	test('accepts a pasted upgrade planner and shows its detected mapping before applying it', async () => {
		const user = userEvent.setup();
		render(<TransformPanel blueprint={blueprint} />);

		await user.selectOptions(screen.getByRole('combobox', {name: 'Replacement source'}), 'pasted');
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
			screen.getByRole('checkbox', {name: 'Replace transport-belt with express-transport-belt'}).parentElement
				?.textContent,
		).toBe('transport-belt→express-transport-belt1');
		await user.click(screen.getByRole('button', {name: 'Apply 1 replacement'}));
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

	test('applies selected strip transforms in one result', async () => {
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

		await user.click(screen.getByRole('checkbox', {name: 'Strip trains'}));
		await user.click(screen.getByRole('checkbox', {name: 'Strip tiles'}));
		await user.click(screen.getByRole('button', {name: 'Apply Strips'}));
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
