import {BookOpen, Clock3, CornerUpLeft} from 'lucide-react';
import {useEffect, useId, useMemo, useRef} from 'react';

import type {ImportHistoryRecord, LibraryRecord} from '../../storage/db';
import {LIBRARY_ROOT_ID} from '../../storage/db';
import {
	FactorioButton,
	FactorioFrame,
	FactorioFrameDepth,
	FactorioScrollFrame,
	FactorioTitleBar,
} from '../ui/FactorioUi';
import {BlueprintRecordViews, type BlueprintRecordViewsHandle} from './BlueprintRecordViews';
import {blueprintRecordLabel} from './blueprintRecordModel';

export type BlueprintLibraryShelf = 'library' | 'history';

export interface BlueprintLibraryLocation {
	shelf: BlueprintLibraryShelf;
	book?: string;
}

interface BlueprintLibraryShelfTab {
	shelf: BlueprintLibraryShelf;
	label: string;
	panelId: string;
	sourceShelf: string;
	tabId: string;
	websiteShelf: string;
}

const BLUEPRINT_LIBRARY_SHELF_TABS = [
	{
		shelf: 'library',
		label: 'My blueprints',
		panelId: 'blueprint-library-library-panel',
		sourceShelf: 'private-shelf',
		tabId: 'blueprint-library-library-tab',
		websiteShelf: 'Library',
	},
	{
		shelf: 'history',
		label: 'Import history',
		panelId: 'blueprint-library-history-panel',
		sourceShelf: 'website-only',
		tabId: 'blueprint-library-history-tab',
		websiteShelf: 'History',
	},
] as const satisfies readonly BlueprintLibraryShelfTab[];

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
	return blueprintRecordLabel(record);
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

