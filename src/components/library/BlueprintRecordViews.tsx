import {ChevronRight, Grid2X2, Grid3X3, List} from 'lucide-react';
import {
	useEffect,
	useId,
	useImperativeHandle,
	useMemo,
	useRef,
	useState,
	useSyncExternalStore,
	type CSSProperties,
	type KeyboardEvent,
	type MouseEvent,
	type Ref,
} from 'react';

import gameUiSpec from '../../generated/game-ui-spec.json';
import {FactorioIcon} from '../core/icons/FactorioIcon';
import {RichText} from '../core/text/RichText';
import {
	FactorioButton,
	FactorioButtonKind,
	FactorioInventorySlot,
	FactorioScrollFrame,
	FactorioTooltip,
	FactorioTooltipPlacement,
} from '../ui/FactorioUi';
import {
	BLUEPRINT_RECORD_TYPE_LABELS,
	BLUEPRINT_RECORD_VIEW_STORAGE_KEY,
	BlueprintRecordViewMode,
	blueprintRecordLabel,
	filterAndSortBlueprintRecords,
	type BlueprintRecordModel,
} from './blueprintRecordModel';

export interface BlueprintRecordViewsHandle {
	focusRecord: (recordId: string) => void;
}

interface BlueprintRecordViewsProps<RecordModel extends BlueprintRecordModel> {
	'aria-label': string;
	compareRecords?: (left: RecordModel, right: RecordModel) => number;
	initialActiveRecordId?: string;
	isRecordActionable?: (record: RecordModel) => boolean;
	onActivate: (record: RecordModel) => void;
	onAlternateActivate?: (record: RecordModel) => void;
	onEscape?: () => void;
	records: readonly RecordModel[];
	recordsWhenSearchEmpty?: readonly RecordModel[];
	recordInstructionsId?: string;
	ref?: Ref<BlueprintRecordViewsHandle>;
	searchLabel?: string;
	searchResultNoun?: string;
}

interface BlueprintRecordItemProps<RecordModel extends BlueprintRecordModel> {
	active: boolean;
	actionable: boolean;
	buttonRef: (button: HTMLButtonElement | null) => void;
	onActivate: () => void;
	onAlternateActivate?: () => void;
	onFocus: () => void;
	onKeyDown: (event: KeyboardEvent<HTMLButtonElement>) => void;
	record: RecordModel;
	recordInstructionsId?: string;
	viewMode: BlueprintRecordViewMode;
}

const RECORD_TYPE_ICON_NAMES: Record<BlueprintRecordModel['gameData']['type'], string> = {
	blueprint: 'blueprint',
	blueprint_book: 'blueprint-book',
	upgrade_planner: 'upgrade-planner',
	deconstruction_planner: 'deconstruction-planner',
};

const VIEW_OPTIONS = [
	{icon: List, label: 'List view', mode: BlueprintRecordViewMode.List, sprite: 'list_view'},
	{icon: Grid2X2, label: 'Grid view', mode: BlueprintRecordViewMode.Grid, sprite: 'grid_view'},
	{icon: Grid3X3, label: 'Slots view', mode: BlueprintRecordViewMode.Slots, sprite: 'slots_view'},
] as const;

interface BlueprintGridStyle extends CSSProperties {
	'--blueprint-record-grid-columns': number;
	'--blueprint-record-grid-horizontal-spacing': string;
	'--blueprint-record-grid-vertical-spacing': string;
	'--blueprint-record-label-bottom-margin': string;
	'--blueprint-record-label-height': string;
	'--blueprint-record-label-top-margin': string;
	'--blueprint-record-slot-padding': string;
	'--blueprint-record-slot-size': string;
}

interface BlueprintSlotsStyle extends CSSProperties {
	'--blueprint-record-small-slot-columns': number;
	'--blueprint-record-small-slot-horizontal-spacing': string;
	'--blueprint-record-small-slot-size': string;
	'--blueprint-record-small-slot-vertical-spacing': string;
}

