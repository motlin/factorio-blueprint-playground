import {createLazyFileRoute, Link} from '@tanstack/react-router';
import {formatDistanceToNow, isAfter, sub, format} from 'date-fns';
import {useState, useEffect} from 'preact/hooks';

import {FactorioIcon} from '../components/FactorioIcon';
import {RichText} from '../components/RichText';
import {Version} from '../components/Version';
import {InsetDark, InsetLight, Panel, Button, ButtonGreen, ErrorAlert} from '../components/ui';
import {BlueprintWrapper} from '../parsing/BlueprintWrapper';
import {deserializeBlueprint, serializeBlueprint} from '../parsing/blueprintParser';
import type {BlueprintString, Icon, BlueprintStringWithIndex} from '../parsing/types';
import {blueprintStorage, DatabaseBlueprint} from '../storage/blueprints';

export const Route = createLazyFileRoute('/history')({
	component: History,
});

export function History() {
	const [blueprints, setBlueprints] = useState<DatabaseBlueprint[]>([]);
	const [selectedItems, setSelectedItems] = useState<Set<number>>(new Set());
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<Error | null>(null);

	const loadBlueprints = async () => {
		try {
			setIsLoading(true);
			const blueprintList = await blueprintStorage.list();
			setBlueprints(blueprintList);
		} catch (error) {
			console.error('Failed to load blueprint history:', error);
			setError(error instanceof Error ? error : new Error('Unknown error loading blueprints'));
		} finally {
			setIsLoading(false);
		}
	};

	useEffect(() => {
		void loadBlueprints();
	}, []);

	const toggleSelection = (createdOn: number) => {
		setSelectedItems((prev) => {
			const newSelection = new Set(prev);
			if (newSelection.has(createdOn)) {
				newSelection.delete(createdOn);
			} else {
				newSelection.add(createdOn);
			}
			return newSelection;
		});
	};

	const selectAll = () => {
		setSelectedItems(new Set(blueprints.map((bp) => bp.metadata.createdOn)));
	};

	const selectNone = () => {
		setSelectedItems(new Set());
	};

	const formatDate = (timestamp: number) => {
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

	const downloadAsBook = () => {
		try {
			// Get selected blueprints
			const selectedBlueprints = blueprints.filter((bp) => selectedItems.has(bp.metadata.createdOn));
			if (selectedBlueprints.length === 0) return;

			// If only one blueprint is selected, download it directly
			if (selectedBlueprints.length === 1) {
				downloadBlueprint(
					selectedBlueprints[0].metadata.data,
					sanitizeFilename(selectedBlueprints[0].gameData.label || 'blueprint'),
				);
				return;
			}

			// Process all blueprints first to build the array and find max version
			const processedBlueprints: BlueprintStringWithIndex[] = [];
			let maxVersion = 0;

			const parsedBlueprints: BlueprintString[] = selectedBlueprints
				.map((bp) => {
					try {
						return deserializeBlueprint(bp.metadata.data);
					} catch (error) {
						console.error('Failed to parse blueprint:', error);
						return null;
					}
				})
				.filter((bp): bp is BlueprintString => bp !== null);

			// Get the maximum version from all blueprints
			const versions = parsedBlueprints
				.map((parsedBp) => new BlueprintWrapper(parsedBp))
				.map((wrapper) => wrapper.getVersion());

			maxVersion = versions.length > 0 ? Math.max(...versions) : 0;

			// TODO 2025-03-16: Convert this from forEach to map
			parsedBlueprints.forEach((parsedBp, idx) => {
				processedBlueprints.push({
					index: idx,
					...parsedBp,
				});
			});

			// Create a blueprint book with the selected blueprints
			const date = new Date();
			const formattedDate = format(date, 'yyyy-MM-dd HH:mm');

			const blueprintBookData: BlueprintString = {
				blueprint_book: {
					item: 'blueprint-book',
					label: `https://factorio-blueprint-playground.pages.dev/history Export on ${formattedDate}`,
					icons: createBookIcons(selectedBlueprints),
					blueprints: processedBlueprints,
					active_index: 0,
					version: maxVersion || 0,
				},
			};

			const serializedBook = serializeBlueprint(blueprintBookData);
			downloadBlueprint(serializedBook, 'blueprint-history-export');
		} catch (error) {
			console.error('Failed to create blueprint book:', error);
			setError(error instanceof Error ? error : new Error('Failed to create blueprint book'));
		}
	};

	const deleteSelected = async () => {
		if (selectedItems.size === 0) return;

		const confirmed = window.confirm(
			`Are you sure you want to delete ${selectedItems.size} blueprint${selectedItems.size > 1 ? 's' : ''} from history?`,
		);

		if (!confirmed) return;

		try {
			setIsLoading(true);

			// Delete each selected blueprint
			for (const createdOn of selectedItems) {
				await blueprintStorage.remove(createdOn);
			}

			// Clear selection and reload the list
			setSelectedItems(new Set());
			await loadBlueprints();
		} catch (error) {
			console.error('Failed to delete blueprints:', error);
			setError(error instanceof Error ? error : new Error('Failed to delete blueprints'));
		} finally {
			setIsLoading(false);
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

		// If we don't have any icons yet, use a default
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

	const sanitizeFilename = (name: string): string => {
		// Replace invalid filename characters and spaces
		return (
			name
				.replace(/[/?%*:|"<>]/g, '-')
				.replace(/\s+/g, '-')
				.trim() || 'blueprint'
		);
	};

	const downloadBlueprint = (blueprintString: string, filename: string) => {
		// Create a blob and download it
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
					<Button onClick={() => setError(null)}>Dismiss</Button>
					<Button onClick={() => void loadBlueprints()} style={{marginLeft: '0.5rem'}}>
						Try Again
					</Button>
				</div>
			</Panel>
		);
	}

	if (blueprints.length === 0) {
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
			<div style={{marginBottom: '1rem'}}>
				<Button
					disabled={selectedItems.size === 0}
					onClick={downloadAsBook}
					style={{marginRight: '0.5rem'}}
					data-testid="download-button"
				>
					Download Selected as Book
				</Button>
				<Button
					disabled={selectedItems.size === 0}
					onClick={() => void deleteSelected()}
					style={{marginRight: '0.5rem'}}
					data-testid="delete-button"
				>
					Delete Selected
				</Button>
				<Button onClick={selectAll} style={{marginRight: '0.5rem'}}>
					Select All
				</Button>
				<Button onClick={selectNone} disabled={selectedItems.size === 0}>
					Clear Selection
				</Button>
			</div>

			<div className="history-grid">
				{/* Headers */}
				<div className="history-header"></div>
				<div className="history-header">Type</div>
				<div className="history-header">Version</div>
				<div className="history-header">Icons</div>
				<div className="history-header">Label</div>
				<div className="history-header">Updated</div>
				<div className="history-header">Actions</div>

				{/* Blueprint rows */}
				{blueprints.map((blueprint) => (
					<div
						key={blueprint.metadata.createdOn}
						className={`history-blueprint-item ${selectedItems.has(blueprint.metadata.createdOn) ? 'selected' : ''}`}
						onClick={() => toggleSelection(blueprint.metadata.createdOn)}
						data-testid="blueprint-item"
					>
						{/* Checkbox column */}
						<div className="history-checkbox-container">
							<input
								type="checkbox"
								checked={selectedItems.has(blueprint.metadata.createdOn)}
								onChange={() => toggleSelection(blueprint.metadata.createdOn)}
								onClick={(e: Event) => {
									(e as {stopPropagation: () => void}).stopPropagation();
								}}
								data-testid="blueprint-checkbox"
							/>
						</div>

						{/* Type column */}
						<div className="history-type-container">
							<FactorioIcon
								icon={{type: 'item', name: blueprint.gameData.type.replace(/_/g, '-')}}
								size="small"
							/>
						</div>

						{/* Version column */}
						<div className="history-version-container">
							{blueprint.gameData.gameVersion ? (
								<Version number={Number(blueprint.gameData.gameVersion)} />
							) : (
								<span>Unknown</span>
							)}
						</div>

						{/* Icons column */}
						<div className="history-icons-container">
							{blueprint.gameData.icons.map((icon, index) => (
								<FactorioIcon
									key={index}
									icon={{type: icon.type || 'item', name: icon.name}}
									size="small"
								/>
							))}
							{blueprint.gameData.icons.length === 0 && <span style={{opacity: 0.5}}>No icon</span>}
						</div>

						{/* Label column */}
						<div className="history-label-container">
							{blueprint.gameData.label ? (
								<RichText text={blueprint.gameData.label} iconSize="small" />
							) : (
								<span style={{opacity: 0.5}}>No label</span>
							)}
						</div>

						{/* Updated column (with created hover text) */}
						<div className="history-dates">
							<span
								title={`Created: ${new Date(blueprint.metadata.createdOn).toLocaleString()}
Updated: ${new Date(blueprint.metadata.lastUpdatedOn).toLocaleString()}`}
							>
								{formatDate(blueprint.metadata.lastUpdatedOn)}
							</span>
						</div>

						{/* Actions column */}
						<div className="history-action-buttons">
							<Link
								to="/"
								search={{pasted: blueprint.metadata.data, selection: blueprint.metadata.selection}}
								style={{textDecoration: 'none'}}
							>
								<ButtonGreen data-testid="blueprint-open" className="history-button-small">
									Open
								</ButtonGreen>
							</Link>
						</div>
					</div>
				))}
			</div>
		</Panel>
	);
}
