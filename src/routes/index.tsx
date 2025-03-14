import {createFileRoute} from '@tanstack/react-router';
import {z} from 'zod';

import {BlueprintPlayground} from '../components/BlueprintPlayground';
import {BlueprintFetchResult, fetchBlueprint} from '../fetching/blueprintFetcher.ts';
import {BlueprintWrapper} from '../parsing/BlueprintWrapper';
import {extractBlueprint} from '../parsing/blueprintParser';
import {addBlueprint} from '../state/blueprintLocalStorage';

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

// Simple cache for the current fetch result to prevent excessive network requests
// This is cleared whenever the route changes
// TODO 2025-04-18: Replace this with TanStack Query
let currentFetchCache: {
	pasted: string | undefined;
	result: BlueprintFetchResult;
} | null = null;

export const Route = createFileRoute('/')({
	component: BlueprintPlayground,
	validateSearch: searchSchema,
	loaderDeps: ({search: {pasted}}) => ({pasted}),
	loader: async ({deps: {pasted}, search}: {deps: {pasted: string}; search: Record<string, unknown>}) => {
		if (currentFetchCache && currentFetchCache.pasted === pasted) {
			// eslint-disable-next-line no-console
			console.log('Using cached blueprint data');
			return currentFetchCache.result;
		}

		const result = await fetchBlueprint({pasted});

		currentFetchCache = {
			pasted,
			result,
		};

		// If successful, save to history
		if (result?.success && result.blueprintString) {
			try {
				const wrapper = new BlueprintWrapper(result.blueprintString);
				const type = wrapper.getType().replace('-', '_');
				const content = wrapper.getContent() as Record<string, unknown>;

				if (content) {
					const metadata = {
						type,
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

					let validSelection: string | undefined = undefined;
					try {
						if (typeof search?.selection === 'string' && search.selection) {
							extractBlueprint(result.blueprintString, search.selection);
							validSelection = search.selection;
						}
					} catch (error) {
						console.warn('Invalid selection path, not saving to history:', error);
					}

					await addBlueprint(result.pasted, metadata, validSelection, result.fetchMethod);
				}
			} catch (error) {
				console.error('Failed to save blueprint to history:', error);
			}
		}

		return result;
	},
});