interface BookNavigationEntry {
	bookId: string | undefined;
	current: boolean;
	depth: number;
	label: string;
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

function bookNavigationEntries(bookLocation: BookLocation): BookNavigationEntry[] {
	const rootEntry = {
		bookId: undefined,
		current: bookLocation.valid && bookLocation.book === undefined,
		depth: 0,
		label: 'My blueprints',
	};
	return [
		rootEntry,
		...bookLocation.trail.map((book, index) => ({
			bookId: book.id,
			current: book.id === bookLocation.book?.id,
			depth: index + 1,
			label: recordLabel(book),
		})),
	];
}

export function BlueprintLibrary({historyRecords, libraryRecords, location, onLocationChange}: BlueprintLibraryProps) {
	const headingId = useId();
	const tabReferences = useRef<Array<HTMLButtonElement | null>>([]);
	const bookNavigationReferences = useRef<Array<HTMLButtonElement | null>>([]);
	const recordViewsReference = useRef<BlueprintRecordViewsHandle>(null);
	const previousBookLocation = useRef<BookLocation | undefined>(undefined);
	const recordsHeadingReference = useRef<HTMLHeadingElement>(null);
	const bookLocation = useMemo(
		() => resolveBookLocation(libraryRecords, location.book),
		[libraryRecords, location.book],
	);
	const navigationEntries = useMemo(() => bookNavigationEntries(bookLocation), [bookLocation]);
	const currentParentId = bookLocation.book?.id ?? LIBRARY_ROOT_ID;
	const currentRecords = useMemo(
		() => (bookLocation.valid ? libraryRecords.filter((record) => record.parentId === currentParentId) : []),
		[bookLocation.valid, currentParentId, libraryRecords],
	);
	const currentLocationLabel = bookLocation.valid
		? bookLocation.book === undefined
			? 'Library shelf'
			: recordLabel(bookLocation.book)
		: 'Unavailable book';

	useEffect(() => {
		const priorLocation = previousBookLocation.current;
		previousBookLocation.current = bookLocation;
		if (
			priorLocation === undefined ||
			priorLocation.book?.id === bookLocation.book?.id ||
			location.shelf !== 'library'
		) {
			return;
		}

		const restoredChild = priorLocation.trail.find((book) => book.parentId === currentParentId);
		if (restoredChild !== undefined) {
			recordViewsReference.current?.focusRecord(restoredChild.id);
			return;
		}
		recordsHeadingReference.current?.focus();
	}, [bookLocation, currentParentId, location.shelf]);

	const changeShelf = (shelf: BlueprintLibraryShelf): void => {
		onLocationChange({...location, shelf});
	};

	const handleTabKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>, tabIndex: number): void => {
		let nextIndex: number | undefined;
		if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
			nextIndex = (tabIndex - 1 + BLUEPRINT_LIBRARY_SHELF_TABS.length) % BLUEPRINT_LIBRARY_SHELF_TABS.length;
		} else if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
			nextIndex = (tabIndex + 1) % BLUEPRINT_LIBRARY_SHELF_TABS.length;
		} else if (event.key === 'Home') {
			nextIndex = 0;
		} else if (event.key === 'End') {
			nextIndex = BLUEPRINT_LIBRARY_SHELF_TABS.length - 1;
		}
		if (nextIndex === undefined) {
			return;
		}
		event.preventDefault();
		tabReferences.current[nextIndex]?.focus();
		changeShelf(BLUEPRINT_LIBRARY_SHELF_TABS[nextIndex].shelf);
	};

	const navigateToBook = (bookId: string | undefined): void => {
		onLocationChange(bookId === undefined ? {shelf: 'library'} : {shelf: 'library', book: bookId});
	};

	const handleBookNavigationKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>, entryIndex: number): void => {
		let nextIndex: number | undefined;
		if (event.key === 'ArrowUp') {
			nextIndex = Math.max(0, entryIndex - 1);
		} else if (event.key === 'ArrowDown') {
			nextIndex = Math.min(navigationEntries.length - 1, entryIndex + 1);
		} else if (event.key === 'Home') {
			nextIndex = 0;
		} else if (event.key === 'End') {
			nextIndex = navigationEntries.length - 1;
		} else if (event.key === 'ArrowLeft' || event.key === 'Escape') {
			const parentEntry = navigationEntries[Math.max(0, navigationEntries.length - 2)];
			if (!navigationEntries[entryIndex].current || parentEntry.current) {
				return;
			}
			event.preventDefault();
			navigateToBook(parentEntry.bookId);
			return;
		}
		if (nextIndex === undefined || nextIndex === entryIndex) {
			return;
		}
		event.preventDefault();
		bookNavigationReferences.current[nextIndex]?.focus();
	};

	return (
		<FactorioFrame
			className="blueprint-library"
			depth={FactorioFrameDepth.Shallow}
			data-factorio-style="inset_frame_container_frame"
			role="region"
			aria-labelledby={headingId}
		>
			<FactorioTitleBar className="blueprint-library__title-bar" data-factorio-style="frame_header_flow">
				<h1 id={headingId}>Blueprint Library</h1>
			</FactorioTitleBar>

			<FactorioFrame
				className="blueprint-library__inside"
				depth={FactorioFrameDepth.Deep}
				data-factorio-style="inside_deep_frame"
			>
				<div
					className="blueprint-library__shelves"
					data-factorio-style="tabbed_pane_with_no_side_padding"
					role="tablist"
					aria-label="Blueprint Library shelves"
					aria-orientation="horizontal"
				>
					{BLUEPRINT_LIBRARY_SHELF_TABS.map((shelfTab, tabIndex) => (
						<button
							key={shelfTab.shelf}
							ref={(button) => {
								tabReferences.current[tabIndex] = button;
							}}
							id={shelfTab.tabId}
							type="button"
							className="blueprint-library__shelf"
							data-factorio-style="tab"
							data-source-shelf={shelfTab.sourceShelf}
							data-website-shelf={shelfTab.websiteShelf}
							title={`${shelfTab.websiteShelf} shelf`}
							role="tab"
							aria-controls={shelfTab.panelId}
							aria-selected={location.shelf === shelfTab.shelf}
							tabIndex={location.shelf === shelfTab.shelf ? 0 : -1}
							onClick={() => {
								changeShelf(shelfTab.shelf);
							}}
							onKeyDown={(event) => {
								handleTabKeyDown(event, tabIndex);
							}}
						>
							{shelfTab.label}
						</button>
					))}
				</div>

				{location.shelf === 'library' ? (
					<section
						id="blueprint-library-library-panel"
						className="blueprint-library__panel"
						role="tabpanel"
						aria-labelledby="blueprint-library-library-tab"
					>
						<nav
							className="blueprint-library__book-navigation"
							aria-label="Current book"
							data-factorio-source="BlueprintBookGui::buildNavigationPart"
						>
							{navigationEntries.map((entry, entryIndex) => (
								<div
									key={entry.bookId ?? LIBRARY_ROOT_ID}
									className="blueprint-library__book-navigation-row"
									data-book-depth={entry.depth}
									style={{paddingInlineStart: Math.min(entry.depth, 6) * 18}}
								>
									<button
										ref={(button) => {
											bookNavigationReferences.current[entryIndex] = button;
										}}
										type="button"
										className="blueprint-library__book-navigation-button"
										data-factorio-style={
											entry.current
												? 'mini_button_aligned_to_text_vertically_when_centered'
												: 'mini_button_aligned_to_text_vertically'
										}
										aria-current={entry.current ? 'location' : undefined}
										aria-label={
											entry.current
												? `Current book: ${entry.label}`
												: `Go to book: ${entry.label}`
										}
										aria-pressed={entry.current}
										onClick={() => {
											if (!entry.current) {
												navigateToBook(entry.bookId);
											}
										}}
										onKeyDown={(event) => {
											handleBookNavigationKeyDown(event, entryIndex);
										}}
									>
										<CornerUpLeft aria-hidden="true" />
									</button>
									<span className="blueprint-library__book-navigation-label">{entry.label}</span>
									{entry.current ? (
										<span className="blueprint-library__book-navigation-current">Current book</span>
									) : null}
								</div>
							))}
						</nav>

						<header className="blueprint-library__location-heading">
							<h2
								ref={recordsHeadingReference}
								className="blueprint-library__location-title"
								tabIndex={-1}
							>
								{currentLocationLabel}
							</h2>
							<span>
								{currentRecords.length.toString()} {currentRecords.length === 1 ? 'item' : 'items'} in{' '}
								{bookLocation.book === undefined ? 'this shelf' : 'this book'}
							</span>
						</header>

						{bookLocation.valid ? (
							currentRecords.length === 0 ? (
								<div className="blueprint-library__empty" role="status">
									<BookOpen aria-hidden="true" />
									<strong>
										{bookLocation.book === undefined
											? 'Your library is empty.'
											: 'This book is empty.'}
									</strong>
									<span>Saved blueprints and planners will appear here.</span>
								</div>
							) : (
								<BlueprintRecordViews
									ref={recordViewsReference}
									aria-label="Blueprint records"
									records={currentRecords}
									compareRecords={compareLibraryPosition}
									isRecordActionable={(record) => record.gameData.type === 'blueprint_book'}
									onActivate={(record) => {
										onLocationChange({shelf: 'library', book: record.id});
									}}
									onEscape={
										bookLocation.book === undefined
											? undefined
											: () => {
													onLocationChange({
														shelf: 'library',
														book:
															bookLocation.book?.parentId === LIBRARY_ROOT_ID
																? undefined
																: bookLocation.book?.parentId,
													});
												}
									}
								/>
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
						aria-labelledby="blueprint-library-history-tab"
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
		</FactorioFrame>
	);
}