const blueprintGridStyle: BlueprintGridStyle = {
	'--blueprint-record-grid-columns': gameUiSpec.utilityConstants.blueprintBigSlotsPerRow,
	'--blueprint-record-grid-horizontal-spacing': `${gameUiSpec.styles.defaultTableHorizontalSpacing.toString()}px`,
	'--blueprint-record-grid-vertical-spacing': `${gameUiSpec.styles.defaultTableVerticalSpacing.toString()}px`,
	'--blueprint-record-label-bottom-margin': `${gameUiSpec.styles.labelUnderWidgetBottomMargin.toString()}px`,
	'--blueprint-record-label-height': `${gameUiSpec.styles.labelUnderWidgetHeight.toString()}px`,
	'--blueprint-record-label-top-margin': `${gameUiSpec.styles.labelUnderWidgetTopMargin.toString()}px`,
	'--blueprint-record-slot-padding': `${gameUiSpec.styles.blueprintRecordSlotPadding.toString()}px`,
	'--blueprint-record-slot-size': `${gameUiSpec.styles.blueprintRecordSlotSize.toString()}px`,
};

const blueprintSlotsStyle: BlueprintSlotsStyle = {
	'--blueprint-record-small-slot-columns': gameUiSpec.utilityConstants.blueprintSmallSlotsPerRow,
	'--blueprint-record-small-slot-horizontal-spacing': `${gameUiSpec.styles.filterSlotHorizontalSpacing.toString()}px`,
	'--blueprint-record-small-slot-size': `${gameUiSpec.styles.slotSize.toString()}px`,
	'--blueprint-record-small-slot-vertical-spacing': `${gameUiSpec.styles.filterSlotVerticalSpacing.toString()}px`,
};

interface BlueprintViewStorage {
	getItem: (key: string) => string | null;
	setItem: (key: string, value: string) => void;
}

const viewModeListeners = new Set<() => void>();

function isBlueprintRecordViewMode(value: string | null): value is BlueprintRecordViewMode {
	return Object.values(BlueprintRecordViewMode).some((mode) => mode === value);
}

function isBlueprintViewStorage(value: unknown): value is BlueprintViewStorage {
	return (
		typeof value === 'object' &&
		value !== null &&
		'getItem' in value &&
		typeof value.getItem === 'function' &&
		'setItem' in value &&
		typeof value.setItem === 'function'
	);
}

function storedViewMode(): BlueprintRecordViewMode {
	const localStorage = getLocalStorage();
	if (localStorage === undefined) {
		return BlueprintRecordViewMode.List;
	}
	const storedViewMode = localStorage.getItem(BLUEPRINT_RECORD_VIEW_STORAGE_KEY);
	return isBlueprintRecordViewMode(storedViewMode) ? storedViewMode : BlueprintRecordViewMode.List;
}

function getLocalStorage(): BlueprintViewStorage | undefined {
	if (typeof window === 'undefined') {
		return undefined;
	}
	const localStorage: unknown = Reflect.get(window, 'localStorage');
	return isBlueprintViewStorage(localStorage) ? localStorage : undefined;
}

function subscribeToViewMode(listener: () => void): () => void {
	const handleStorage = (event: StorageEvent): void => {
		if (event.key === null || event.key === BLUEPRINT_RECORD_VIEW_STORAGE_KEY) {
			listener();
		}
	};
	viewModeListeners.add(listener);
	window.addEventListener('storage', handleStorage);
	return () => {
		viewModeListeners.delete(listener);
		window.removeEventListener('storage', handleStorage);
	};
}

function persistViewMode(viewMode: BlueprintRecordViewMode): void {
	if (storedViewMode() === viewMode) {
		return;
	}
	getLocalStorage()?.setItem(BLUEPRINT_RECORD_VIEW_STORAGE_KEY, viewMode);
	for (const listener of viewModeListeners) {
		listener();
	}
}

