import {createFileRoute} from '@tanstack/react-router';
import {z} from 'zod';

import {BlueprintPlayground} from '../components/BlueprintPlayground';
import {BlueprintFetchMethod, fetchBlueprint} from '../fetching/blueprintFetcher';
import {BlueprintWrapper} from '../parsing/BlueprintWrapper';
import {extractBlueprint} from '../parsing/blueprintParser';
import {addBlueprint} from '../state/blueprintLocalStorage';
import {DatabaseBlueprintType} from '../storage/db';

/**
 * - pasted: Whatever was pasted, a blueprint string, json, or url
 * - selection: Optional path within a blueprint book (e.g. "1.2.3")
 * - focusTextarea: Whether to focus the textarea when the component mounts
 * - fetchType: The type of fetch operation that produced this blueprint ('edit' when edited)
 */
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
		// If fetchType is specified in the URL, use it (particularly for handling edited blueprints)
		const fetchType =
			search && typeof search.fetchType === 'string' && ['url', 'json', 'data', 'edit'].includes(search.fetchType)
				? (search.fetchType as BlueprintFetchMethod)
				: undefined;
		const result = await fetchBlueprint({pasted, fetchType}, queryClient);

		// If successful, save to history
		if (result?.success && result.blueprintString) {
			try {
				const wrapper = new BlueprintWrapper(result.blueprintString);
				const type = wrapper.getType()?.replace('-', '_');
				const content = wrapper.getContent() as Record<string, unknown>;

				if (content && type) {
					const metadata = {
						type: type as DatabaseBlueprintType,
						label: content.label as string | undefined,
						description: content.description as string | undefined,
						gameVersion: (content.version as number | undefined)?.toString(),
						icons: (() => {
							const contentIcons = content.icons;
							const icons = Array.isArray(contentIcons) ? contentIcons : [];

							return icons.map((icon: unknown) => {
								if (typeof icon !== 'object' || icon === null) {
									return {name: 'unknown'};
								}

								const iconObj = icon as Record<string, unknown>;
								const signalRaw = iconObj.signal;
								const signal =
									typeof signalRaw === 'object' && signalRaw !== null
										? (signalRaw as Record<string, unknown>)
										: {};

								return {
									type: typeof signal.type === 'string' ? signal.type : undefined,
									name: typeof signal.name === 'string' ? signal.name : '',
								};
							});
						})(),
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

					// If a fetchType was specified in the URL (e.g., for restored edits via browser back button),
					// use that instead of the result's fetchMethod
					const effectiveFetchMethod: BlueprintFetchMethod = fetchType || result.fetchMethod;
					await addBlueprint(result.pasted, metadata, validSelection, effectiveFetchMethod);
				}
			} catch (error) {
				console.error('Failed to save blueprint to history:', error);
			}
		}

		return result;
	},
});
