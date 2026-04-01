import {createFileRoute} from '@tanstack/react-router';
import {z} from 'zod';

import {BlueprintPlayground} from '../components/BlueprintPlayground';
import {type BlueprintFetchMethod, fetchBlueprint} from '../fetching/blueprintFetcher';
import {BlueprintWrapper} from '../parsing/BlueprintWrapper';
import {extractBlueprint} from '../parsing/blueprintParser';
import {addBlueprint} from '../state/blueprintLocalStorage';
import type {DatabaseBlueprintType} from '../storage/db';

export interface RootSearch {
	pasted?: string;
	selection?: string;
	focusTextarea?: boolean;
	fetchType?: BlueprintFetchMethod;
}

export const searchSchema = z.object({
	pasted: z.string().catch(undefined),
	selection: z.string().catch(undefined),
	focusTextarea: z.boolean().catch(undefined),
	fetchType: z.enum(['url', 'json', 'data', 'edit']).optional().catch(undefined),
});

const saveToHistory = async (
	result: {
		success: boolean;
		blueprintString: string;
		pasted: string;
		fetchMethod: BlueprintFetchMethod;
	},
	search: Record<string, unknown>,
	fetchType: BlueprintFetchMethod | undefined,
) => {
	const wrapper = new BlueprintWrapper(result.blueprintString);
	const type = wrapper.getType()?.replace('-', '_');

	const metadata = {
		type: type as DatabaseBlueprintType,
		label: wrapper.getLabel(),
		description: wrapper.getDescription(),
		gameVersion: wrapper.getVersion()?.toString(),
		icons: wrapper.getIcons().map((icon) => ({
			type: icon.signal.type,
			name: icon.signal.name,
		})),
	};

	let validSelection: string | undefined;
	try {
		if (typeof search?.selection === 'string' && search.selection) {
			extractBlueprint(result.blueprintString, search.selection);
			validSelection = search.selection;
		}
	} catch (error) {
		console.warn('Invalid selection path, not saving to history:', error);
	}

	const effectiveFetchMethod: BlueprintFetchMethod = fetchType || result.fetchMethod;
	await addBlueprint(result.pasted, metadata, validSelection, effectiveFetchMethod);
};

export const Route = createFileRoute('/')({
	component: BlueprintPlayground,
	validateSearch: searchSchema,
	loaderDeps: ({search: {pasted}}) => ({pasted}),
	loader: async ({
		deps: {pasted},
		search,
		context: {queryClient},
	}: {
		deps: {pasted: string};
		search: Record<string, unknown>;
		context: {
			queryClient: {
				fetchQuery: <T>(options: {
					queryKey: unknown[];
					queryFn: () => Promise<T>;
					staleTime?: number;
					gcTime?: number;
				}) => Promise<T>;
			};
		};
	}) => {
		const fetchType = search.fetchType as BlueprintFetchMethod | undefined;
		const result = await fetchBlueprint({pasted, fetchType}, queryClient);

		if (result?.success && result.blueprintString) {
			try {
				await saveToHistory(result, search, fetchType);
			} catch (error) {
				console.error('Failed to save blueprint to history:', error);
			}
		}

		return result;
	},
});