function recordAccessibleName(record: BlueprintRecordModel, actionable: boolean): string {
	const label = blueprintRecordLabel(record);
	return actionable && record.gameData.type === 'blueprint_book' ? `Open book ${label}` : label;
}

function slotPaddingCount(recordCount: number): number {
	const slotsPerRow = gameUiSpec.utilityConstants.blueprintSmallSlotsPerRow;
	const paddedSlotCount = Math.ceil((recordCount + 1) / slotsPerRow) * slotsPerRow;
	return paddedSlotCount - recordCount;
}

function recordColumnCount(viewMode: BlueprintRecordViewMode): number {
	if (viewMode === BlueprintRecordViewMode.Grid) {
		return gameUiSpec.utilityConstants.blueprintBigSlotsPerRow;
	}
	if (viewMode === BlueprintRecordViewMode.Slots) {
		return gameUiSpec.utilityConstants.blueprintSmallSlotsPerRow;
	}
	return 1;
}

function BlueprintRecordIcons({record}: {record: BlueprintRecordModel}) {
	const icons =
		record.gameData.icons.length === 0
			? [{name: RECORD_TYPE_ICON_NAMES[record.gameData.type], type: 'item' as const}]
			: record.gameData.icons;
	return (
		<span
			className="blueprint-record-item__icons"
			aria-hidden="true"
			data-factorio-style="blueprint_record_selection_button"
		>
			{icons.map((icon, index) => (
				<FactorioIcon
					key={`${icon.type ?? 'item'}:${icon.name}:${icon.quality ?? 'normal'}:${index.toString()}`}
					icon={icon}
					size="large"
				/>
			))}
		</span>
	);
}

function BlueprintRecordTooltip({record, tooltipId}: {record: BlueprintRecordModel; tooltipId: string}) {
	const description = record.gameData.description?.trim();
	return (
		<FactorioTooltip
			id={tooltipId}
			className="blueprint-record-item__tooltip"
			heading={<RichText text={blueprintRecordLabel(record)} iconSize="small" />}
			placement={FactorioTooltipPlacement.Above}
		>
			<span className="blueprint-record-item__tooltip-type">
				{BLUEPRINT_RECORD_TYPE_LABELS[record.gameData.type]}
			</span>
			<RichText
				text={description === undefined || description === '' ? 'No description.' : description}
				iconSize="small"
			/>
		</FactorioTooltip>
	);
}

/**
 * The same record button renders blueprints, books, and both planner types in all
 * three Factorio `BlueprintsList` modes. The view changes presentation only;
 * identity, ordering, filtering, activation, and accessibility stay shared.
 */
