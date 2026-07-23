import {render, screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {expect, test, vi} from 'vite-plus/test';

import {BlueprintContentFilters} from '../../src/components/blueprint/panels/transform/BlueprintContentFilters';
import type {BlueprintFilterCategories} from '../../src/transform/strip';

interface VisibilityCase {
	categories: BlueprintFilterCategories;
	expectedLabels: string[];
	name: string;
}

const visibilityCases: VisibilityCase[] = [
	{
		categories: {entities: true, modules: true, tiles: false, trains: false},
		expectedLabels: ['Modules'],
		name: 'modules-only',
	},
	{
		categories: {entities: true, modules: false, tiles: true, trains: false},
		expectedLabels: ['Entities', 'Tiles'],
		name: 'mixed entities and tiles',
	},
	{
		categories: {entities: false, modules: false, tiles: false, trains: false},
		expectedLabels: [],
		name: 'absent categories',
	},
];

function renderFilters(categories: BlueprintFilterCategories) {
	const onEntitiesIncludedChange = vi.fn<(included: boolean) => void>();
	const onModulesIncludedChange = vi.fn<(included: boolean) => void>();
	const onTilesIncludedChange = vi.fn<(included: boolean) => void>();
	const onTrainsIncludedChange = vi.fn<(included: boolean) => void>();

	render(
		<BlueprintContentFilters
			categories={categories}
			entitiesIncluded
			modulesIncluded
			onEntitiesIncludedChange={onEntitiesIncludedChange}
			onModulesIncludedChange={onModulesIncludedChange}
			onTilesIncludedChange={onTilesIncludedChange}
			onTrainsIncludedChange={onTrainsIncludedChange}
			tilesIncluded
			trainsIncluded
		/>,
	);

	return {
		onEntitiesIncludedChange,
		onModulesIncludedChange,
		onTilesIncludedChange,
		onTrainsIncludedChange,
	};
}

test.each(visibilityCases)('shows only meaningful filters for $name', ({categories, expectedLabels}) => {
	renderFilters(categories);

	expect({
		checkboxCount: screen.queryAllByRole('checkbox').length,
		controls: expectedLabels.map((label) => {
			const checkbox = screen.getByRole<HTMLInputElement>('checkbox', {name: label});
			return {
				checked: checkbox.checked,
				label: checkbox.labels?.[0]?.textContent,
				type: checkbox.type,
			};
		}),
		heading: screen.queryByRole('heading', {name: 'Filters'})?.textContent ?? null,
	}).toStrictEqual({
		checkboxCount: expectedLabels.length,
		controls: expectedLabels.map((label) => ({checked: true, label, type: 'checkbox'})),
		heading: expectedLabels.length === 0 ? null : 'Filters',
	});
});

test('toggles a fully named filter with the native keyboard control', async () => {
	const user = userEvent.setup();
	const callbacks = renderFilters({entities: true, modules: true, tiles: true, trains: true});
	const trains = screen.getByRole<HTMLInputElement>('checkbox', {name: 'Trains'});

	trains.focus();
	await user.keyboard(' ');

	expect({
		activeElement: document.activeElement,
		calls: callbacks.onTrainsIncludedChange.mock.calls,
		factorioCheckbox: trains.nextElementSibling?.className,
	}).toStrictEqual({
		activeElement: trains,
		calls: [[false]],
		factorioCheckbox: 'checkbox',
	});
});
