import {QueryClient} from '@tanstack/react-query';
import {beforeEach, describe, expect, test, vi} from 'vitest';

vi.mock('../../src/fetching/blueprintFetcher');
vi.mock('../../src/state/blueprintLocalStorage', () => ({
	addBlueprint: vi.fn().mockImplementation((...args) => {
		console.log('addBlueprint called with:', JSON.stringify(args));
		return Promise.resolve({} as unknown);
	}),
}));
vi.mock('../../src/parsing/blueprintParser', () => ({
	extractBlueprint: vi.fn().mockImplementation((...args) => {
		console.log('extractBlueprint called with:', JSON.stringify(args));
		return {} as unknown;
	}),
	deserializeBlueprint: vi.fn(),
}));

import {fetchBlueprint} from '../../src/fetching/blueprintFetcher';
import {extractBlueprint} from '../../src/parsing/blueprintParser';
import * as IndexRoute from '../../src/routes/index';
import {addBlueprint} from '../../src/state/blueprintLocalStorage';

const originalLoader = IndexRoute.Route.options.loader;
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

	const result = await originalLoader(params as Parameters<typeof originalLoader>[0]);
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
		});

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
		});

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
		const mockFetchBlueprint = vi.mocked(fetchBlueprint);
		const mockAddBlueprint = vi.mocked(addBlueprint);
		const mockExtractBlueprint = vi.mocked(extractBlueprint);

		mockAddBlueprint.mockClear();
		mockExtractBlueprint.mockClear();
		mockFetchBlueprint.mockClear();

		const mockBlueprint = {
			blueprint_book: {
				label: 'Test Book',
				version: 123456,
				item: 'blueprint-book',
				blueprints: [{blueprint: {label: 'Nested Blueprint', version: 123456, item: 'blueprint'}}],
			},
		};

		mockFetchBlueprint.mockResolvedValue({
			success: true,
			blueprintString: mockBlueprint,
			pasted: 'test',
			fetchMethod: 'data',
		});

		mockExtractBlueprint.mockReturnValue({
			blueprint: {
				label: 'Nested Blueprint',
				version: 123456,
				item: 'blueprint',
			},
		});

		await loader({
			context: {},
			params: {},
			search: {pasted: 'test', selection: '1'},
			location: {} as Record<string, unknown>,
			abortController: new AbortController(),
			deps: {pasted: 'test'} as Record<string, unknown>,
		});

		expect(mockExtractBlueprint).toHaveBeenCalledWith(mockBlueprint, '1');

		expect(mockAddBlueprint).toHaveBeenCalledWith('test', expect.any(Object), '1', 'data');
	});

	test('validates and discards invalid selection path', async () => {
		const mockFetchBlueprint = vi.mocked(fetchBlueprint);
		const mockAddBlueprint = vi.mocked(addBlueprint);
		const mockExtractBlueprint = vi.mocked(extractBlueprint);

		mockAddBlueprint.mockClear();
		mockExtractBlueprint.mockClear();
		mockFetchBlueprint.mockClear();

		const mockBlueprint = {
			blueprint: {
				label: 'Simple Blueprint',
				version: 123456,
				item: 'blueprint',
			},
		};

		mockFetchBlueprint.mockResolvedValue({
			success: true,
			blueprintString: mockBlueprint,
			pasted: 'test',
			fetchMethod: 'data',
		});

		mockExtractBlueprint.mockImplementation(() => {
			throw new Error('Invalid path 6.1: no blueprint book at 6.1');
		});

		await loader({
			context: {},
			params: {},
			// Invalid path for a simple blueprint
			search: {pasted: 'test', selection: '6.1'},
			location: {} as Record<string, unknown>,
			abortController: new AbortController(),
			deps: {pasted: 'test'} as Record<string, unknown>,
		});

		expect(mockExtractBlueprint).toHaveBeenCalledWith(mockBlueprint, '6.1');

		expect(mockAddBlueprint).toHaveBeenCalledWith('test', expect.any(Object), undefined, 'data');
	});
});
