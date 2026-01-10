import {useQuery} from '@tanstack/react-query';

import {fetchUrl} from './blueprintFetcher';

const HTTP_URL_REGEX = /^https?:\/\//i;

export function useUrlBlueprint(url: string | undefined) {
	return useQuery({
		queryKey: ['blueprint-url', url],
		queryFn: async () => {
			if (!url?.match(HTTP_URL_REGEX)) {
				throw new Error('Invalid URL');
			}
			return fetchUrl(url);
		},
		enabled: !!url && !!url.match(HTTP_URL_REGEX),
		staleTime: Infinity,
		gcTime: Infinity,
	});
}
