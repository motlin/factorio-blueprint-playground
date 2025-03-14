import {createLazyFileRoute} from '@tanstack/react-router';
import {formatDistanceToNow, isAfter, sub, format} from 'date-fns';
import {useLiveQuery} from 'dexie-react-hooks';
import {useState} from 'react';

import {HistoryBlueprintRow} from '../components/HistoryBlueprintRow';
import {InsetDark, InsetLight, Panel, Button, ErrorAlert} from '../components/ui';
import {BlueprintWrapper} from '../parsing/BlueprintWrapper';
import {deserializeBlueprintNoThrow, serializeBlueprint} from '../parsing/blueprintParser';
import type {BlueprintString, Icon, BlueprintStringWithIndex} from '../parsing/types';
import {blueprintStorage, DatabaseBlueprint} from '../storage/blueprints';
import {db} from '../storage/db';

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

	const formatDate = (timestamp: number): string => {
		const date = new Date(timestamp);
		const now = new Date();

		// For very recent updates (less than 30 seconds ago)
		if (isAfter(date, sub(now, {seconds: 30}))) {
			return 'just now';
		}

		// For times within the past week, show relative time
		if (isAfter(date, sub(now, {days: 7}))) {
			return formatDistanceToNow(date, {addSuffix: true});
		}

		// For older times, show the date in MM/DD/YY format
		return format(date, 'MM/dd/yy');
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
			const formattedDate = format(date, 'yyyy-MM-dd HH:mm');

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
			await blueprintStorage.removeAll(selectedItemsArray);
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

	// Replace invalid filename characters and spaces
	const sanitizeFilename = (name: string): string => {
		return (
			name
				.replace(/[/?%*:|"<>]/g, '-')
				.replace(/\s+/g, '-')
				.trim() || 'blueprint'
		);
	};

	const downloadBlueprint = (blueprintString: string, filename: string): void => {
		const blob = new Blob([blueprintString], {type: 'text/plain'});
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = `${sanitizeFilename(filename)}.txt`;
		document.body.appendChild(a);
		a.click();
		document.body.removeChild(a);
		URL.revokeObjectURL(url);
	};

	if (isLoading) {
		return (
			<Panel title="Blueprint History">
				<InsetLight>Loading blueprint history...</InsetLight>
			</Panel>
		);
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

			<div className="history-grid">
				<div className="history-header"></div>
				<div className="history-header">Type</div>
				<div className="history-header">Version</div>
				<div className="history-header">Icons</div>
				<div className="history-header">Label</div>
				<div className="history-header">Source</div>
				<div className="history-header">Updated</div>
				<div className="history-header">Actions</div>

				{(blueprints as DatabaseBlueprint[]).map((blueprint: DatabaseBlueprint) => {
					const isSelected = selectedItems.has(blueprint.metadata.sha);
					return (
						<HistoryBlueprintRow
							key={blueprint.metadata.sha}
							blueprint={blueprint}
							isSelected={isSelected}
							onToggleSelection={toggleSelection}
							formatDate={formatDate}
						/>
					);
				})}
			</div>
		</Panel>
	);
}
