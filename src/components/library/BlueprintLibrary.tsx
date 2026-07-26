import {BookOpen, ChevronRight, Clock3, FolderOpen, Library} from 'lucide-react';
import {useEffect, useId, useMemo, useRef, useState} from 'react';

import type {ImportHistoryRecord, LibraryRecord} from '../../storage/db';
import {LIBRARY_ROOT_ID} from '../../storage/db';
import {
	FactorioButton,
	FactorioFrame,
	FactorioFrameDepth,
	FactorioScrollFrame,
	FactorioTitleBar,
} from '../ui/FactorioUi';

export type BlueprintLibraryShelf = 'library' | 'history';

export interface BlueprintLibraryLocation {
	shelf: BlueprintLibraryShelf;
	book?: string;
}

interface BlueprintLibraryProps {
	location: BlueprintLibraryLocation;
	libraryRecords: readonly LibraryRecord[];
	historyRecords: readonly ImportHistoryRecord[];
	onLocationChange: (location: BlueprintLibraryLocation) => void;
}

const RECORD_TYPE_LABELS: Record<LibraryRecord['gameData']['type'], string> = {
	blueprint: 'Blueprint',
	blueprint_book: 'Blueprint book',
	upgrade_planner: 'Upgrade planner',
	deconstruction_planner: 'Deconstruction planner',
};

function recordLabel(record: LibraryRecord): string {
	const label = record.gameData.label?.trim();
	return label === undefined || label === ''
		? `Untitled ${RECORD_TYPE_LABELS[record.gameData.type].toLowerCase()}`
		: label;
}

function historyLabel(record: ImportHistoryRecord): string {
	const label = record.gameData.label?.trim();
	return label === undefined || label === ''
		? `Untitled ${RECORD_TYPE_LABELS[record.gameData.type].toLowerCase()}`
		: label;
}

function compareLibraryPosition(left: LibraryRecord, right: LibraryRecord): number {
	return left.position - right.position || left.createdOn - right.createdOn;
}

interface BookLocation {
	book: LibraryRecord | undefined;
	trail: LibraryRecord[];
	valid: boolean;
}

function resolveBookLocation(records: readonly LibraryRecord[], activeBookId: string | undefined): BookLocation {
	if (activeBookId === undefined) {
		return {book: undefined, trail: [], valid: true};
	}

	const recordsById = new Map(records.map((record) => [record.id, record]));
	const book = recordsById.get(activeBookId);
	if (book?.gameData.type !== 'blueprint_book') {
		return {book: undefined, trail: [], valid: false};
	}

	const reverseTrail: LibraryRecord[] = [];
	const visited = new Set<string>();
	let current: LibraryRecord | undefined = book;
	while (current !== undefined) {
		if (visited.has(current.id) || current.gameData.type !== 'blueprint_book') {
			return {book: undefined, trail: [], valid: false};
		}
		visited.add(current.id);
		reverseTrail.push(current);
		if (current.parentId === LIBRARY_ROOT_ID) {
			return {book, trail: reverseTrail.reverse(), valid: true};
		}
		current = recordsById.get(current.parentId);
	}

	return {book: undefined, trail: [], valid: false};
}

