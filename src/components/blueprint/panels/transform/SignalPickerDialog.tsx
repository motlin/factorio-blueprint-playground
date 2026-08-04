import {useCallback, useEffect, useId, useMemo, useRef, useState, type ReactNode} from 'react';
import {createPortal} from 'react-dom';

import gameUiSpec from '../../../../generated/game-ui-spec.json';
import type {QualityComparator, SignalID, SignalType} from '../../../../parsing/types';
import {FactorioIcon} from '../../../core/icons/FactorioIcon';
import {
	FactorioButton,
	FactorioButtonKind,
	FactorioDialogBackdrop,
	FactorioInventorySlot,
	FactorioScrollFrame,
	FactorioTitleBar,
} from '../../../ui/FactorioUi';
import {
	initialUpgradeQualitySelection,
	signalWithUpgradeQuality,
	type UpgradeQualitySelection,
	type UpgradeQualitySignal,
} from './upgradeQuality';
import {
	canonicalPickerOptions,
	signalPickerGroup,
	signalPickerHidden,
	signalPickerSubgroup,
} from './upgradePlannerSignals';
import {UpgradeQualityControls} from './UpgradeQualityControls';
import {useDialogFocus} from './useDialogFocus';

/**
 * Factorio 2.1.12 signal and quality picker contract:
 *
 * Catalog and layout
 *
 * - The caller supplies the eligible prototype stream. Hidden prototypes and
 *   parameters are excluded by default. Only source iterators with an explicit
 *   include policy admit them; installed prototype filters own any additional
 *   visibility rules. Planner target callers must restrict that stream to
 *   compatible upgrades instead of exposing every signal as selectable.
 * - Categories follow registered item-group order, with prototypes in subgroup
 *   and prototype order. A search-empty category remains in place but disabled;
 *   a category with no eligible prototypes is absent. With zero or one used
 *   category, the tab strip is omitted.
 * - Search matches the displayed localised prototype name. An exact match may
 *   activate its category, no matches produce a visible empty result, and the
 *   selected value remains staged while the grid is rebuilt.
 * - The slot grid uses the source `selectSlotRowCount`; subgroup boundaries pad
 *   to the next row and the tallest category establishes a stable scroll-frame
 *   height. For this web surface, the ten-column grid and 400 px signal-table
 *   density evidenced by `SignalsTable` are the baseline, and keyboard row
 *   movement must use the same column count.
 *
 * Quality profiles
 *
 * - Local blueprint icons and planner To use exact-quality selection
 *   (`QualityGui`); planner From uses a filter condition
 *   (`QualityConditionGui`). These are footer profiles of this picker, not
 *   separate dialogs or a second quality mechanism.
 * - An exact selector lists visible, non-hidden qualities in registered order.
 *   It uses icon buttons below the configured visible-quality threshold and a
 *   dropdown at or above it; both representations edit the same single value.
 * - A source filter is a multi-quality condition: the comparator menu contains
 *   Any first, then `>`, `<`, `=`, `≥`, `≤`, and `≠`, followed by the same exact
 *   quality selector for the comparison threshold. Choosing a comparator from
 *   Any restores normal as the threshold.
 * - Any quality is the empty-quality sentinel. It appears as the any-quality
 *   icon but serializes by omitting quality and comparator fields. It is valid
 *   for From filters; a To selection is an exact quality. A signal that cannot
 *   carry quality locks the exact selector to normal.
 *
 * Transaction and focus
 *
 * - Clicking a slot stages signal and quality together. Double-clicking that
 *   slot, the green check, or Enter confirms only a valid staged value; closing,
 *   Escape, or unmodified Q cancels without invoking `onChoose`. Q remains text
 *   input while search has focus.
 * - Closing either way returns focus to the slot or button that opened the
 *   topmost picker. Parent dialogs stay inert until that picker is gone.
 * - Confirming a planner From value closes only Set the filter and leaves the
 *   partial row visible. Select upgrade opens only after an explicit To-slot
 *   activation; confirmation must never chain-open it.
 *
 * Ownership map: this component owns categories, search, grid, staging, and the
 * confirm/cancel boundary; `UpgradeQualityControls` owns the two footer profiles;
 * `upgradeQuality` owns sentinel-to-blueprint conversion; `FactorioIcon`,
 * `BlueprintLabelIcons`, and planner signal slots only render/invoke this picker.
 *
 * Evidence: SelectListGui, FilterSelectGui, IDWithQualityIDSelectListGui,
 * QualityGui, QualitySelector, QualityConditionGui, and SignalsTable at Factorio
 * 2.1.12; BE-6 and the July 23 Set the filter, comparator-menu, and restricted
 * Select upgrade captures.
 */
