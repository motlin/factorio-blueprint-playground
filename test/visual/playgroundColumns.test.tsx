import {QueryClient, QueryClientProvider} from '@tanstack/react-query';
import {render} from '@testing-library/react';
import {expect, test, vi} from 'vite-plus/test';

import type {BlueprintFetchResult} from '../../src/fetching/blueprintFetcher';
import type {BlueprintString} from '../../src/parsing/types';
import {readFixtureFile} from '../fixtures/utils';

const mocks = vi.hoisted(() => ({
	loaderData: undefined as BlueprintFetchResult,
	navigate: vi.fn<(options: unknown) => void>(),
	search: {pasted: 'playground-columns', selection: ''},
}));

vi.mock('@tanstack/react-router', () => ({
	getRouteApi: () => ({
		id: '/',
		useLoaderData: () => mocks.loaderData,
		useSearch: () => mocks.search,
	}),
	useNavigate: () => mocks.navigate,
}));
vi.mock('dexie-react-hooks', () => ({useLiveQuery: () => undefined}));
vi.mock('../../src/state/blueprintLocalStorage', () => ({
	updateBlueprintMetadata: vi.fn<(id: string, changes: {selection: string}) => Promise<void>>(),
}));
vi.mock('../../src/storage/db', () => ({db: {findHistoryByData: vi.fn<() => Promise<unknown>>()}}));
vi.mock('../../src/components/blueprint/disqus/DisqusComments', () => ({default: () => null}));

import {BlueprintPlayground} from '../../src/components/BlueprintPlayground';

import {inspectPlaygroundColumns, type PlaygroundColumnLayout} from './setup';

function renderPlaygroundHtml(fixture: string): string {
	const blueprintString = JSON.parse(readFixtureFile(`json/${fixture}.json`)) as BlueprintString;
	mocks.search = {pasted: 'playground-columns', selection: blueprintString.blueprint_book ? '1' : ''};
	mocks.loaderData = {
		blueprintString,
		fetchMethod: 'data',
		pasted: 'playground-columns',
		success: true,
	};

	const container = document.createElement('div');
	const queryClient = new QueryClient({defaultOptions: {queries: {retry: false}}});
	render(
		<QueryClientProvider client={queryClient}>
			<BlueprintPlayground />
		</QueryClientProvider>,
		{container},
	);
	return container.innerHTML.replace(
		/https:\/\/factorio-icon-cdn\.pages\.dev\/[^"]+/g,
		'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%2232%22 height=%2232%22%3E%3Crect width=%2232%22 height=%2232%22 fill=%22%23666%22/%3E%3C/svg%3E',
	);
}

// The Blueprint Tree column is short while the selected-blueprint column keeps
// stacking panels, so the contents panels used to run far below the left half.
// They now sit in their own balanced section under both columns, and a blueprint
// with no book collapses to one column rather than parking a long Basic
// Information panel beside a single tree row.
test('drops the contents panels out of the two columns and balances them underneath', async () => {
	const layouts: Array<PlaygroundColumnLayout | undefined> = [];
	for (const fixture of ['simple', 'book', 'nested-book', 'train-with-wires', 'space-age', 'upgrade']) {
		layouts.push(
			await inspectPlaygroundColumns('playground-columns', renderPlaygroundHtml(fixture), {
				height: 900,
				width: 1400,
			}),
		);
	}
	const availableLayouts = layouts.filter((layout): layout is PlaygroundColumnLayout => layout !== undefined);
	const expectedLayout: PlaygroundColumnLayout = {
		collapsedLabelsStayNarrow: true,
		columnsEndTogether: true,
		contentsPanelsLeaveTheColumns: true,
		contentsPanelsMatchColumnWidth: true,
		contentsPanelsShareTheirTop: true,
		contentsPanelsUseBothColumns: true,
		selectedColumnEndsAtBasicInformation: true,
	};

	expect(availableLayouts).toStrictEqual(availableLayouts.map(() => expectedLayout));
});
