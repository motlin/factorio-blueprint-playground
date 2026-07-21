import {createLazyFileRoute} from '@tanstack/react-router';
import {useLiveQuery} from 'dexie-react-hooks';
import {useState} from 'react';

import {BlueprintHistoryTable} from '../components/history/table/BlueprintHistoryTable';
import {formatDateForExport} from '../components/history/utils/dateUtils';
import {downloadBlueprint, sanitizeFilename} from '../components/history/utils/fileUtils';
import {EmptyHistoryState} from '../components/history/views/EmptyHistoryState';
import {LoadingState} from '../components/history/views/LoadingState';
import {Button} from '../components/ui/Button';
import {ErrorAlert} from '../components/ui/ErrorAlert';
import {Panel} from '../components/ui/Panel';
import {logger} from '../lib/sentry';
import {deserializeBlueprintNoThrow, serializeBlueprint} from '../parsing/blueprintParser';
import type {BlueprintString} from '../parsing/types';
import {type DatabaseBlueprint, db} from '../storage/db';
import {makeBook} from '../transform/bookOps';

export const Route = createLazyFileRoute('/history')({
	component: History,
});

function History() {
	const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set<string>());
	const [error, setError] = useState<Error | null>(null);

	const blueprints = useLiveQuery<DatabaseBlueprint[]>(async () => {
		try {
			const result = await db.blueprints.orderBy('metadata.lastUpdatedOn').reverse().toArray();
			return result;
		} catch (loadError: unknown) {
			logger.error(
				'Failed to load blueprint history',
				loadError instanceof Error ? loadError : new Error(String(loadError)),
				{
					context: 'History.useLiveQuery',
				},
			);
			setError(loadError instanceof Error ? loadError : new Error('Unknown error loading blueprints'));
			return [];
		}
	}, []);

	const isLoading = blueprints === undefined;

	const toggleSelection = (sha: string): void => {
		setSelectedItems((prev: Set<string>) => {
			const newSelection = new Set<string>(prev);
			if (newSelection.has(sha)) {
				newSelection.delete(sha);
			} else {
				newSelection.add(sha);
			}
			return newSelection;
		});
	};

	const selectAll = (): void => {
		if (blueprints == null) return;
		const shaArray = blueprints.map((bp: DatabaseBlueprint): string => bp.metadata.sha);
		setSelectedItems(new Set<string>(shaArray));
	};

	const selectNone = (): void => {
		setSelectedItems(new Set<string>());
	};

	const downloadAsBook = (): void => {
		try {
			if (blueprints == null) return;
			const selectedBlueprints = blueprints.filter((bp: DatabaseBlueprint) => selectedItems.has(bp.metadata.sha));
			if (selectedBlueprints.length === 0) return;

			// If only one blueprint is selected, download it directly
			if (selectedBlueprints.length === 1) {
				const blueprint = selectedBlueprints[0];
				const label = blueprint.gameData.label;
				const filename = label != null && label !== '' ? label : 'blueprint';
				downloadBlueprint(blueprint.metadata.data, sanitizeFilename(filename));
				return;
			}

			const parsedBlueprints: BlueprintString[] = selectedBlueprints
				.map((bp: DatabaseBlueprint) => deserializeBlueprintNoThrow(bp.metadata.data))
				.filter((bp): bp is BlueprintString => bp !== null);

			const date = new Date();
			const formattedDate = formatDateForExport(date);
			const blueprintBookData = makeBook(
				parsedBlueprints,
				`https://factorio-blueprint-playground.pages.dev/history Export on ${formattedDate}`,
			);

			const serializedBook = serializeBlueprint(blueprintBookData);
			downloadBlueprint(serializedBook, 'blueprint-history-export');
		} catch (bookError: unknown) {
			logger.error(
				'Failed to create blueprint book',
				bookError instanceof Error ? bookError : new Error(String(bookError)),
				{
					context: 'History.createBlueprintBook',
					selectedCount: selectedItems.size,
				},
			);
			setError(bookError instanceof Error ? bookError : new Error('Failed to create blueprint book'));
		}
	};

	const deleteSelected = async (): Promise<void> => {
		const size: number = selectedItems.size;
		if (size === 0) return;

		const confirmed = window.confirm(
			`Are you sure you want to delete ${size} blueprint${size > 1 ? 's' : ''} from history?`,
		);

		if (!confirmed) return;

		try {
			const selectedItemsArray: string[] = Array.from(selectedItems);
			await db.removeBulkBlueprints(selectedItemsArray);
			setSelectedItems(new Set<string>());
		} catch (deleteError: unknown) {
			logger.error(
				'Failed to delete blueprints',
				deleteError instanceof Error ? deleteError : new Error(String(deleteError)),
				{
					context: 'History.deleteSelected',
					selectedCount: selectedItems.size,
					selectedItems: Array.from(selectedItems),
				},
			);
			setError(deleteError instanceof Error ? deleteError : new Error('Failed to delete blueprints'));
		}
	};

	if (isLoading) {
		return <LoadingState />;
	}

	if (error) {
		return (
			<Panel title="Blueprint History">
				<ErrorAlert error={error} />
				<div style={{marginTop: '1rem'}}>
					<Button
						onClick={() => {
							setError(null);
						}}
					>
						Dismiss
					</Button>
				</div>
			</Panel>
		);
	}

	if (blueprints.length === 0) {
		return <EmptyHistoryState />;
	}

	return (
		<Panel title="Blueprint History">
			<div>
				<Button disabled={selectedItems.size === 0} onClick={downloadAsBook} data-testid="download-button">
					Download Selected as Book
				</Button>
				<Button
					disabled={selectedItems.size === 0}
					onClick={() => void deleteSelected()}
					data-testid="delete-button"
				>
					Delete Selected
				</Button>
				<Button onClick={selectAll}>Select All</Button>
				<Button onClick={selectNone} disabled={selectedItems.size === 0}>
					Clear Selection
				</Button>
			</div>

			<BlueprintHistoryTable
				blueprints={blueprints}
				selectedItems={selectedItems}
				toggleSelection={toggleSelection}
			/>
		</Panel>
	);
}
