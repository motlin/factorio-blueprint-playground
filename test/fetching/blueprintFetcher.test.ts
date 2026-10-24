import {QueryClient} from '@tanstack/react-query';
import {afterEach, describe, expect, test, vi} from 'vite-plus/test';

import {fetchBlueprint} from '../../src/fetching/blueprintFetcher';
import {serializeBlueprint} from '../../src/parsing/blueprintParser';
import type {BlueprintString} from '../../src/parsing/types';

const blueprint: BlueprintString = {
	blueprint: {
		item: 'blueprint',
		label: 'Factorio Prints import',
		version: 0,
	},
};
const blueprintData = serializeBlueprint(blueprint);

afterEach(() => {
	vi.unstubAllGlobals();
});

describe('Factorio Prints blueprint fetching', () => {
	test.each([
		'https://factorioprints.com/view/abc123',
		'https://www.factorioprints.com/view/abc123',
		'https://factorioprints.xyz/view/abc123',
		'https://www.factorioprints.xyz/view/abc123',
	])('fetches %s through the blueprint-key CDN', async (pasted) => {
		const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(new Response(blueprintData, {status: 200}));
		vi.stubGlobal('fetch', fetchMock);

		const result = await fetchBlueprint({pasted}, new QueryClient());

		expect({
			fetchCalls: fetchMock.mock.calls,
			result,
		}).toStrictEqual({
			fetchCalls: [['https://factorio-blueprint-key-cdn.pages.dev/abc/123.txt']],
			result: {
				success: true,
				fetchMethod: 'url',
				pasted,
				blueprintString: blueprint,
				id: 'abc123',
			},
		});
	});
});