const gridColumnCount = gameUiSpec.utilityConstants.selectSlotRowCount;
const categoryColumnCount = gameUiSpec.utilityConstants.selectGroupRowCount;
type PickerSignal = UpgradeQualitySignal;
type PickerCategoryId = string;
type QualityMode = 'source' | 'target';
export type SignalPickerConfirmationMode = 'immediate' | 'required';

interface PickerCategory {
	id: PickerCategoryId;
	icon: SignalID;
	label: string;
}

const pickerCategories: readonly PickerCategory[] = gameUiSpec.signals.categories.map(
	({label, name}, index, categories) => {
		if (categories.findIndex((category) => category.name === name) !== index) {
			throw new Error(`Signal category ${name} occurs more than once in the generated UI specification.`);
		}
		return {
			id: name,
			icon: {type: 'item-group', name},
			label,
		};
	},
);

export interface SignalPickerDialogProps {
	confirmationMode: SignalPickerConfirmationMode;
	extrasFrame?: (pendingSignal: PickerSignal | undefined) => ReactNode;
	includeHiddenSignals?: boolean;
	includeParameterSignals?: boolean;
	initialQuality?: UpgradeQualitySelection;
	initialSearch?: string;
	initialSignal?: PickerSignal;
	isSelectionAllowed?: (signal: PickerSignal) => boolean;
	onChoose: (signal: PickerSignal) => void;
	onClose: () => void;
	options: SignalID[];
	qualityMode?: QualityMode;
	title: string;
}

function normalizedSignalType(signal: SignalID): SignalType {
	if (signal.type === undefined) {
		return 'item';
	}
	if (signal.type === 'virtual-signal') {
		return 'virtual';
	}
	return signal.type;
}

function signalPrototypeIdentity(signal: SignalID): string {
	return [normalizedSignalType(signal), signal.name].join(':');
}

function signalName(signal: SignalID): string {
	const words = signal.name.replace(/^signal-/, 'signal ').replaceAll('-', ' ');
	return words.slice(0, 1).toUpperCase() + words.slice(1);
}

function signalTitle(signal: PickerSignal): string {
	const quality = signal.quality === undefined ? '' : `\nQuality: ${signal.comparator ?? '='} ${signal.quality}`;
	return `${signalName(signal)}\n${normalizedSignalType(signal)}:${signal.name}${quality}`;
}

function categoryIdForSignal(signal: SignalID): PickerCategoryId {
	const generatedGroup = signalPickerGroup(signal);
	if (generatedGroup !== undefined) {
		return generatedGroup;
	}
	const type = normalizedSignalType(signal);
	if (type === 'item' || type === 'entity') {
		return 'logistics';
	}
	if (type === 'recipe') {
		return 'production';
	}
	if (type === 'fluid') {
		return 'fluids';
	}
	if (type === 'virtual' || type === 'virtual-signal') {
		return 'signals';
	}
	if (type === 'tile') {
		return 'tiles';
	}
	if (type === 'planet' || type === 'space-location') {
		return 'environment';
	}
	if (type === 'equipment') {
		return 'combat';
	}
	if (type === 'quality') {
		return 'effects';
	}
	return 'other';
}

function categoryForSignal(signal: SignalID): PickerCategory {
	const categoryId = categoryIdForSignal(signal);
	const category = pickerCategories.find((candidate) => candidate.id === categoryId);
	if (category === undefined) {
		throw new Error(`Signal category ${categoryId} is absent from the generated UI specification.`);
	}
	return category;
}

/**
 * IncludeParameters is a source policy independent of IncludeHidden; both
 * planner pickers admit hidden prototypes while excluding parameters.
 */
function isParameterSignal(signal: SignalID): boolean {
	return signal.name === 'parameter-' || /^parameter-\d+$/.test(signal.name);
}

