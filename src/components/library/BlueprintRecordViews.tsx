import {ChevronRight, Grid2X2, LayoutGrid, List, Search} from 'lucide-react';
import {
	useEffect,
	useId,
	useImperativeHandle,
	useMemo,
	useRef,
	useState,
	type KeyboardEvent,
	type MouseEvent,
	type Ref,
} from 'react';

import {FactorioIcon} from '../core/icons/FactorioIcon';
import {FactorioButton, FactorioInventorySlot, FactorioScrollFrame, FactorioTooltip} from '../ui/FactorioUi';
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
	{icon: List, label: 'List view', mode: BlueprintRecordViewMode.List},
	{icon: Grid2X2, label: 'Grid view', mode: BlueprintRecordViewMode.Grid},
	{icon: LayoutGrid, label: 'Slot view', mode: BlueprintRecordViewMode.Slots},
] as const;

interface BlueprintViewStorage {
	getItem: (key: string) => string | null;
	setItem: (key: string, value: string) => void;
}

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

function initialViewMode(): BlueprintRecordViewMode {
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

function recordAccessibleName(record: BlueprintRecordModel, actionable: boolean): string {
	const label = blueprintRecordLabel(record);
	return actionable && record.gameData.type === 'blueprint_book' ? `Open book ${label}` : label;
}

function BlueprintRecordIcons({record}: {record: BlueprintRecordModel}) {
	const icons =
		record.gameData.icons.length === 0
			? [{name: RECORD_TYPE_ICON_NAMES[record.gameData.type], type: 'item' as const}]
			: record.gameData.icons;
	return (
		<span className="blueprint-record-item__icons" aria-hidden="true">
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
		<FactorioTooltip id={tooltipId} className="blueprint-record-item__tooltip">
			<strong>{blueprintRecordLabel(record)}</strong>
			<span>{BLUEPRINT_RECORD_TYPE_LABELS[record.gameData.type]}</span>
			<span>{description === undefined || description === '' ? 'No description.' : description}</span>
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
			{record.gameData.type === 'blueprint_book' && actionable ? (
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
	const [viewMode, setViewMode] = useState(initialViewMode);
	const recordReferences = useRef(new Map<string, HTMLButtonElement>());
	const visibleRecords = useMemo(() => {
		const filteredRecords = filterAndSortBlueprintRecords(records, searchText, compareRecords);
		return searchText.trim() === '' ? [...(recordsWhenSearchEmpty ?? []), ...filteredRecords] : filteredRecords;
	}, [compareRecords, records, recordsWhenSearchEmpty, searchText]);
	const initialActiveRecordIndex = Math.max(
		0,
		visibleRecords.findIndex((record) => record.id === initialActiveRecordId),
	);
	const [activeRecordIndex, setActiveRecordIndex] = useState(() => initialActiveRecordIndex);
	const visibleRecordIds = visibleRecords.map((record) => record.id).join('\u0000');

	useEffect(() => {
		setActiveRecordIndex(initialActiveRecordIndex);
	}, [initialActiveRecordIndex, searchText, visibleRecordIds]);

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
		setViewMode(nextViewMode);
		getLocalStorage()?.setItem(BLUEPRINT_RECORD_VIEW_STORAGE_KEY, nextViewMode);
	};

	const moveFocus = (nextIndex: number): void => {
		if (visibleRecords.length === 0) {
			return;
		}
		const wrappedIndex = (nextIndex + visibleRecords.length) % visibleRecords.length;
		setActiveRecordIndex(wrappedIndex);
		recordReferences.current.get(visibleRecords[wrappedIndex].id)?.focus();
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
		} else if (event.key === 'ArrowUp' || event.key === 'ArrowLeft') {
			event.preventDefault();
			moveFocus(recordIndex - 1);
		} else if (event.key === 'ArrowDown' || event.key === 'ArrowRight') {
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
		<div className="blueprint-record-views">
			<div className="blueprint-record-views__toolbar">
				<label className="blueprint-record-views__search">
					<Search aria-hidden="true" />
					<span className="visually-hidden">{searchLabel}</span>
					<input
						type="search"
						value={searchText}
						placeholder="Search labels and descriptions"
						onChange={(event) => {
							setSearchText(event.currentTarget.value);
						}}
					/>
				</label>
				<div className="blueprint-record-views__toggles" role="group" aria-label="Record view">
					{VIEW_OPTIONS.map((option) => {
						const Icon = option.icon;
						return (
							<FactorioButton
								key={option.mode}
								aria-label={option.label}
								aria-pressed={viewMode === option.mode}
								className="blueprint-record-views__toggle"
								title={option.label}
								onClick={() => {
									changeViewMode(option.mode);
								}}
							>
								<Icon aria-hidden="true" />
							</FactorioButton>
						);
					})}
				</div>
			</div>
			<FactorioScrollFrame aria-label={ariaLabel} className="blueprint-library__records">
				{visibleRecords.length === 0 ? (
					<p className="blueprint-record-views__no-results" role="status">
						No {searchResultNoun} match “{searchText.trim()}”.
					</p>
				) : (
					<ul className={`blueprint-record-views__items blueprint-record-views__items--${viewMode}`}>
						{visibleRecords.map((record, index) => (
							<li key={record.id}>
								<BlueprintRecordItem
									active={index === activeRecordIndex}
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
										setActiveRecordIndex(index);
									}}
									onKeyDown={(event) => {
										handleRecordKeyDown(event, index);
									}}
								/>
							</li>
						))}
					</ul>
				)}
			</FactorioScrollFrame>
		</div>
	);
}