export function BlueprintLibrary({historyRecords, libraryRecords, location, onLocationChange}: BlueprintLibraryProps) {
	const headingId = useId();
	const tabReferences = useRef<Array<HTMLButtonElement | null>>([]);
	const recordReferences = useRef(new Map<string, HTMLButtonElement>());
	const previousBookId = useRef(location.book);
	const recordsHeadingReference = useRef<HTMLHeadingElement>(null);
	const [activeRecordIndex, setActiveRecordIndex] = useState(0);
	const bookLocation = useMemo(
		() => resolveBookLocation(libraryRecords, location.book),
		[libraryRecords, location.book],
	);
	const currentParentId = bookLocation.book?.id ?? LIBRARY_ROOT_ID;
	const currentRecords = useMemo(
		() =>
			bookLocation.valid
				? libraryRecords.filter((record) => record.parentId === currentParentId).sort(compareLibraryPosition)
				: [],
		[bookLocation.valid, currentParentId, libraryRecords],
	);

	useEffect(() => {
		setActiveRecordIndex(0);
	}, [currentParentId, location.shelf]);

	useEffect(() => {
		const priorBookId = previousBookId.current;
		previousBookId.current = location.book;
		if (priorBookId === location.book || location.shelf !== 'library') {
			return;
		}

		const priorBook = libraryRecords.find((record) => record.id === priorBookId);
		if (priorBook?.parentId === currentParentId) {
			recordReferences.current.get(priorBook.id)?.focus();
			return;
		}
		recordsHeadingReference.current?.focus();
	}, [currentParentId, libraryRecords, location.book, location.shelf]);

	const changeShelf = (shelf: BlueprintLibraryShelf): void => {
		onLocationChange({...location, shelf});
	};

	const handleTabKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>, tabIndex: number): void => {
		const shelves: BlueprintLibraryShelf[] = ['library', 'history'];
		let nextIndex: number | undefined;
		if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
			nextIndex = (tabIndex - 1 + shelves.length) % shelves.length;
		} else if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
			nextIndex = (tabIndex + 1) % shelves.length;
		} else if (event.key === 'Home') {
			nextIndex = 0;
		} else if (event.key === 'End') {
			nextIndex = shelves.length - 1;
		}
		if (nextIndex === undefined) {
			return;
		}
		event.preventDefault();
		tabReferences.current[nextIndex]?.focus();
		changeShelf(shelves[nextIndex]);
	};

	const handleRecordKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>, recordIndex: number): void => {
		const currentRecord = currentRecords[recordIndex];
		let nextIndex: number | undefined;
		if (event.key === 'ArrowUp' || event.key === 'ArrowLeft') {
			nextIndex = (recordIndex - 1 + currentRecords.length) % currentRecords.length;
		} else if (event.key === 'ArrowDown' || event.key === 'ArrowRight') {
			nextIndex = (recordIndex + 1) % currentRecords.length;
		} else if (event.key === 'Home') {
			nextIndex = 0;
		} else if (event.key === 'End') {
			nextIndex = currentRecords.length - 1;
		} else if ((event.key === 'Enter' || event.key === ' ') && currentRecord.gameData.type === 'blueprint_book') {
			event.preventDefault();
			onLocationChange({shelf: 'library', book: currentRecord.id});
		} else if (event.key === 'Escape' && bookLocation.book !== undefined) {
			event.preventDefault();
			onLocationChange({
				shelf: 'library',
				book: bookLocation.book.parentId === LIBRARY_ROOT_ID ? undefined : bookLocation.book.parentId,
			});
		}
		if (nextIndex === undefined) {
			return;
		}
		event.preventDefault();
		setActiveRecordIndex(nextIndex);
		recordReferences.current.get(currentRecords[nextIndex].id)?.focus();
	};

	return (
		<FactorioFrame className="blueprint-library" depth={FactorioFrameDepth.Shallow}>
			<FactorioTitleBar className="blueprint-library__title-bar">
				<Library aria-hidden="true" />
				<h1 id={headingId}>Blueprint Library</h1>
			</FactorioTitleBar>

			<div className="blueprint-library__shelves" role="tablist" aria-label="Blueprint Library shelves">
				<FactorioButton
					ref={(button) => {
						tabReferences.current[0] = button;
					}}
					className="blueprint-library__shelf"
					role="tab"
					aria-controls="blueprint-library-library-panel"
					aria-selected={location.shelf === 'library'}
					tabIndex={location.shelf === 'library' ? 0 : -1}
					onClick={() => {
						changeShelf('library');
					}}
					onKeyDown={(event) => {
						handleTabKeyDown(event, 0);
					}}
				>
					<FolderOpen aria-hidden="true" />
					Library
				</FactorioButton>
				<FactorioButton
					ref={(button) => {
						tabReferences.current[1] = button;
					}}
					className="blueprint-library__shelf"
					role="tab"
					aria-controls="blueprint-library-history-panel"
					aria-selected={location.shelf === 'history'}
					tabIndex={location.shelf === 'history' ? 0 : -1}
					onClick={() => {
						changeShelf('history');
					}}
					onKeyDown={(event) => {
						handleTabKeyDown(event, 1);
					}}
				>
					<Clock3 aria-hidden="true" />
					History
				</FactorioButton>
			</div>

			{location.shelf === 'library' ? (
				<section
					id="blueprint-library-library-panel"
					className="blueprint-library__panel"
					role="tabpanel"
					aria-labelledby={headingId}
				>
					<nav className="blueprint-library__breadcrumbs" aria-label="Current book">
						<button
							type="button"
							aria-current={
								bookLocation.book === undefined && bookLocation.valid ? 'location' : undefined
							}
							onClick={() => {
								onLocationChange({shelf: 'library'});
							}}
						>
							Library
						</button>
						{bookLocation.trail.map((book) => (
							<span key={book.id}>
								<ChevronRight aria-hidden="true" />
								<button
									type="button"
									aria-current={book.id === bookLocation.book?.id ? 'location' : undefined}
									onClick={() => {
										onLocationChange({shelf: 'library', book: book.id});
									}}
								>
									{recordLabel(book)}
								</button>
							</span>
						))}
					</nav>

					<h2 ref={recordsHeadingReference} className="blueprint-library__location-title" tabIndex={-1}>
						{bookLocation.book === undefined ? 'Library shelf' : recordLabel(bookLocation.book)}
					</h2>

					{bookLocation.valid ? (
						currentRecords.length === 0 ? (
							<div className="blueprint-library__empty" role="status">
								<BookOpen aria-hidden="true" />
								<strong>
									{bookLocation.book === undefined ? 'Your library is empty.' : 'This book is empty.'}
								</strong>
								<span>Saved blueprints and planners will appear here.</span>
							</div>
						) : (
							<FactorioScrollFrame aria-label="Blueprint records" className="blueprint-library__records">
								<ul>
									{currentRecords.map((record, index) => {
										const isBook = record.gameData.type === 'blueprint_book';
										const label = recordLabel(record);
										return (
											<li key={record.id}>
												<button
													ref={(button) => {
														if (button === null) {
															recordReferences.current.delete(record.id);
														} else {
															recordReferences.current.set(record.id, button);
														}
													}}
													type="button"
													className="blueprint-library__record"
													aria-label={isBook ? `Open book ${label}` : label}
													aria-disabled={!isBook}
													tabIndex={index === activeRecordIndex ? 0 : -1}
													onClick={() => {
														if (isBook) {
															onLocationChange({shelf: 'library', book: record.id});
														}
													}}
													onFocus={() => {
														setActiveRecordIndex(index);
													}}
													onKeyDown={(event) => {
														handleRecordKeyDown(event, index);
													}}
												>
													<span className="blueprint-library__record-icon" aria-hidden="true">
														{isBook ? <FolderOpen /> : <BookOpen />}
													</span>
													<span>
														<strong>{label}</strong>
														<small>{RECORD_TYPE_LABELS[record.gameData.type]}</small>
													</span>
													{isBook ? <ChevronRight aria-hidden="true" /> : null}
												</button>
											</li>
										);
									})}
								</ul>
							</FactorioScrollFrame>
						)
					) : (
						<div className="blueprint-library__empty" role="status">
							<BookOpen aria-hidden="true" />
							<strong>This book is no longer in the library.</strong>
							<span>It may have been moved or deleted in another tab.</span>
							<FactorioButton
								onClick={() => {
									onLocationChange({shelf: 'library'});
								}}
							>
								Return to Library
							</FactorioButton>
						</div>
					)}
				</section>
			) : (
				<section
					id="blueprint-library-history-panel"
					className="blueprint-library__panel"
					role="tabpanel"
					aria-labelledby={headingId}
				>
					<div className="blueprint-library__history-heading">
						<div>
							<h2>Import History</h2>
							<p>Chronological imports are separate from items explicitly saved to your Library.</p>
						</div>
						<a className="factorio-button blueprint-library__history-link" href="/history">
							Open full history tools
						</a>
					</div>
					{historyRecords.length === 0 ? (
						<div className="blueprint-library__empty" role="status">
							<Clock3 aria-hidden="true" />
							<strong>No blueprints in history yet.</strong>
							<span>Paste a blueprint in the playground to capture it here.</span>
						</div>
					) : (
						<FactorioScrollFrame aria-label="Recent imports" className="blueprint-library__history">
							<ul>
								{historyRecords.map((record) => (
									<li key={record.id}>
										<strong>{historyLabel(record)}</strong>
										<span>{RECORD_TYPE_LABELS[record.gameData.type]}</span>
										<time dateTime={new Date(record.importedOn).toISOString()}>
											{new Date(record.importedOn).toLocaleString()}
										</time>
									</li>
								))}
							</ul>
						</FactorioScrollFrame>
					)}
				</section>
			)}
		</FactorioFrame>
	);
}
