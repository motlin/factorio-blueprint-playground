import {render, screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type {ReactNode} from 'react';
import {expect, test, vi} from 'vite-plus/test';

import {BlueprintHistoryTable} from '../../src/components/history/table/BlueprintHistoryTable';
import type {ImportHistoryRecord} from '../../src/storage/db';

vi.mock('@tanstack/react-router', async (importOriginal) => ({
	...(await importOriginal()),
	Link: ({children}: {children: ReactNode}) => <a href="/">{children}</a>,
}));

function historyRecord(
	id: string,
	label: string,
	type: 'blueprint' | 'blueprint_book',
	lastUpdatedOn: number,
): ImportHistoryRecord {
	return {
		id,
		importedOn: lastUpdatedOn,
		metadata: {
			sha: `sha-${id}`,
			createdOn: 0,
			lastUpdatedOn,
			data: `${id}-data`,
			selection: '',
			fetchMethod: 'data',
		},
		gameData: {type, label, icons: []},
	};
}

const records = [
	historyRecord('one', 'Bravo belts', 'blueprint_book', 200),
	historyRecord('two', 'Alpha assemblers', 'blueprint', 100),
];

test('renders human-readable blueprint type labels', () => {
	render(
		<BlueprintHistoryTable
			blueprints={records}
			selectedItems={new Set<string>()}
			toggleSelection={vi.fn<(id: string) => void>()}
		/>,
	);

	expect([...document.querySelectorAll('.history-type-container')].map((cell) => cell.textContent)).toStrictEqual([
		'Blueprint book',
		'Blueprint',
	]);
});

test('sorts history rows by a keyboard-operable header and announces the sort state', async () => {
	const user = userEvent.setup();
	render(
		<BlueprintHistoryTable
			blueprints={records}
			selectedItems={new Set<string>()}
			toggleSelection={vi.fn<(id: string) => void>()}
		/>,
	);

	const rowLabels = () => [...document.querySelectorAll('.history-label-container')].map((cell) => cell.textContent);
	expect(rowLabels()).toStrictEqual(['Bravo belts', 'Alpha assemblers']);

	await user.click(screen.getByRole('button', {name: 'Label'}));
	expect({
		header: screen.getByRole('button', {name: 'Label, sorted ascending'}).getAttribute('data-sort-direction'),
		labels: rowLabels(),
	}).toStrictEqual({
		header: 'asc',
		labels: ['Alpha assemblers', 'Bravo belts'],
	});

	await user.click(screen.getByRole('button', {name: 'Label, sorted ascending'}));
	expect({
		header: screen.getByRole('button', {name: 'Label, sorted descending'}).getAttribute('data-sort-direction'),
		labels: rowLabels(),
	}).toStrictEqual({
		header: 'desc',
		labels: ['Bravo belts', 'Alpha assemblers'],
	});

	await user.click(screen.getByRole('button', {name: 'Updated'}));
	expect(rowLabels()).toStrictEqual(['Alpha assemblers', 'Bravo belts']);
});
