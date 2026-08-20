import {QueryClient, QueryClientProvider} from '@tanstack/react-query';
import {render, screen, within} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {beforeEach, describe, expect, test, vi} from 'vite-plus/test';

import type {BlueprintFetchResult} from '../../src/fetching/blueprintFetcher';
import type {ImportHistoryRecord} from '../../src/storage/db';

const mocks = vi.hoisted(() => ({
	existingBlueprint: undefined as ImportHistoryRecord | undefined,
	loaderData: undefined as BlueprintFetchResult,
	navigate: vi.fn<(options: unknown) => void>(),
	search: {pasted: 'alice-blueprint', selection: '1'},
	updateBlueprintMetadata: vi.fn<(id: string, changes: {selection: string}) => Promise<unknown>>(),
}));

vi.mock('@tanstack/react-router', () => ({
	getRouteApi: () => ({
		id: '/',
		useLoaderData: () => mocks.loaderData,
		useSearch: () => mocks.search,
	}),
	useNavigate: () => mocks.navigate,
}));
vi.mock('dexie-react-hooks', () => ({
	useLiveQuery: () => mocks.existingBlueprint,
}));
vi.mock('../../src/state/blueprintLocalStorage', () => ({
	updateBlueprintMetadata: mocks.updateBlueprintMetadata,
}));
vi.mock('../../src/storage/db', () => ({
	db: {findHistoryByData: vi.fn<() => Promise<unknown>>()},
}));
vi.mock('../../src/components/blueprint/disqus/DisqusComments', () => ({default: () => null}));

import {BlueprintPlayground} from '../../src/components/BlueprintPlayground';

function storedBlueprint(selection: string): ImportHistoryRecord {
	return {
		id: 'history-alice',
		importedOn: 0,
		metadata: {
			sha: 'sha-100',
			createdOn: 0,
			lastUpdatedOn: 0,
			data: 'alice-blueprint',
			selection,
			fetchMethod: 'data',
		},
		gameData: {type: 'blueprint', label: "Alice's blueprint", icons: []},
	};
}

