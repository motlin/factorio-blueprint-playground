import {render, screen, waitFor} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {describe, expect, test, vi} from 'vite-plus/test';

import {LintPanel} from '../../src/components/blueprint/panels/lint/LintPanel';
import type {BlueprintString} from '../../src/parsing/types';

const VERSION_2_0 = 562949958139904;

describe('LintPanel', () => {
	test('renders sorted findings with severity, icon, message, and position', async () => {
		const blueprint: BlueprintString = {
			blueprint: {
				item: 'blueprint',
				version: VERSION_2_0,
				entities: [
					{entity_number: 200, name: 'inserter', position: {x: 10.5, y: 0.5}, direction: 4},
					{entity_number: 100, name: 'fast-inserter', position: {x: 0.5, y: 0.5}, direction: 4},
					// Corner chests keep the inserters' targets inside the blueprint.
					{entity_number: 998, name: 'wooden-chest', position: {x: -50.5, y: -50.5}},
					{entity_number: 999, name: 'wooden-chest', position: {x: 50.5, y: 50.5}},
				],
			},
		};

		render(<LintPanel blueprint={blueprint} />);
		await screen.findByTestId('lint-count');

		expect({
			title: screen.getByRole('heading', {name: 'Lint'}).textContent,
			badges: screen.getAllByTestId('lint-count').map((element) => element.textContent),
			rows: screen.getAllByRole('listitem').map((element) => element.textContent),
			icons: screen.getAllByRole('img').map((element) => element.getAttribute('alt')),
		}).toStrictEqual({
			title: 'Lint',
			badges: ['2 warnings'],
			rows: [
				'●Inserter "fast-inserter" at (0.5, 0.5) has no pickup or drop target.(0.5, 0.5)',
				'●Inserter "inserter" at (10.5, 0.5) has no pickup or drop target.(10.5, 0.5)',
			],
			icons: ['fast-inserter', 'inserter'],
		});
	});

	test('renders an informational finding for an empty blueprint', async () => {
		const blueprint: BlueprintString = {
			blueprint: {item: 'blueprint', version: VERSION_2_0},
		};

		render(<LintPanel blueprint={blueprint} />);

		expect({
			badge: (await screen.findByTestId('lint-count')).textContent,
			row: screen.getByRole('listitem').textContent,
		}).toStrictEqual({
			badge: '1 info',
			row: '●Blueprint contains no entities or tiles.',
		});
	});

	test('renders nothing for valid blueprints and planner types', async () => {
		const validBlueprint: BlueprintString = {
			blueprint: {
				item: 'blueprint',
				version: VERSION_2_0,
				entities: [{entity_number: 100, name: 'alice-modded-entity', position: {x: 0, y: 0}}],
			},
		};
		const planner: BlueprintString = {
			deconstruction_planner: {
				item: 'deconstruction-planner',
				version: VERSION_2_0,
				settings: {},
			},
		};

		const validRender = render(<LintPanel blueprint={validBlueprint} />);
		const plannerRender = render(<LintPanel blueprint={planner} />);

		await waitFor(() => {
			expect([validRender.container.innerHTML, plannerRender.container.innerHTML]).toStrictEqual(['', '']);
		});
	});

	test('lists only the first 100 findings and says how many there are in total', async () => {
		const blueprint: BlueprintString = {
			blueprint: {
				item: 'blueprint',
				version: VERSION_2_0,
				entities: Array.from({length: 250}, (_, index) => ({
					entity_number: index + 1,
					name: 'inserter',
					position: {x: index * 20 + 0.5, y: 0.5},
					direction: 4,
				})),
			},
		};

		render(<LintPanel blueprint={blueprint} />);
		await screen.findByTestId('lint-truncated');

		expect({
			badges: screen.getAllByTestId('lint-count').map((element) => element.textContent),
			rows: screen.getAllByRole('listitem').length,
			truncation: screen.getByTestId('lint-truncated').textContent,
		}).toStrictEqual({
			badges: ['250 warnings'],
			rows: 100,
			truncation: 'Showing the first 100 of 250 findings.',
		});
	});

	test('shows that the blueprint is being checked until the findings arrive', async () => {
		const blueprint: BlueprintString = {
			blueprint: {item: 'blueprint', version: VERSION_2_0},
		};

		render(<LintPanel blueprint={blueprint} />);
		const whileChecking = screen.getByTestId('lint-checking').textContent;
		await screen.findByTestId('lint-count');

		expect({whileChecking, afterwards: screen.queryByTestId('lint-checking')}).toStrictEqual({
			whileChecking: 'Checking blueprint for problems…',
			afterwards: null,
		});
	});

	test('lists findings from every blueprint in a selected book under links that select each blueprint', async () => {
		const book: BlueprintString = {
			blueprint_book: {
				item: 'blueprint-book',
				version: VERSION_2_0,
				blueprints: [
					{
						index: 0,
						blueprint: {
							item: 'blueprint',
							label: '[color=green]Inserters[/color]',
							version: VERSION_2_0,
							entities: [
								{entity_number: 1, name: 'inserter', position: {x: 0.5, y: 0.5}, direction: 4},
								{entity_number: 2, name: 'wooden-chest', position: {x: -50.5, y: -50.5}},
								{entity_number: 3, name: 'wooden-chest', position: {x: 50.5, y: 50.5}},
							],
						},
					},
					{
						index: 1,
						blueprint_book: {
							item: 'blueprint-book',
							version: VERSION_2_0,
							blueprints: [
								{index: 0, blueprint: {item: 'blueprint', label: 'Empty', version: VERSION_2_0}},
							],
						},
					},
				],
			},
		};
		const onSelect = vi.fn<(path: string) => void>();

		render(<LintPanel blueprint={book} selectedPath="3" onSelect={onSelect} />);
		const links = await screen.findAllByRole('button', {name: /^Select blueprint/});
		await userEvent.click(links[1]);

		expect({
			links: links.map((link) => link.textContent),
			rows: screen.getAllByRole('listitem').map((row) => row.textContent),
			selected: onSelect.mock.calls,
		}).toStrictEqual({
			links: ['3.1 Inserters', '3.2.1 Empty'],
			rows: [
				'●Inserter "inserter" at (0.5, 0.5) has no pickup or drop target.(0.5, 0.5)',
				'●Blueprint contains no entities or tiles.',
			],
			selected: [['3.2.1']],
		});
	});

	test('shows good practices with a check mark and their own count', async () => {
		const blueprint: BlueprintString = {
			blueprint: {
				item: 'blueprint',
				version: VERSION_2_0,
				entities: [
					{
						entity_number: 1,
						name: 'constant-combinator',
						position: {x: 0.5, y: 0.5},
						control_behavior: {
							sections: {sections: [{index: 1, filters: [{index: 1, name: 'lubricant', count: 1}]}]},
						},
					},
				],
			},
		};

		render(<LintPanel blueprint={blueprint} />);

		expect({
			badges: (await screen.findAllByTestId('lint-count')).map((element) => element.textContent),
			rows: screen.getAllByRole('listitem').map((row) => row.textContent),
		}).toStrictEqual({
			badges: ['1 good'],
			rows: ['✓Labels its inputs and outputs: lubricant.(0.5, 0.5)'],
		});
	});
});
