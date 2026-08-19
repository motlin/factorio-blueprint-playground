import {render} from '@testing-library/react';
import {beforeEach, describe, expect, test, vi} from 'vite-plus/test';

import type {BlueprintFetchResult} from '../../src/fetching/blueprintFetcher';
import type {DatabaseBlueprint} from '../../src/storage/db';

const mocks = vi.hoisted(() => ({
	existingBlueprint: undefined as DatabaseBlueprint | undefined,
	loaderData: undefined as BlueprintFetchResult,
	navigate: vi.fn<(options: unknown) => void>(),
	search: {pasted: 'alice-blueprint', selection: '1'},
	updateBlueprintMetadata: vi.fn<(sha: string, changes: {selection: string}) => Promise<unknown>>(),
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
	db: {},
	generateSha: vi.fn<() => Promise<string>>(),
}));
vi.mock('../../src/components/blueprint/disqus/DisqusComments', () => ({default: () => null}));

import {BlueprintPlayground} from '../../src/components/BlueprintPlayground';

function storedBlueprint(selection: string): DatabaseBlueprint {
	return {
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

		expect(mocks.updateBlueprintMetadata.mock.calls).toStrictEqual([['sha-100', {selection: '1'}]]);
	});
});
