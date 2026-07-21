import {render, screen} from '@testing-library/react';
import {describe, expect, test} from 'vite-plus/test';

import {LintPanel} from '../../src/components/blueprint/panels/lint/LintPanel';
import type {BlueprintString} from '../../src/parsing/types';

const VERSION_2_0 = 562949958139904;

describe('LintPanel', () => {
	test('renders sorted findings with severity, icon, message, and position', () => {
		const blueprint: BlueprintString = {
			blueprint: {
				item: 'blueprint',
				version: VERSION_2_0,
				entities: [
					{
						entity_number: 200,
						name: 'underground-belt',
						position: {x: 10, y: 0},
						direction: 4,
						type: 'output',
					},
					{
						entity_number: 100,
						name: 'underground-belt',
						position: {x: 0, y: 0},
						direction: 4,
						type: 'input',
					},
				],
			},
		};

		render(<LintPanel blueprint={blueprint} />);

		expect({
			title: screen.getByRole('heading', {name: 'Lint'}).textContent,
			badges: screen.getAllByTestId('lint-count').map((element) => element.textContent),
			rows: screen.getAllByRole('listitem').map((element) => element.textContent),
			icons: screen.getAllByRole('img').map((element) => element.getAttribute('alt')),
		}).toStrictEqual({
			title: 'Lint',
			badges: ['2 warnings'],
			rows: [
				'●Underground belt "underground-belt" at (0, 0) has no paired output.(0, 0)',
				'●Underground belt "underground-belt" at (10, 0) has no paired input.(10, 0)',
			],
			icons: ['underground-belt', 'underground-belt'],
		});
	});

	test('renders an informational finding for an empty blueprint', () => {
		const blueprint: BlueprintString = {
			blueprint: {item: 'blueprint', version: VERSION_2_0},
		};

		render(<LintPanel blueprint={blueprint} />);

		expect({
			badge: screen.getByTestId('lint-count').textContent,
			row: screen.getByRole('listitem').textContent,
		}).toStrictEqual({
			badge: '1 info',
			row: '●Blueprint contains no entities or tiles.',
		});
	});

	test('renders nothing for valid blueprints and planner types', () => {
		const validBlueprint: BlueprintString = {
			blueprint: {
				item: 'blueprint',
				version: VERSION_2_0,
				entities: [{entity_number: 100, name: 'inserter', position: {x: 0, y: 0}}],
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

		expect([validRender.container.innerHTML, plannerRender.container.innerHTML]).toStrictEqual(['', '']);
	});
});