function BlueprintRecordItem<RecordModel extends BlueprintRecordModel>({
	active,
	actionable,
	buttonRef,
	onActivate,
	onAlternateActivate,
	onFocus,
	onKeyDown,
	record,
	recordInstructionsId,
	viewMode,
}: BlueprintRecordItemProps<RecordModel>) {
	const tooltipId = useId();
	const label = blueprintRecordLabel(record);
	const description = record.gameData.description?.trim() ?? '';
	const describedBy = recordInstructionsId === undefined ? tooltipId : `${tooltipId} ${recordInstructionsId}`;
	const commonButtonProps = {
		'aria-describedby': describedBy,
		'aria-disabled': !actionable,
		'aria-current': active ? ('true' as const) : undefined,
		'aria-keyshortcuts': onAlternateActivate === undefined ? undefined : 'Shift+Enter',
		'aria-label': recordAccessibleName(record, actionable),
		onClick: () => {
			if (actionable) {
				onActivate();
			}
		},
		onContextMenu:
			onAlternateActivate === undefined
				? undefined
				: (event: MouseEvent<HTMLButtonElement>) => {
						if (actionable) {
							event.preventDefault();
							onAlternateActivate();
						}
					},
		onFocus,
		onKeyDown,
		ref: buttonRef,
		tabIndex: active ? 0 : -1,
	} as const;

	if (viewMode === BlueprintRecordViewMode.Slots) {
		return (
			<FactorioInventorySlot
				{...commonButtonProps}
				className="blueprint-record-item blueprint-record-item--slots"
				data-factorio-source="BlueprintsList::addItem"
				data-secondary-detail="tooltip"
			>
				<BlueprintRecordIcons record={record} />
				<BlueprintRecordTooltip record={record} tooltipId={tooltipId} />
			</FactorioInventorySlot>
		);
	}

	return (
		<button
			{...commonButtonProps}
			type="button"
			className={`blueprint-record-item blueprint-record-item--${viewMode}`}
			data-factorio-source="BlueprintsList::addItem"
		>
			<BlueprintRecordIcons record={record} />
			<span className="blueprint-record-item__text">
				<strong>{label}</strong>
				{viewMode === BlueprintRecordViewMode.List ? (
					<span className="blueprint-record-item__description">
						{description === '' ? 'No description.' : description}
					</span>
				) : null}
			</span>
			{viewMode === BlueprintRecordViewMode.List && record.gameData.type === 'blueprint_book' && actionable ? (
				<ChevronRight className="blueprint-record-item__open-book" aria-hidden="true" />
			) : null}
			<BlueprintRecordTooltip record={record} tooltipId={tooltipId} />
		</button>
	);
}

