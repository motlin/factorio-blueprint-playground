import {createLazyFileRoute} from '@tanstack/react-router';
import {useLiveQuery} from 'dexie-react-hooks';
import {useState} from 'react';

import {BlueprintHistoryTable} from '../components/history/table/BlueprintHistoryTable';
import {formatDateForExport} from '../components/history/utils/dateUtils';
import {downloadBlueprint, sanitizeFilename} from '../components/history/utils/fileUtils';
import {LoadingState} from '../components/history/views/LoadingState';
import {Button, ErrorAlert, InsetDark, InsetLight, Panel} from '../components/ui';
import {BlueprintWrapper} from '../parsing/BlueprintWrapper';
import {deserializeBlueprintNoThrow, serializeBlueprint} from '../parsing/blueprintParser';
import type {BlueprintString, BlueprintStringWithIndex, Icon} from '../parsing/types';
import {DatabaseBlueprint, db} from '../storage/db';

export const Route = createLazyFileRoute('/history')({
	component: History,
});

export function History() {
	const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set<string>());
	const [error, setError] = useState<Error | null>(null);

	const blueprints = useLiveQuery<DatabaseBlueprint[]>(
		async () => {
			try {
				const result = await db.blueprints.orderBy('metadata.lastUpdatedOn').reverse().toArray();
				return result;
			} catch (error: unknown) {
				console.error('Failed to load blueprint history:', error);
				setError(error instanceof Error ? error : new Error('Unknown error loading blueprints'));
				return [];
			}
		},
		[],
		[],
	);

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
		if (!blueprints) return;
		const blueprintArray = blueprints as DatabaseBlueprint[];
		const shaArray = blueprintArray.map((bp: DatabaseBlueprint): string => bp.metadata.sha);
		setSelectedItems(new Set<string>(shaArray));
	};

	const selectNone = (): void => {
		setSelectedItems(new Set<string>());
	};

	const downloadAsBook = (): void => {
		try {
			if (!blueprints) return;
			// Type safety for blueprint operations
			const blueprintsArray = blueprints as DatabaseBlueprint[];
			const selectedBlueprints = blueprintsArray.filter((bp: DatabaseBlueprint) =>
				selectedItems.has(bp.metadata.sha),
			);
			if (selectedBlueprints.length === 0) return;

			// If only one blueprint is selected, download it directly
			if (selectedBlueprints.length === 1) {
				const blueprint = selectedBlueprints[0];
				downloadBlueprint(blueprint.metadata.data, sanitizeFilename(blueprint.gameData.label || 'blueprint'));
				return;
			}

			const parsedBlueprints: BlueprintString[] = selectedBlueprints
				.map((bp: DatabaseBlueprint) => deserializeBlueprintNoThrow(bp.metadata.data))
				.filter((bp): bp is BlueprintString => bp !== null);

			const versions = parsedBlueprints
				.map((parsedBp) => new BlueprintWrapper(parsedBp))
				.map((wrapper) => wrapper.getVersion());

			const maxVersion: number = Math.max(0, ...versions);

			const processedBlueprints: BlueprintStringWithIndex[] = parsedBlueprints.map((parsedBp, idx) => ({
				index: idx,
				...parsedBp,
			}));

			const date = new Date();
			const formattedDate = formatDateForExport(date);

			const blueprintBookData: BlueprintString = {
				blueprint_book: {
					item: 'blueprint-book',
					label: `https://factorio-blueprint-playground.pages.dev/history Export on ${formattedDate}`,
					icons: createBookIcons(selectedBlueprints),
					blueprints: processedBlueprints,
					active_index: 0,
					version: maxVersion,
				},
			};

			const serializedBook = serializeBlueprint(blueprintBookData);
			downloadBlueprint(serializedBook, 'blueprint-history-export');
		} catch (error: unknown) {
			console.error('Failed to create blueprint book:', error);
			setError(error instanceof Error ? error : new Error('Failed to create blueprint book'));
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
		} catch (error: unknown) {
			console.error('Failed to delete blueprints:', error);
			setError(error instanceof Error ? error : new Error('Failed to delete blueprints'));
		}
	};

	const createBookIcons = (blueprints: DatabaseBlueprint[]): Icon[] => {
		const icons: Icon[] = [];

		// Take the first icon from the first 4 blueprints that have icons
		for (const bp of blueprints) {
			if (bp.gameData.icons.length > 0 && icons.length < 4) {
				icons.push({
					signal: {
						type: bp.gameData.icons[0].type || 'item',
						name: bp.gameData.icons[0].name,
					},
				});
			}

			if (icons.length >= 4) break;
		}

		if (icons.length === 0) {
			icons.push({
				signal: {
					type: 'item',
					name: 'blueprint-book',
				},
			});
		}

		return icons;
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

	if (!blueprints || blueprints.length === 0) {
		return (
			<Panel title="Blueprint History">
				<InsetLight>
					This panel will show your previously viewed blueprints. Each blueprint will be shown with its label,
					icons, and when you last viewed it. You&apos;ll be able to quickly reopen blueprints or download
					selections as a new blueprint book.
				</InsetLight>

				<InsetDark>No blueprints in history yet. Paste a blueprint in the playground to get started!</InsetDark>
			</Panel>
		);
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
				blueprints={blueprints as DatabaseBlueprint[]}
				selectedItems={selectedItems}
				toggleSelection={toggleSelection}
			/>
		</Panel>
	);
}
