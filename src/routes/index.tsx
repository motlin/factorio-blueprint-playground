import {createFileRoute} from '@tanstack/react-router';
import {z} from 'zod';

import {BlueprintPlayground} from '../components/BlueprintPlayground';
import {fetchBlueprint} from '../fetching/blueprintFetcher.ts';

/**
 * - pasted: Whatever was pasted, a blueprint string, json, or url
 * - selection: Optional path within a blueprint book (e.g. "1.2.3")
 */
export interface RootSearch {
	pasted?: string;
	selection?: string;
}

export const searchSchema = z.object({
	pasted: z.string().catch(undefined),
	selection: z.string().catch(undefined),
});

export const Route = createFileRoute('/')({
	component: BlueprintPlayground,
	validateSearch: searchSchema,
	loaderDeps: ({search: {pasted}}) => ({pasted}),
	loader: ({deps: {pasted}}) => fetchBlueprint({pasted}),
});
