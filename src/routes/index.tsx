import {createFileRoute} from '@tanstack/react-router';
import {z} from 'zod';

import {BlueprintPlayground} from '../components/BlueprintPlayground';
import {type BlueprintFetchMethod, fetchBlueprint} from '../fetching/blueprintFetcher';
import {type BlueprintInfo, BlueprintWrapper} from '../parsing/BlueprintWrapper';
import {extractBlueprint} from '../parsing/blueprintParser';
import {addBlueprint} from '../state/blueprintLocalStorage';
import type {BlueprintGameData, DatabaseBlueprintType} from '../storage/db';

export interface RootSearch {
	pasted?: string;
	selection?: string;
	focusTextarea?: boolean;
	fetchType?: BlueprintFetchMethod;
}

export const searchSchema = z.object({
	pasted: z.string().optional().catch(undefined),
	selection: z.string().optional().catch(undefined),
	focusTextarea: z.boolean().optional().catch(undefined),
	fetchType: z.enum(['url', 'json', 'data', 'edit']).optional().catch(undefined),
});

export const Route = createFileRoute('/')({
	component: BlueprintPlayground,
	validateSearch: searchSchema,
	loaderDeps: ({search: {pasted, selection, fetchType}}) => ({pasted, selection, fetchType}),
	loader: async ({deps: {pasted, selection, fetchType}, context: {queryClient}}) => {
		const result = await fetchBlueprint({pasted, fetchType}, queryClient);

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
					icons: (info.icons ?? []).flatMap(({signal}) =>
						signal.name === undefined ? [] : [{type: signal.type, name: signal.name}],
					),
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

				const effectiveFetchMethod = fetchType ?? result.fetchMethod;
				await addBlueprint(result.pasted, metadata, validSelection, effectiveFetchMethod);
			} catch (error) {
				console.error('Failed to save blueprint to history:', error);
			}
		}

		return result;
	},
});
