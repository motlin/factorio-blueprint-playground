import {QueryClient} from '@tanstack/react-query';
import {beforeEach, describe, expect, test, vi} from 'vite-plus/test';

vi.mock('../../src/fetching/blueprintFetcher');
vi.mock('../../src/state/blueprintLocalStorage', () => ({
	addBlueprint: vi.fn<() => Promise<unknown>>().mockResolvedValue({} as unknown),
}));

import {fetchBlueprint} from '../../src/fetching/blueprintFetcher';
import type {BlueprintFetchResult} from '../../src/fetching/blueprintFetcher';
import * as IndexRoute from '../../src/routes/index';
import {addBlueprint} from '../../src/state/blueprintLocalStorage';

const rawLoader = IndexRoute.Route.options.loader;
if (!rawLoader) {
	throw new Error('Index route loader is not defined');
}
const originalLoader = rawLoader as (params: unknown) => Promise<unknown>;
const queryClient = new QueryClient({
	defaultOptions: {
		queries: {
			staleTime: Infinity,
			gcTime: Infinity,
		},
	},
});

interface LoaderParams {
	context: Record<string, unknown>;
	params: Record<string, unknown>;
	search: Record<string, unknown>;
	location: Record<string, unknown>;
	abortController: AbortController;
	deps: Record<string, unknown>;
}

const loader = async (params: LoaderParams): Promise<unknown> => {
	params.context = {
		...params.context,
		queryClient,
	};

	const result = await originalLoader(params);
	return result;
};

beforeEach(() => {
	vi.resetAllMocks();
});

describe('Index route loader', () => {
	test('calls fetchBlueprint with pasted value', async () => {
		const mockFetchBlueprint = vi.mocked(fetchBlueprint);
		mockFetchBlueprint.mockResolvedValue({
			success: false,
			error: new Error('Test error'),
			pasted: 'test',
		} as BlueprintFetchResult);

		const result = await loader({
			context: {},
			params: {},
			search: {pasted: 'test'},
			location: {} as Record<string, unknown>,
			abortController: new AbortController(),
			deps: {pasted: 'test'} as Record<string, unknown>,
		});

		expect(mockFetchBlueprint).toHaveBeenCalledWith({pasted: 'test'}, queryClient);
		expect(result).toEqual({
			success: false,
			error: new Error('Test error'),
			pasted: 'test',
		});
	});

	test('saves blueprint to history on success', async () => {
		const mockFetchBlueprint = vi.mocked(fetchBlueprint);
		const mockAddBlueprint = vi.mocked(addBlueprint);

		mockAddBlueprint.mockClear();
		mockFetchBlueprint.mockClear();

		const mockBlueprint = {
			blueprint: {
				label: 'Test Blueprint',
				description: 'Test Description',
				version: 123456,
				icons: [{signal: {type: 'item', name: 'test-icon'}}],
			},
		};

		mockFetchBlueprint.mockResolvedValue({
			success: true,
			blueprintString: mockBlueprint,
			pasted: 'test',
			fetchMethod: 'data',
		} as BlueprintFetchResult);

		await loader({
			context: {},
			params: {},
			search: {pasted: 'test'},
			location: {} as Record<string, unknown>,
			abortController: new AbortController(),
			deps: {pasted: 'test'} as Record<string, unknown>,
		});

		expect(mockAddBlueprint).toHaveBeenCalledWith(
			'test',
			expect.objectContaining({
				type: 'blueprint',
				label: 'Test Blueprint',
				description: 'Test Description',
			}),
			undefined,
			'data',
		);
	});

	test('saves valid selection path to history', async () => {
		const fakeBlueprint = {
			blueprint_book: {
				label: 'Test Book',
				version: 123456,
				item: 'blueprint-book',
				blueprints: [{blueprint: {label: 'Nested Blueprint', version: 123456, item: 'blueprint'}}],
			},
		};

		vi.mocked(fetchBlueprint).mockResolvedValue({
			success: true,
			blueprintString: fakeBlueprint,
			pasted: 'test',
			fetchMethod: 'data',
		} as BlueprintFetchResult);

		await loader({
			context: {},
			params: {},
			search: {pasted: 'test', selection: '1'},
			location: {} as Record<string, unknown>,
			abortController: new AbortController(),
			deps: {pasted: 'test', selection: '1'} as Record<string, unknown>,
		});

		expect(vi.mocked(addBlueprint)).toHaveBeenCalledWith('test', expect.any(Object), '1', 'data');
	});

	test('validates and discards invalid selection path', async () => {
		const fakeBlueprint = {
			blueprint: {
				label: 'Simple Blueprint',
				version: 123456,
				item: 'blueprint',
			},
		};

		vi.mocked(fetchBlueprint).mockResolvedValue({
			success: true,
			blueprintString: fakeBlueprint,
			pasted: 'test',
			fetchMethod: 'data',
		} as BlueprintFetchResult);

		await loader({
			context: {},
			params: {},
			search: {pasted: 'test', selection: '6.1'},
			location: {} as Record<string, unknown>,
			abortController: new AbortController(),
			deps: {pasted: 'test', selection: '6.1'} as Record<string, unknown>,
		});

		expect(vi.mocked(addBlueprint)).toHaveBeenCalledWith('test', expect.any(Object), undefined, 'data');
	});
});