export function BlueprintRecordViews<RecordModel extends BlueprintRecordModel>({
	'aria-label': ariaLabel,
	compareRecords,
	initialActiveRecordId,
	isRecordActionable = () => true,
	onActivate,
	onAlternateActivate,
	onEscape,
	records,
	recordsWhenSearchEmpty,
	recordInstructionsId,
	ref,
	searchLabel = 'Search blueprint records',
	searchResultNoun = 'records',
}: BlueprintRecordViewsProps<RecordModel>) {
	const [searchText, setSearchText] = useState('');
	const [searchVisible, setSearchVisible] = useState(false);
	const viewMode = useSyncExternalStore(subscribeToViewMode, storedViewMode, () => BlueprintRecordViewMode.List);
	const recordReferences = useRef(new Map<string, HTMLButtonElement>());
	const searchInputReference = useRef<HTMLInputElement>(null);
	const searchToggleReference = useRef<HTMLButtonElement>(null);
	const viewButtonReferences = useRef<Array<HTMLButtonElement | null>>([]);
	const searchInputId = useId();
	const visibleRecords = useMemo(() => {
		const filteredRecords = filterAndSortBlueprintRecords(records, searchText, compareRecords);
		return searchText.trim() === '' ? [...(recordsWhenSearchEmpty ?? []), ...filteredRecords] : filteredRecords;
	}, [compareRecords, records, recordsWhenSearchEmpty, searchText]);
	const initialVisibleRecordId =
		visibleRecords.find((record) => record.id === initialActiveRecordId)?.id ?? visibleRecords.at(0)?.id;
	const [activeRecordId, setActiveRecordId] = useState<string | undefined>(() => initialVisibleRecordId);
	const visibleActiveRecordId =
		visibleRecords.find((record) => record.id === activeRecordId)?.id ?? initialVisibleRecordId;
	const emptySlotCount =
		viewMode === BlueprintRecordViewMode.Slots && searchText.trim() === ''
			? slotPaddingCount(visibleRecords.length)
			: 0;

	useEffect(() => {
		if (searchVisible) {
			searchInputReference.current?.focus();
		}
	}, [searchVisible]);

	useImperativeHandle(
		ref,
		() => ({
			focusRecord: (recordId: string) => {
				recordReferences.current.get(recordId)?.focus();
			},
		}),
		[],
	);

	const changeViewMode = (nextViewMode: BlueprintRecordViewMode): void => {
		persistViewMode(nextViewMode);
	};

	const moveViewMode = (nextIndex: number): void => {
		const wrappedIndex = (nextIndex + VIEW_OPTIONS.length) % VIEW_OPTIONS.length;
		changeViewMode(VIEW_OPTIONS[wrappedIndex].mode);
		viewButtonReferences.current[wrappedIndex]?.focus();
	};

	const handleViewModeKeyDown = (event: KeyboardEvent<HTMLButtonElement>, viewOptionIndex: number): void => {
		if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
			event.preventDefault();
			moveViewMode(viewOptionIndex - 1);
		} else if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
			event.preventDefault();
			moveViewMode(viewOptionIndex + 1);
		} else if (event.key === 'Home') {
			event.preventDefault();
			moveViewMode(0);
		} else if (event.key === 'End') {
			event.preventDefault();
			moveViewMode(VIEW_OPTIONS.length - 1);
		}
	};

	const moveFocus = (nextIndex: number): void => {
		if (visibleRecords.length === 0) {
			return;
		}
		const wrappedIndex = (nextIndex + visibleRecords.length) % visibleRecords.length;
		const nextRecord = visibleRecords[wrappedIndex];
		setActiveRecordId(nextRecord.id);
		recordReferences.current.get(nextRecord.id)?.focus();
	};

	const moveFocusWithinGrid = (nextIndex: number): void => {
		const nextRecord = visibleRecords.at(nextIndex);
		if (nextRecord === undefined) {
			return;
		}
		setActiveRecordId(nextRecord.id);
		recordReferences.current.get(nextRecord.id)?.focus();
	};

	const handleRecordKeyDown = (event: KeyboardEvent<HTMLButtonElement>, recordIndex: number): void => {
		const record = visibleRecords[recordIndex];
		if (
			event.key === 'Enter' &&
			event.shiftKey &&
			onAlternateActivate !== undefined &&
			isRecordActionable(record)
		) {
			event.preventDefault();
			onAlternateActivate(record);
		} else if ((event.key === 'Enter' || event.key === ' ') && isRecordActionable(record)) {
			event.preventDefault();
			onActivate(record);
		} else if (event.key === 'ArrowUp') {
			event.preventDefault();
			if (viewMode === BlueprintRecordViewMode.List) {
				moveFocus(recordIndex - 1);
			} else {
				moveFocusWithinGrid(recordIndex - recordColumnCount(viewMode));
			}
		} else if (event.key === 'ArrowDown') {
			event.preventDefault();
			if (viewMode === BlueprintRecordViewMode.List) {
				moveFocus(recordIndex + 1);
			} else {
				moveFocusWithinGrid(recordIndex + recordColumnCount(viewMode));
			}
		} else if (event.key === 'ArrowLeft') {
			event.preventDefault();
			moveFocus(recordIndex - 1);
		} else if (event.key === 'ArrowRight') {
			event.preventDefault();
			moveFocus(recordIndex + 1);
		} else if (event.key === 'Home') {
			event.preventDefault();
			moveFocus(0);
		} else if (event.key === 'End') {
			event.preventDefault();
			moveFocus(visibleRecords.length - 1);
		} else if (event.key === 'Escape' && onEscape !== undefined) {
			event.preventDefault();
			onEscape();
		}
	};

	return (
		<div className="blueprint-record-views" data-factorio-source="BlueprintShelfWidget::passesFilter">
			<div className="blueprint-record-views__toolbar">
				<div className="blueprint-record-views__search-control" data-factorio-source="SearchBar::SearchBar">
					<label
						className="blueprint-record-views__search"
						data-factorio-style="search_popup_frame"
						htmlFor={searchInputId}
						hidden={!searchVisible}
					>
						<span className="visually-hidden">{searchLabel}</span>
						<input
							ref={searchInputReference}
							id={searchInputId}
							type="search"
							value={searchText}
							data-factorio-style="search_popup_textfield"
							onChange={(event) => {
								setSearchText(event.currentTarget.value);
							}}
							onKeyDown={(event) => {
								if (event.key === 'Escape') {
									event.preventDefault();
									event.stopPropagation();
									setSearchVisible(false);
									setSearchText('');
									searchToggleReference.current?.focus();
								}
							}}
						/>
					</label>
					<FactorioButton
						ref={searchToggleReference}
						kind={FactorioButtonKind.Search}
						aria-controls={searchInputId}
						aria-expanded={searchVisible}
						aria-label={searchLabel}
						className="blueprint-record-views__search-toggle"
						title="Search"
						onClick={(event) => {
							if (searchVisible) {
								setSearchVisible(false);
								setSearchText('');
								event.currentTarget.focus();
							} else {
								setSearchVisible(true);
							}
						}}
					/>
				</div>
				<div
					className="blueprint-record-views__toggles"
					role="group"
					aria-label="Record view"
					data-factorio-source="BlueprintsList::viewButtons"
				>
					{VIEW_OPTIONS.map((option, optionIndex) => {
						const Icon = option.icon;
						return (
							<FactorioButton
								key={option.mode}
								ref={(button) => {
									viewButtonReferences.current[optionIndex] = button;
								}}
								aria-label={option.label}
								aria-pressed={viewMode === option.mode}
								className="blueprint-record-views__toggle"
								data-factorio-source-style="tool_button"
								title={option.label}
								tabIndex={viewMode === option.mode ? 0 : -1}
								onClick={() => {
									changeViewMode(option.mode);
								}}
								onKeyDown={(event) => {
									handleViewModeKeyDown(event, optionIndex);
								}}
							>
								<Icon aria-hidden="true" data-factorio-utility-sprite={option.sprite} />
							</FactorioButton>
						);
					})}
				</div>
			</div>
			<FactorioScrollFrame aria-label={ariaLabel} className="blueprint-library__records">
				{visibleRecords.length === 0 ? (
					<p
						className="blueprint-record-views__no-results"
						role="status"
						data-website-extension="filtered-empty-message"
					>
						No matching {searchResultNoun}.
					</p>
				) : (
					<ul
						className={`blueprint-record-views__items blueprint-record-views__items--${viewMode}`}
						data-factorio-columns={
							viewMode === BlueprintRecordViewMode.List ? undefined : recordColumnCount(viewMode)
						}
						style={
							viewMode === BlueprintRecordViewMode.Grid
								? blueprintGridStyle
								: viewMode === BlueprintRecordViewMode.Slots
									? blueprintSlotsStyle
									: undefined
						}
					>
						{visibleRecords.map((record, index) => (
							<li key={record.id}>
								<BlueprintRecordItem
									active={record.id === visibleActiveRecordId}
									actionable={isRecordActionable(record)}
									buttonRef={(button) => {
										if (button === null) {
											recordReferences.current.delete(record.id);
										} else {
											recordReferences.current.set(record.id, button);
										}
									}}
									record={record}
									recordInstructionsId={recordInstructionsId}
									viewMode={viewMode}
									onActivate={() => {
										onActivate(record);
									}}
									onAlternateActivate={
										onAlternateActivate === undefined
											? undefined
											: () => {
													onAlternateActivate(record);
												}
									}
									onFocus={() => {
										setActiveRecordId(record.id);
									}}
									onKeyDown={(event) => {
										handleRecordKeyDown(event, index);
									}}
								/>
							</li>
						))}
						{Array.from({length: emptySlotCount}, (_, emptySlotIndex) => (
							<li
								key={`empty-slot-${emptySlotIndex.toString()}`}
								className="blueprint-record-views__empty-slot"
								aria-hidden="true"
								data-factorio-source="BlueprintsList::getSquareSize"
							>
								<span
									className="factorio-inventory-slot"
									data-factorio-style={gameUiSpec.styles.bindings.slotButton}
								/>
							</li>
						))}
					</ul>
				)}
			</FactorioScrollFrame>
		</div>
	);
}
