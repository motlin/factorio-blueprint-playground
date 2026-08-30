import {afterEach, beforeEach, describe, expect, it, vi} from 'vite-plus/test';

import {fetchBlueprint} from '../../src/fetching/blueprintFetcher';
import {blueprintSha1} from '../../src/lib/factorioBlueprintEditor';
import {readFixtureFile} from '../fixtures/utils';

const blueprintText = readFixtureFile('txt/simple.txt');

const queryClient = {
	fetchQuery: async <T>({queryFn}: {queryFn: () => Promise<T>}): Promise<T> => await queryFn(),
};

function mockFetchText(text: string) {
	const response = {
		ok: true,
		text: async () => Promise.resolve(text),
		json: async () => Promise.resolve(text),
	} as unknown as Response;

	return vi.fn<() => Promise<Response>>(async () => Promise.resolve(response));
}

beforeEach(() => {
	vi.stubGlobal('fetch', mockFetchText(blueprintText));
});

afterEach(() => {
	vi.unstubAllGlobals();
});

describe('fetchBlueprint blueprintSha', () => {
	it('reports the api sha for a Factorio Prints blueprint', async () => {
		const result = await fetchBlueprint(
			{pasted: 'https://factorioprints.com/view/-KnQ865j-qQ21WoUPbd3'},
			queryClient,
		);

		expect(result?.success).toBe(true);
		expect(result?.success === true ? result.blueprintSha : undefined).toBe(await blueprintSha1(blueprintText));
	});

	it('reports the api sha for a Factorio School blueprint', async () => {
		const result = await fetchBlueprint({pasted: 'https://factorio.school/view/-KYeNAYQVgk2DcbuORde'}, queryClient);

		expect(result?.success === true ? result.blueprintSha : undefined).toBe(await blueprintSha1(blueprintText));
	});

	it('reports no sha for a source the api does not hold', async () => {
		const result = await fetchBlueprint({pasted: 'https://factoriobin.com/post/abc123'}, queryClient);

		expect(result?.success).toBe(true);
		expect(result?.success === true ? result.blueprintSha : undefined).toBeUndefined();
	});

	it('reports no sha for a pasted blueprint string', async () => {
		const result = await fetchBlueprint({pasted: blueprintText}, queryClient);

		expect(result?.success).toBe(true);
		expect(result?.success === true ? result.blueprintSha : undefined).toBeUndefined();
	});
});

describe('fetchBlueprint outside a secure context', () => {
	it('still fetches the blueprint when SubtleCrypto is missing', async () => {
		// Regression: computing the sha threw here, and the whole fetch failed
		// with "Cannot read properties of undefined (reading 'digest')".
		vi.stubGlobal('crypto', {});

		const result = await fetchBlueprint(
			{pasted: 'https://factorioprints.com/view/-KnQ865j-qQ21WoUPbd3'},
			queryClient,
		);

		expect(result?.success).toBe(true);
		expect(result?.success === true ? result.blueprintSha : 'unset').toBeUndefined();
	});
});
