import {render, screen} from '@testing-library/react';
import {expect, test} from 'vite-plus/test';

import {BlueprintComponentsGrid} from '../../src/components/blueprint/panels/transform/BlueprintComponentsGrid';
import {aggregateBlueprintComponents} from '../../src/components/blueprint/panels/transform/blueprintComponents';
import type {BlueprintString} from '../../src/parsing/types';

const blueprintWithComponents: BlueprintString = {
	blueprint: {
		item: 'blueprint',
		version: 0,
		entities: [
			{entity_number: 1, name: 'transport-belt', position: {x: 0, y: 0}},
			{entity_number: 2, name: 'transport-belt', position: {x: 1, y: 0}},
			{
				entity_number: 3,
				name: 'assembling-machine-1',
				position: {x: 2, y: 0},
				items: [
					{
						id: {name: 'speed-module', quality: 'rare'},
						items: {
							in_inventory: [
								{inventory: 4, stack: 0, count: 2},
								{inventory: 4, stack: 1},
							],
						},
					},
					{
						id: {name: 'coal'},
						items: {in_inventory: [{inventory: 1, stack: 0, count: 10}]},
					},
				],
			},
			{entity_number: 4, name: 'locomotive', position: {x: 3, y: 0}},
		],
		tiles: [
			{name: 'refined-concrete', position: {x: 0, y: 1}},
			{name: 'refined-concrete', position: {x: 1, y: 1}},
		],
	},
};

test('aggregates inventory components with exact counts and deterministic ordering', () => {
	expect(aggregateBlueprintComponents(blueprintWithComponents)).toStrictEqual([
		{count: 10, name: 'coal', quality: undefined, type: 'item'},
		{count: 3, name: 'speed-module', quality: 'rare', type: 'item'},
		{count: 2, name: 'refined-concrete', quality: undefined, type: 'tile'},
		{count: 2, name: 'transport-belt', quality: undefined, type: 'entity'},
		{count: 1, name: 'assembling-machine-1', quality: undefined, type: 'entity'},
		{count: 1, name: 'locomotive', quality: undefined, type: 'entity'},
	]);
});

test('renders focusable counted slots with readable tooltips and an empty state', () => {
	const {rerender} = render(<BlueprintComponentsGrid blueprint={blueprintWithComponents} />);
	const transportBelt = screen.getByLabelText('Transport belt, 2');

	expect({
		count: transportBelt.querySelector('.blueprint-components__count')?.textContent,
		icon: transportBelt.querySelector('img')?.getAttribute('src'),
		slotLabels: screen.getAllByRole('listitem').map((slot) => slot.getAttribute('aria-label')),
		tabIndex: transportBelt.getAttribute('tabindex'),
		tooltip: transportBelt.getAttribute('title'),
	}).toStrictEqual({
		count: '2',
		icon: 'https://factorio-icon-cdn.pages.dev/entity/transport-belt.webp',
		slotLabels: [
			'Coal, 10',
			'Speed module, 3',
			'Refined concrete, 2',
			'Transport belt, 2',
			'Assembling machine 1, 1',
			'Locomotive, 1',
		],
		tabIndex: '0',
		tooltip: 'Transport belt\nentity:transport-belt',
	});

	rerender(<BlueprintComponentsGrid blueprint={{blueprint: {item: 'blueprint', version: 0}}} />);
	expect({
		emptyMessage: screen.getByText('No components in this blueprint.').textContent,
		grid: screen.queryByRole('list', {name: 'Blueprint components'}),
	}).toStrictEqual({
		emptyMessage: 'No components in this blueprint.',
		grid: null,
	});
});
