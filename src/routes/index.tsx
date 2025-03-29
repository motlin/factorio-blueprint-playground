import {createFileRoute} from '@tanstack/react-router';
import {z} from 'zod';

import {BlueprintPlayground} from '../components/BlueprintPlayground';
import {fetchBlueprint} from '../fetching/blueprintFetcher.ts';
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

export const Route = createFileRoute('/')({
	component: BlueprintPlayground,
	validateSearch: searchSchema,
	loaderDeps: ({search: {pasted}}) => ({pasted}),
	loader: async ({deps: {pasted}, search}: {deps: {pasted: string}; search: Record<string, unknown>}) => {
		const result = await fetchBlueprint({pasted});

		// If successful, save to history
		if (result?.success && result.blueprintString) {
			try {
				// Use BlueprintWrapper to extract info for history
				const wrapper = new BlueprintWrapper(result.blueprintString);
				const type = wrapper.getType().replace('-', '_');
				const content = wrapper.getContent();

				if (content) {
					// Basic metadata for the blueprint
					const metadata = {
						type,
						label: content.label,
						description: content.description,
						gameVersion: content.version.toString(),
						/* eslint-disable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return */
						icons: (() => {
							// Safely handle content.icons to avoid unsafe member access
							const icons = Array.isArray(content.icons) ? content.icons : [];
							return icons.map((icon) => {
								// Safely handle icon.signal
								const signal =
									typeof icon.signal === 'object' && icon.signal != null ? icon.signal : {};
								return {
									type: typeof signal.type === 'string' ? signal.type : undefined,
									name: typeof signal.name === 'string' ? signal.name : '',
								};
							});
						})(),
						/* eslint-enable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return */
					};

					// Save to IndexedDB via our helper function with current selection path
					// Only save selection if this blueprint actually has that path (prevents saving invalid selections)
					let validSelection: string | undefined = undefined;
					try {
						if (typeof search?.selection === 'string' && search.selection) {
							// Try to extract the blueprint at the given path to validate it
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
				// Continue with the route loader regardless of history saving result
			}
		}

		return result;
	},
});
