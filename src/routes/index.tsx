import {createFileRoute} from '@tanstack/react-router';

import { BlueprintPlayground } from '../components/BlueprintPlayground';
import { fetchBlueprint } from '../fetching/blueprintFetcher.ts';

/**
 * - pasted: Whatever was pasted, a blueprint string, json, or url
 * - selection: Optional path within a blueprint book (e.g. "1.2.3")
 */
export interface RootSearch {
  pasted?: string
  selection?: string
}

// TODO: 2024-11-30: Consider moving to zod for validation as documented in https://tanstack.com/router/latest/docs/framework/react/guide/search-params#validating-search-params

export const Route = createFileRoute('/')({
  component: BlueprintPlayground,
  validateSearch: (search: Record<string, unknown>): RootSearch => {
    const pasted = search.pasted as string | undefined;
    const selection = search.selection as string | undefined;

    return {
      pasted,
      selection,
    };
  },
  loaderDeps: ({ search: { pasted } }) => ({ pasted }),
  loader: ({ deps: { pasted } }) => fetchBlueprint({ pasted }),
});
