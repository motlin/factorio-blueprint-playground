import {createFileRoute} from '@tanstack/react-router';
import {useLiveQuery} from 'dexie-react-hooks';
import {z} from 'zod';

import {BlueprintLibrary, type BlueprintLibraryLocation} from '../components/library/BlueprintLibrary';
import {db} from '../storage/db';

export const librarySearchSchema = z.object({
	shelf: z.enum(['library', 'history']).optional().catch(undefined),
	book: z.string().min(1).optional().catch(undefined),
});

export const Route = createFileRoute('/library')({
	component: BlueprintLibraryRoute,
	validateSearch: librarySearchSchema,
});

function BlueprintLibraryRoute() {
	const search = Route.useSearch();
	const navigate = Route.useNavigate();
	const records = useLiveQuery(async () => {
		const [libraryRecords, historyRecords] = await Promise.all([db.listLibraryTree(), db.listHistory()]);
		return {libraryRecords, historyRecords};
	}, []);

	if (records === undefined) {
		return (
			<div className="blueprint-library__loading" role="status">
				Loading Blueprint Library…
			</div>
		);
	}

	const location: BlueprintLibraryLocation = {
		shelf: search.shelf ?? 'library',
		book: search.book,
	};

	return (
		<BlueprintLibrary
			location={location}
			libraryRecords={records.libraryRecords}
			historyRecords={records.historyRecords}
			onLocationChange={(nextLocation) => {
				void navigate({
					search: {
						shelf: nextLocation.shelf === 'library' ? undefined : nextLocation.shelf,
						book: nextLocation.book,
					},
				});
			}}
		/>
	);
}
