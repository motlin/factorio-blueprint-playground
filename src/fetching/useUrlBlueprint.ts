import {useQuery} from '@tanstack/react-query';

import {fetchUrl} from './blueprintFetcher';

/**
 * Custom hook for fetching blueprints from URLs using TanStack Query
 * Only used for actual URLs, not JSON or blueprint data
 */
export function useUrlBlueprint(url: string | undefined) {
	return useQuery({
		queryKey: ['blueprint-url', url],
		queryFn: async () => {
			if (!url || !url.match(/^https?:\/\//i)) {
				throw new Error('Invalid URL');
			}
			return fetchUrl(url);
		},
		enabled: !!url && !!url.match(/^https?:\/\//i),
		staleTime: Infinity,
		gcTime: Infinity,
	});
}
