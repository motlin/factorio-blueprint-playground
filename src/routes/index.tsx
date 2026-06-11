import {createFileRoute} from '@tanstack/react-router';
import {z} from 'zod';

import {BlueprintPlayground} from '../components/BlueprintPlayground';
import {fetchBlueprint} from '../fetching/blueprintFetcher';
import {type BlueprintInfo, BlueprintWrapper} from '../parsing/BlueprintWrapper';
import {extractBlueprint} from '../parsing/blueprintParser';
import {addBlueprint} from '../state/blueprintLocalStorage';
import type {BlueprintGameData, DatabaseBlueprintType} from '../storage/db';

/**
 * - pasted: Whatever was pasted, a blueprint string, json, or url
 * - selection: Optional path within a blueprint book (e.g. "1.2.3")
 * - focusTextarea: Whether to focus the textarea when the component mounts
 */
export interface RootSearch {
	pasted?: string;
	selection?: string;
	focusTextarea?: boolean;
}

export const searchSchema = z.object({
	pasted: z.string().optional().catch(undefined),
	selection: z.string().optional().catch(undefined),
	focusTextarea: z.boolean().optional().catch(undefined),
});

export const Route = createFileRoute('/')({
	component: BlueprintPlayground,
	validateSearch: searchSchema,
	loaderDeps: ({search: {pasted, selection}}) => ({pasted, selection}),
	loader: async ({deps: {pasted, selection}, context: {queryClient}}) => {
		const result = await fetchBlueprint({pasted}, queryClient);

		// If successful, save to history
		if (result?.success === true) {
			try {
				const wrapper = new BlueprintWrapper(result.blueprintString);
				const info = wrapper.getInfo();
				const typeMap: Record<BlueprintInfo['type'], DatabaseBlueprintType> = {
					blueprint: 'blueprint',
					'blueprint-book': 'blueprint_book',
					'upgrade-planner': 'upgrade_planner',
					'deconstruction-planner': 'deconstruction_planner',
				};
				const type = typeMap[info.type];

				const metadata: Omit<BlueprintGameData, 'createdOn' | 'lastUpdatedOn'> = {
					type,
					label: info.label,
					description: info.description,
					gameVersion: info.version.toString(),
					icons: (info.icons ?? []).map((icon) => ({
						type: icon.signal.type,
						name: icon.signal.name,
					})),
				};

				let validSelection: string | undefined;
				try {
					if (selection != null && selection !== '') {
						extractBlueprint(result.blueprintString, selection);
						validSelection = selection;
					}
				} catch (error) {
					console.warn('Invalid selection path, not saving to history:', error);
				}

				await addBlueprint(result.pasted, metadata, validSelection, result.fetchMethod);
			} catch (error) {
				console.error('Failed to save blueprint to history:', error);
			}
		}

		return result;
	},
});