function signalWithCurrentQuality(
	signal: PickerSignal,
	qualityMode: QualityMode | undefined,
	qualitySelection: UpgradeQualitySelection,
	qualityComparator: QualityComparator,
): PickerSignal {
	return qualityMode === undefined
		? signal
		: signalWithUpgradeQuality(signal, qualityMode, qualitySelection, qualityComparator);
}

interface GridCell {
	key: string;
	optionIndex?: number;
	signal?: SignalID;
}

function signalGridCells(options: readonly SignalID[]): GridCell[] {
	const cells: GridCell[] = [];
	let previousSubgroup: string | undefined;
	for (const [optionIndex, signal] of options.entries()) {
		const subgroup = signalPickerSubgroup(signal);
		if (previousSubgroup !== undefined && previousSubgroup !== subgroup && cells.length % gridColumnCount !== 0) {
			const padding = gridColumnCount - (cells.length % gridColumnCount);
			for (let index = 0; index < padding; index += 1) {
				cells.push({key: `padding-${cells.length.toString()}`});
			}
		}
		cells.push({key: signalPrototypeIdentity(signal), optionIndex, signal});
		previousSubgroup = subgroup;
	}
	return cells;
}

export function SignalPickerDialog({
	confirmationMode,
	extrasFrame,
	includeHiddenSignals = false,
	includeParameterSignals = false,
	initialQuality,
	initialSearch = '',
	initialSignal,
	isSelectionAllowed,
	onChoose,
	onClose,
	options,
	qualityMode,
	title,
}: SignalPickerDialogProps) {
	const headingId = useId();
	const searchId = useId();
	const gridId = useId();
	const categoryButtons = useRef<Array<HTMLButtonElement | null>>([]);
	const optionButtons = useRef<Array<HTMLButtonElement | null>>([]);
	const searchReference = useRef<HTMLInputElement>(null);
	const signalNameReference = useRef<HTMLDivElement>(null);
	const inspectedSignalsReference = useRef<{
		focused: SignalID | undefined;
		hovered: SignalID | undefined;
	}>({focused: undefined, hovered: undefined});
	const visibleOptions = useMemo(
		() =>
			canonicalPickerOptions(
				options.filter(
					(signal) =>
						(includeHiddenSignals || !signalPickerHidden(signal)) &&
						(includeParameterSignals || !isParameterSignal(signal)),
				),
			),
		[includeHiddenSignals, includeParameterSignals, options],
	);
	const availableCategories = useMemo(
		() =>
			pickerCategories.filter((category) =>
				visibleOptions.some((signal) => category.id === categoryForSignal(signal).id),
			),
		[visibleOptions],
	);
	const initialCategoryId: PickerCategoryId | undefined =
		visibleOptions.length === 0 ? undefined : categoryForSignal(initialSignal ?? visibleOptions[0]).id;
	const [activeCategoryId, setActiveCategoryId] = useState<PickerCategoryId | undefined>(initialCategoryId);
	const [search, setSearch] = useState(initialSearch);
	const [rejectionMessage, setRejectionMessage] = useState('');
	const [searchVisible, setSearchVisible] = useState(initialSearch !== '');
	const [selectedSignal, setSelectedSignal] = useState<PickerSignal | undefined>(
		initialSignal === undefined ||
			!visibleOptions.some((signal) => signalPrototypeIdentity(signal) === signalPrototypeIdentity(initialSignal))
			? undefined
			: initialSignal,
	);
	const [qualitySelection, setQualitySelection] = useState<UpgradeQualitySelection>(
		initialQuality ?? initialUpgradeQualitySelection(initialSignal, qualityMode),
	);
	const [qualityComparator, setQualityComparator] = useState<QualityComparator>(initialSignal?.comparator ?? '=');
	const normalizedSearch = search.trim().toLowerCase();
	const categoryOptions = useMemo(
		() =>
			new Map(
				availableCategories.map((category) => [
					category.id,
					visibleOptions.filter(
						(signal) =>
							category.id === categoryForSignal(signal).id &&
							(normalizedSearch === '' || signalName(signal).toLowerCase().includes(normalizedSearch)),
					),
				]),
			),
		[availableCategories, normalizedSearch, visibleOptions],
	);
	const matchingCategories = availableCategories.filter(
		(category) => (categoryOptions.get(category.id)?.length ?? 0) > 0,
	);
	const resolvedActiveCategoryId =
		(categoryOptions.get(activeCategoryId ?? '')?.length ?? 0) > 0 ? activeCategoryId : matchingCategories[0]?.id;
	const activeCategory: PickerCategory | undefined =
		resolvedActiveCategoryId === undefined
			? undefined
			: availableCategories.find((category) => category.id === resolvedActiveCategoryId);
	const filteredOptions = activeCategory === undefined ? [] : (categoryOptions.get(activeCategory.id) ?? []);
	const gridCells = signalGridCells(filteredOptions);
	/* SelectListGui::setupMinimalSize: the tallest category establishes the
	   stable pane height with no visible-row cap; the stylesheet still clamps
	   to the viewport. */
	const stableGridRows = Math.max(
		1,
		...availableCategories.map((category) =>
			Math.ceil(
				signalGridCells(visibleOptions.filter((signal) => category.id === categoryForSignal(signal).id))
					.length / gridColumnCount,
			),
		),
	);
	const selectedIdentity = selectedSignal === undefined ? undefined : signalPrototypeIdentity(selectedSignal);
	const selectedOptionIndex = filteredOptions.findIndex(
		(signal) => signalPrototypeIdentity(signal) === selectedIdentity,
	);
	const optionAllowed = (signal: SignalID) =>
		isSelectionAllowed?.(signalWithCurrentQuality(signal, qualityMode, qualitySelection, qualityComparator)) ??
		true;
	const firstAllowedOptionIndex = filteredOptions.findIndex(optionAllowed);
	const tabbableOptionIndex =
		selectedOptionIndex >= 0 && optionAllowed(filteredOptions[selectedOptionIndex])
			? selectedOptionIndex
			: firstAllowedOptionIndex;
	const confirmedSignal =
		selectedSignal === undefined
			? undefined
			: signalWithCurrentQuality(selectedSignal, qualityMode, qualitySelection, qualityComparator);
	const selectionAllowed = confirmedSignal !== undefined && (isSelectionAllowed?.(confirmedSignal) ?? true);
	const pickerExtras = extrasFrame?.(confirmedSignal);
	const chooseSignal = useCallback(
		(signal: SignalID) => {
			const signalWithQuality = signalWithCurrentQuality(
				signal,
				qualityMode,
				qualitySelection,
				qualityComparator,
			);
			if (!(isSelectionAllowed?.(signalWithQuality) ?? true)) {
				return;
			}
			onChoose(signalWithQuality);
		},
		[isSelectionAllowed, onChoose, qualityComparator, qualityMode, qualitySelection],
	);
	const updateInspectedSignal = () => {
		const readout = signalNameReference.current;
		if (readout === null) {
			return;
		}
		const inspectedSignal = inspectedSignalsReference.current.hovered ?? inspectedSignalsReference.current.focused;
		if (inspectedSignal === undefined) {
			readout.textContent = '\u00a0';
			readout.removeAttribute('aria-label');
			readout.removeAttribute('title');
			return;
		}
		const inspectedSignalName = signalName(inspectedSignal);
		readout.textContent = inspectedSignalName;
		readout.setAttribute('aria-label', `Inspected signal: ${inspectedSignalName}`);
		readout.title = inspectedSignalName;
	};
	const clearInspectedSignal = () => {
		inspectedSignalsReference.current = {focused: undefined, hovered: undefined};
		updateInspectedSignal();
	};

	const confirmSelection = useCallback(() => {
		if (confirmedSignal === undefined || !selectionAllowed) {
			return;
		}
		onChoose(confirmedSignal);
	}, [confirmedSignal, onChoose, selectionAllowed]);
	const dialogReference = useDialogFocus<HTMLElement>({
		closeOnQ: true,
		initialFocusSelector: initialSearch === '' ? '[data-picker-search-toggle]' : 'input[type="search"]',
		onClose,
		onEnter: confirmationMode === 'required' ? confirmSelection : undefined,
	});
	useEffect(() => {
		if (searchVisible) {
			searchReference.current?.focus();
			searchReference.current?.select();
		}
	}, [searchVisible]);

	const moveGridFocus = (event: React.KeyboardEvent<HTMLButtonElement>, currentIndex: number) => {
		let nextIndex: number | undefined;
		if (event.key === 'ArrowRight') {
			nextIndex = filteredOptions.findIndex((signal, index) => index > currentIndex && optionAllowed(signal));
		} else if (event.key === 'ArrowLeft') {
			for (let index = currentIndex - 1; index >= 0; index -= 1) {
				if (optionAllowed(filteredOptions[index])) {
					nextIndex = index;
					break;
				}
			}
		} else if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
			const currentCellIndex = gridCells.findIndex((cell) => cell.optionIndex === currentIndex);
			const currentRow = Math.floor(currentCellIndex / gridColumnCount);
			const targetRow = currentRow + (event.key === 'ArrowDown' ? 1 : -1);
			const targetRowStart = targetRow * gridColumnCount;
			const targetRowEnd = targetRowStart + gridColumnCount;
			const targetColumn = currentCellIndex % gridColumnCount;
			for (let distance = 0; distance < gridColumnCount; distance += 1) {
				for (const candidateColumn of [targetColumn - distance, targetColumn + distance]) {
					const candidateCell =
						candidateColumn < 0 || candidateColumn >= gridColumnCount
							? undefined
							: gridCells[targetRowStart + candidateColumn];
					if (
						targetRowStart < 0 ||
						targetRowStart >= gridCells.length ||
						targetRowEnd <= 0 ||
						candidateCell?.optionIndex === undefined ||
						!optionAllowed(filteredOptions[candidateCell.optionIndex])
					) {
						continue;
					}
					nextIndex = candidateCell.optionIndex;
					break;
				}
				if (nextIndex !== undefined) {
					break;
				}
			}
		} else if (event.key === 'Home') {
			nextIndex = firstAllowedOptionIndex;
		} else if (event.key === 'End') {
			for (let index = filteredOptions.length - 1; index >= 0; index -= 1) {
				if (optionAllowed(filteredOptions[index])) {
					nextIndex = index;
					break;
				}
			}
		}
		if (nextIndex === undefined || nextIndex < 0 || nextIndex === currentIndex) {
			return;
		}
		event.preventDefault();
		optionButtons.current[nextIndex]?.focus();
	};
	const activateCategory = (category: PickerCategory, categoryIndex: number) => {
		if ((categoryOptions.get(category.id)?.length ?? 0) === 0) {
			return;
		}
		clearInspectedSignal();
		setActiveCategoryId(category.id);
		categoryButtons.current[categoryIndex]?.focus();
	};
	const moveCategoryFocus = (event: React.KeyboardEvent<HTMLButtonElement>, currentIndex: number) => {
		let candidateIndexes: number[] = [];
		if (event.key === 'ArrowRight') {
			candidateIndexes = Array.from(
				{length: availableCategories.length - 1},
				(_, offset) => (currentIndex + offset + 1) % availableCategories.length,
			);
		} else if (event.key === 'ArrowLeft') {
			candidateIndexes = Array.from(
				{length: availableCategories.length - 1},
				(_, offset) => (currentIndex - offset - 1 + availableCategories.length) % availableCategories.length,
			);
		} else if (event.key === 'ArrowDown') {
			candidateIndexes = [currentIndex + categoryColumnCount];
		} else if (event.key === 'ArrowUp') {
			candidateIndexes = [currentIndex - categoryColumnCount];
		} else if (event.key === 'Home') {
			candidateIndexes = availableCategories.map((_, index) => index);
		} else if (event.key === 'End') {
			candidateIndexes = availableCategories.map((_, index) => availableCategories.length - index - 1);
		} else {
			return;
		}
		const nextIndex = candidateIndexes.find(
			(index) =>
				index >= 0 &&
				index < availableCategories.length &&
				(categoryOptions.get(availableCategories[index].id)?.length ?? 0) > 0,
		);
		if (nextIndex === undefined || nextIndex === currentIndex) {
			return;
		}
		event.preventDefault();
		activateCategory(availableCategories[nextIndex], nextIndex);
	};

	if (confirmationMode === 'immediate' && qualityMode !== undefined) {
		throw new Error('Immediate signal selection cannot include staged quality controls.');
	}

	return createPortal(
		<FactorioDialogBackdrop nested className="transform-dialog-backdrop transform-picker__backdrop">
			<section
				ref={dialogReference}
				className="factorio-frame factorio-frame--shallow factorio-dialog transform-dialog transform-dialog--picker"
				role="dialog"
				aria-modal="true"
				aria-labelledby={headingId}
			>
				<FactorioTitleBar className="transform-dialog__header transform-picker__header">
					<h3 id={headingId}>{title}</h3>
					<div className="transform-picker__header-actions">
						<div className="transform-picker__search-control">
							<FactorioButton
								kind={FactorioButtonKind.Search}
								data-picker-search-toggle
								aria-controls={searchId}
								aria-expanded={searchVisible}
								aria-label="Search"
								title="Search"
								onClick={(event) => {
									if (searchVisible) {
										setSearchVisible(false);
										setSearch('');
										clearInspectedSignal();
										event.currentTarget.focus();
									} else {
										setSearchVisible(true);
									}
								}}
							/>
							<label className="transform-picker__search" htmlFor={searchId} hidden={!searchVisible}>
								<span className="transform-visually-hidden">Search</span>
								<input
									ref={searchReference}
									id={searchId}
									type="search"
									value={search}
									onChange={(event) => {
										setSearch(event.currentTarget.value);
										const normalized = event.currentTarget.value.trim().toLowerCase();
										const exactMatch =
											normalized === ''
												? undefined
												: visibleOptions.find(
														(signal) => signalName(signal).toLowerCase() === normalized,
													);
										if (exactMatch !== undefined) {
											setActiveCategoryId(categoryIdForSignal(exactMatch));
										}
										clearInspectedSignal();
									}}
								/>
							</label>
						</div>
						<FactorioButton
							kind={FactorioButtonKind.Close}
							className="transform-dialog__close"
							aria-label={`Close ${title}`}
							title={`Close ${title}`}
							onClick={() => {
								onClose();
							}}
						/>
					</div>
				</FactorioTitleBar>
				<div className="panel-hole transform-picker">
					<div className="transform-picker__body">
						{availableCategories.length > 1 ? (
							<div
								className="transform-picker__tabs"
								role="tablist"
								aria-label="Signal categories"
								aria-orientation="horizontal"
								style={{
									gridTemplateColumns: `repeat(${categoryColumnCount.toString()}, ${gameUiSpec.styles.filterGroupTabWidth.toString()}px)`,
								}}
							>
								{availableCategories.map((category, categoryIndex) => {
									const hasMatches = (categoryOptions.get(category.id)?.length ?? 0) > 0;
									return (
										<button
											type="button"
											role="tab"
											key={category.id}
											ref={(button) => {
												categoryButtons.current[categoryIndex] = button;
											}}
											className="transform-picker__tab"
											data-factorio-style="filter_group_tab"
											aria-controls={gridId}
											aria-label={category.label}
											aria-selected={category.id === resolvedActiveCategoryId}
											disabled={!hasMatches}
											tabIndex={category.id === resolvedActiveCategoryId ? 0 : -1}
											title={category.label}
											style={{
												width: gameUiSpec.styles.filterGroupTabWidth,
												height: gameUiSpec.styles.filterGroupTabHeight,
											}}
											onClick={() => {
												clearInspectedSignal();
												setActiveCategoryId(category.id);
											}}
											onKeyDown={(event) => {
												moveCategoryFocus(event, categoryIndex);
											}}
										>
											<FactorioIcon decorative icon={category.icon} size="large" />
											<span>{category.label}</span>
										</button>
									);
								})}
							</div>
						) : null}
						<div className="transform-picker__signal-table">
							<FactorioScrollFrame
								id={gridId}
								className="transform-picker__grid"
								aria-label={`${activeCategory?.label ?? 'Signal'} choices`}
								data-grid-columns={gridColumnCount}
								style={{
									columnGap: gameUiSpec.styles.filterSlotHorizontalSpacing,
									gridTemplateColumns: `repeat(${gridColumnCount.toString()}, ${gameUiSpec.styles.slotSize.toString()}px)`,
									rowGap: gameUiSpec.styles.filterSlotVerticalSpacing,
									height: stableGridRows * gameUiSpec.styles.slotSize,
									width: gameUiSpec.styles.signalsTableMinimumWidth,
								}}
							>
								{gridCells.map((cell) => {
									if (cell.signal === undefined) {
										return (
											<span
												key={cell.key}
												className="transform-picker__grid-padding"
												data-picker-cell="padding"
												aria-hidden="true"
											/>
										);
									}
									const signal = cell.signal;
									const optionIndex = cell.optionIndex;
									if (optionIndex === undefined) {
										throw new Error('Signal grid cell is missing its option index.');
									}
									const allowed = optionAllowed(signal);
									return (
										<FactorioInventorySlot
											key={cell.key}
											ref={(button) => {
												optionButtons.current[optionIndex] = button;
											}}
											className="transform-picker__option"
											data-picker-cell="signal"
											aria-label={`Choose ${signalName(signal)}`}
											aria-disabled={!allowed}
											selected={signalPrototypeIdentity(signal) === selectedIdentity}
											tabIndex={optionIndex === tabbableOptionIndex ? 0 : -1}
											title={signalTitle(signal)}
											onBlur={() => {
												inspectedSignalsReference.current.focused = undefined;
												updateInspectedSignal();
											}}
											onClick={() => {
												if (!allowed) {
													setRejectionMessage(`${signalName(signal)} cannot be chosen here.`);
													return;
												}
												setRejectionMessage('');
												if (confirmationMode === 'immediate') {
													chooseSignal(signal);
												} else {
													setSelectedSignal(signal);
												}
											}}
											onDoubleClick={() => {
												if (confirmationMode === 'required') {
													chooseSignal(signal);
												}
											}}
											onFocus={() => {
												inspectedSignalsReference.current.focused = signal;
												updateInspectedSignal();
											}}
											onKeyDown={(event) => {
												moveGridFocus(event, optionIndex);
											}}
											onMouseEnter={() => {
												inspectedSignalsReference.current.hovered = signal;
												updateInspectedSignal();
											}}
											onMouseLeave={() => {
												inspectedSignalsReference.current.hovered = undefined;
												updateInspectedSignal();
											}}
										>
											<FactorioIcon decorative icon={signal} size="large" />
										</FactorioInventorySlot>
									);
								})}
								{filteredOptions.length === 0 ? (
									<p
										className="transform-picker__empty"
										role="status"
										aria-atomic="true"
										aria-label="Nothing found"
										aria-live="polite"
									>
										Nothing found
									</p>
								) : null}
							</FactorioScrollFrame>
							<div role="status" aria-live="polite" className="transform-visually-hidden">
								{rejectionMessage}
							</div>
							<div
								ref={signalNameReference}
								className="transform-picker__signal-name"
								role="status"
								aria-atomic="true"
								aria-live="polite"
							>
								{'\u00a0'}
							</div>
						</div>
					</div>
				</div>
				{pickerExtras === null || pickerExtras === undefined ? null : (
					<div className="transform-picker__extras" data-factorio-source="SelectListGui::addToExtrasFrame">
						{pickerExtras}
					</div>
				)}
				{confirmationMode === 'required' ? (
					<footer className="transform-picker__footer" data-factorio-style="subfooter_frame">
						{qualityMode === undefined ? null : (
							<UpgradeQualityControls
								mode={qualityMode}
								qualityComparator={qualityComparator}
								qualitySelection={qualitySelection}
								onComparatorChange={setQualityComparator}
								onQualityChange={setQualitySelection}
							/>
						)}
						<FactorioButton
							kind={FactorioButtonKind.Confirm}
							className="transform-picker__confirm"
							data-factorio-control-style="item_and_count_select_confirm"
							disabled={!selectionAllowed}
							title="Confirm"
							onClick={(event) => {
								event.preventDefault();
								confirmSelection();
							}}
						>
							<span aria-hidden="true">✓</span>
							<span className="transform-picker__confirm-label">Confirm</span>
						</FactorioButton>
					</footer>
				) : null}
			</section>
		</FactorioDialogBackdrop>,
		document.body,
	);
}
