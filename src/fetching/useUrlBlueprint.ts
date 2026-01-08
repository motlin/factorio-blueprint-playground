import {useQuery} from '@tanstack/react-query';

import {fetchUrl} from './blueprintFetcher';

export function useUrlBlueprint(url: string | undefined) {
	return useQuery({
		queryKey: ['blueprint-url', url],
		queryFn: async () => {
			if (!url?.match(/^https?:\/\//i)) {
				throw new Error('Invalid URL');
			}
			return fetchUrl(url);
		},
		enabled: !!url && !!url.match(/^https?:\/\//i),
		staleTime: Infinity,
		gcTime: Infinity,
	});
}