describe('BlueprintPlayground', () => {
	beforeEach(() => {
		mocks.navigate.mockReset();
		mocks.updateBlueprintMetadata.mockReset().mockResolvedValue(undefined);
		mocks.loaderData = {
			success: true,
			blueprintString: {
				blueprint_book: {
					item: 'blueprint-book',
					label: "Alice's book",
					version: 0,
					blueprints: [{index: 100, blueprint: {item: 'blueprint', label: "Alice's blueprint", version: 0}}],
				},
			},
			pasted: 'alice-blueprint',
			fetchMethod: 'data',
		};
		mocks.search = {pasted: 'alice-blueprint', selection: '1'};
	});

	test('does not write a selection that is already saved', () => {
		mocks.existingBlueprint = storedBlueprint('1');
		const {rerender} = render(<BlueprintPlayground />);

		mocks.existingBlueprint = storedBlueprint('1');
		rerender(<BlueprintPlayground />);

		expect(mocks.updateBlueprintMetadata.mock.calls).toStrictEqual([]);
	});

	test('writes a changed selection once when the saved record refreshes', () => {
		mocks.existingBlueprint = storedBlueprint('2');
		const {rerender} = render(<BlueprintPlayground />);

		mocks.existingBlueprint = storedBlueprint('1');
		rerender(<BlueprintPlayground />);

		expect(mocks.updateBlueprintMetadata.mock.calls).toStrictEqual([['history-alice', {selection: '1'}]]);
	});

	test('exports the committed root after a child edit without treating commit as playground navigation', async () => {
		const user = userEvent.setup();
		const writeText = vi.fn<(text: string) => Promise<void>>().mockResolvedValue(undefined);
		Object.defineProperty(navigator, 'clipboard', {
			configurable: true,
			value: {writeText},
		});
		mocks.existingBlueprint = storedBlueprint('1');
		const queryClient = new QueryClient({
			defaultOptions: {queries: {retry: false}},
		});
		render(
			<QueryClientProvider client={queryClient}>
				<BlueprintPlayground />
			</QueryClientProvider>,
		);

		await user.click(screen.getByRole('button', {name: 'Open Blueprint Editor'}));
		await user.click(screen.getByRole('button', {name: 'Edit blueprint title'}));
		await user.clear(screen.getByRole('textbox', {name: 'Blueprint title'}));
		await user.type(screen.getByRole('textbox', {name: 'Blueprint title'}), 'Committed child{Enter}');
		await user.click(screen.getByRole('button', {name: 'Save blueprint'}));

		expect({
			dialog: screen.queryByRole('dialog', {name: 'Blueprint Editor'}),
			navigation: mocks.navigate.mock.calls,
		}).toStrictEqual({
			dialog: null,
			navigation: [],
		});

		await user.click(screen.getAllByRole('button', {name: 'Copy JSON'})[0]);
		expect(writeText).toHaveBeenCalledExactlyOnceWith(
			JSON.stringify(
				{
					blueprint_book: {
						item: 'blueprint-book',
						label: "Alice's book",
						version: 0,
						blueprints: [
							{
								index: 100,
								blueprint: {
									item: 'blueprint',
									version: 0,
									label: 'Committed child',
								},
							},
						],
					},
				},
				null,
				2,
			),
		);
	});

	test('keeps tiles and trains when the editor opens on an imported blueprint', async () => {
		const user = userEvent.setup();
		const writeText = vi.fn<(text: string) => Promise<void>>().mockResolvedValue(undefined);
		Object.defineProperty(navigator, 'clipboard', {
			configurable: true,
			value: {writeText},
		});
		mocks.existingBlueprint = storedBlueprint('');
		mocks.search = {pasted: 'alice-blueprint', selection: ''};
		mocks.loaderData = {
			success: true,
			blueprintString: {
				blueprint: {
					item: 'blueprint',
					label: "Alice's blueprint",
					version: 0,
					entities: [
						{entity_number: 100, name: 'assembling-machine-3', position: {x: 0, y: 0}},
						{entity_number: 200, name: 'locomotive', position: {x: 1, y: 0}},
					],
					tiles: [{name: 'landfill', position: {x: 0, y: 1}}],
				},
			},
			pasted: 'alice-blueprint',
			fetchMethod: 'data',
		};
		const queryClient = new QueryClient({
			defaultOptions: {queries: {retry: false}},
		});
		render(
			<QueryClientProvider client={queryClient}>
				<BlueprintPlayground />
			</QueryClientProvider>,
		);

		await user.click(screen.getByRole('button', {name: 'Open Blueprint Editor'}));
		const filtersSection = screen.getByRole('heading', {name: 'Filters'}).closest('section');
		if (filtersSection === null) {
			throw new Error('Expected the imported blueprint filters section.');
		}

		expect({
			commitAction: screen.queryByRole('button', {name: 'Create blueprint'}) === null ? 'save' : 'create',
			filters: within(filtersSection)
				.getAllByRole<HTMLInputElement>('checkbox')
				.map((checkbox) => ({
					checked: checkbox.checked,
					label: checkbox.labels?.[0]?.textContent,
				})),
		}).toStrictEqual({
			commitAction: 'save',
			filters: [
				{checked: true, label: 'Entities'},
				{checked: true, label: 'Tiles'},
				{checked: true, label: 'Trains'},
			],
		});

		await user.click(screen.getByRole('button', {name: 'Edit blueprint title'}));
		await user.clear(screen.getByRole('textbox', {name: 'Blueprint title'}));
		await user.type(screen.getByRole('textbox', {name: 'Blueprint title'}), 'Imported blueprint{Enter}');
		await user.click(screen.getByRole('button', {name: 'Save blueprint'}));
		await user.click(screen.getAllByRole('button', {name: 'Copy JSON'})[0]);

		expect(writeText).toHaveBeenCalledExactlyOnceWith(
			JSON.stringify(
				{
					blueprint: {
						item: 'blueprint',
						version: 0,
						entities: [
							{entity_number: 100, name: 'assembling-machine-3', position: {x: 0, y: 0}},
							{entity_number: 200, name: 'locomotive', position: {x: 1, y: 0}},
						],
						tiles: [{name: 'landfill', position: {x: 0, y: 1}}],
						label: 'Imported blueprint',
					},
				},
				null,
				2,
			),
		);
	});
});
