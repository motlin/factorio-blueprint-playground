import {useCallback, useId, useMemo, useRef, useState} from 'react';
import {createPortal} from 'react-dom';

import gameUiSpec from '../../../../generated/game-ui-spec.json';
import type {QualityComparator, SignalID, SignalType} from '../../../../parsing/types';
import {FactorioIcon} from '../../../core/icons/FactorioIcon';
import {ButtonGreen} from '../../../ui/ButtonGreen';
import {FactorioButton, FactorioButtonKind, FactorioInventorySlot} from '../../../ui/FactorioUi';
import {signalWithUpgradeQuality, type UpgradeQualitySelection, type UpgradeQualitySignal} from './upgradeQuality';
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
 * - Clicking a slot stages signal and quality together. The green check or Enter
 *   confirms only a valid staged value; closing, Escape, or unmodified Q cancels
 *   without invoking `onChoose`. Q remains text input while search has focus.
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
const gridColumnCount = gameUiSpec.styles.signalsTableColumnCount;

type PickerSignal = UpgradeQualitySignal;
type PickerCategoryId = 'items' | 'recipes' | 'fluids' | 'virtual' | 'environment' | 'other';
type QualityMode = 'source' | 'target';

interface PickerCategory {
	id: PickerCategoryId;
	label: string;
	types: ReadonlySet<SignalType>;
}

const pickerCategories: readonly PickerCategory[] = [
	{id: 'items', label: 'Items and entities', types: new Set(['item', 'entity'])},
	{id: 'recipes', label: 'Recipes', types: new Set(['recipe'])},
	{id: 'fluids', label: 'Fluids', types: new Set(['fluid'])},
	{id: 'virtual', label: 'Virtual signals', types: new Set(['virtual', 'virtual-signal'])},
	{
		id: 'environment',
		label: 'Environment',
		types: new Set(['planet', 'space-location', 'tile']),
	},
	{
		id: 'other',
		label: 'Other signals',
		types: new Set(['achievement', 'equipment', 'item-group', 'quality', 'technology', 'utility']),
	},
];

export interface SignalPickerDialogProps {
	initialQuality?: UpgradeQualitySelection;
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

function categoryForSignal(signal: SignalID): PickerCategory {
	const type = normalizedSignalType(signal);
	const category = pickerCategories.find((candidate) => candidate.types.has(type));
	if (category === undefined) {
		throw new Error(`Signal type ${type} has no picker category.`);
	}
	return category;
}

export function SignalPickerDialog({
	initialQuality,
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
	const optionButtons = useRef<Array<HTMLButtonElement | null>>([]);
	const availableCategories = useMemo(
		() =>
			pickerCategories.filter((category) =>
				options.some((signal) => category.id === categoryForSignal(signal).id),
			),
		[options],
	);
	const initialCategoryId: PickerCategoryId | undefined =
		options.length === 0 ? undefined : categoryForSignal(initialSignal ?? options[0]).id;
	const [activeCategoryId, setActiveCategoryId] = useState<PickerCategoryId | undefined>(initialCategoryId);
	const [search, setSearch] = useState('');
	const [selectedSignal, setSelectedSignal] = useState<PickerSignal | undefined>(
		initialSignal === undefined ||
			!options.some((signal) => signalPrototypeIdentity(signal) === signalPrototypeIdentity(initialSignal))
			? undefined
			: initialSignal,
	);
	const [qualitySelection, setQualitySelection] = useState<UpgradeQualitySelection>(
		initialQuality ??
			(qualityMode === 'source'
				? (initialSignal?.quality ?? 'any')
				: qualityMode === 'target'
					? (initialSignal?.quality ?? 'normal')
					: 'normal'),
	);
	const [qualityComparator, setQualityComparator] = useState<QualityComparator>(initialSignal?.comparator ?? '=');
	const activeCategory: PickerCategory | undefined =
		activeCategoryId === undefined
			? undefined
			: (availableCategories.find((category) => category.id === activeCategoryId) ?? availableCategories[0]);
	const normalizedSearch = search.trim().toLowerCase();
	const filteredOptions = options.filter(
		(signal) =>
			activeCategory !== undefined &&
			activeCategory.id === categoryForSignal(signal).id &&
			(normalizedSearch === '' || signalName(signal).toLowerCase().includes(normalizedSearch)),
	);
	const selectedIdentity = selectedSignal === undefined ? undefined : signalPrototypeIdentity(selectedSignal);
	const selectedOptionIndex = filteredOptions.findIndex(
		(signal) => signalPrototypeIdentity(signal) === selectedIdentity,
	);
	const tabbableOptionIndex = selectedOptionIndex < 0 ? 0 : selectedOptionIndex;
	const confirmedSignal =
		selectedSignal === undefined
			? undefined
			: qualityMode === undefined
				? selectedSignal
				: signalWithUpgradeQuality(selectedSignal, qualityMode, qualitySelection, qualityComparator);
	const selectionAllowed = confirmedSignal !== undefined && (isSelectionAllowed?.(confirmedSignal) ?? true);

	const confirmSelection = useCallback(() => {
		if (confirmedSignal === undefined || !selectionAllowed) {
			return;
		}
		onChoose(confirmedSignal);
	}, [confirmedSignal, onChoose, selectionAllowed]);
	const dialogReference = useDialogFocus<HTMLElement>({
		closeOnQ: true,
		initialFocusSelector: 'input[type="search"]',
		onClose,
		onEnter: confirmSelection,
	});

	const moveGridFocus = (event: React.KeyboardEvent<HTMLButtonElement>, currentIndex: number) => {
		let nextIndex: number | undefined;
		if (event.key === 'ArrowRight') {
			nextIndex = Math.min(currentIndex + 1, filteredOptions.length - 1);
		} else if (event.key === 'ArrowLeft') {
			nextIndex = Math.max(currentIndex - 1, 0);
		} else if (event.key === 'ArrowDown') {
			nextIndex = Math.min(currentIndex + gridColumnCount, filteredOptions.length - 1);
		} else if (event.key === 'ArrowUp') {
			nextIndex = Math.max(currentIndex - gridColumnCount, 0);
		} else if (event.key === 'Home') {
			nextIndex = 0;
		} else if (event.key === 'End') {
			nextIndex = filteredOptions.length - 1;
		}
		if (nextIndex === undefined || nextIndex === currentIndex) {
			return;
		}
		event.preventDefault();
		optionButtons.current[nextIndex]?.focus();
	};

	return createPortal(
		<div className="transform-dialog-backdrop transform-picker__backdrop">
			<section
				ref={dialogReference}
				className="factorio-frame factorio-frame--shallow transform-dialog transform-dialog--picker"
				role="dialog"
				aria-modal="true"
				aria-labelledby={headingId}
			>
				<header className="factorio-title-bar transform-dialog__header transform-picker__header">
					<h3 id={headingId}>{title}</h3>
					<label className="transform-picker__search" htmlFor={searchId}>
						<span>Search</span>
						<input
							id={searchId}
							type="search"
							value={search}
							onChange={(event) => {
								setSearch(event.currentTarget.value);
							}}
						/>
					</label>
					<FactorioButton
						kind={FactorioButtonKind.Close}
						className="transform-dialog__close"
						aria-label={`Close ${title}`}
						title={`Close ${title}`}
						onClick={() => {
							onClose();
						}}
					/>
				</header>
				<div className="panel-hole transform-picker">
					<div className="transform-picker__tabs" role="tablist" aria-label="Signal categories">
						{availableCategories.map((category) => (
							<button
								type="button"
								role="tab"
								key={category.id}
								aria-controls={gridId}
								aria-selected={category.id === activeCategoryId}
								onClick={() => {
									setActiveCategoryId(category.id);
									setSelectedSignal(undefined);
								}}
							>
								{category.label}
							</button>
						))}
					</div>
					<div
						id={gridId}
						className="factorio-scroll-frame transform-picker__grid"
						data-factorio-style={gameUiSpec.styles.bindings.deepSlotsScrollPane}
						role="group"
						aria-label={`${activeCategory?.label ?? 'Signal'} choices`}
						style={{
							columnGap: gameUiSpec.styles.filterSlotHorizontalSpacing,
							rowGap: gameUiSpec.styles.filterSlotVerticalSpacing,
						}}
					>
						{filteredOptions.map((signal, index) => (
							<FactorioInventorySlot
								key={signalPrototypeIdentity(signal)}
								ref={(button) => {
									optionButtons.current[index] = button;
								}}
								className="transform-picker__option"
								aria-label={`Choose ${signalName(signal)}`}
								selected={signalPrototypeIdentity(signal) === selectedIdentity}
								tabIndex={index === tabbableOptionIndex ? 0 : -1}
								title={signalTitle(signal)}
								onClick={() => {
									setSelectedSignal(signal);
								}}
								onKeyDown={(event) => {
									moveGridFocus(event, index);
								}}
							>
								<FactorioIcon icon={signal} size="large" />
							</FactorioInventorySlot>
						))}
						{filteredOptions.length === 0 ? (
							<p className="transform-picker__empty">No matching signals in this category.</p>
						) : null}
					</div>
				</div>
				<footer className="transform-picker__footer">
					{qualityMode === undefined ? (
						<span />
					) : (
						<UpgradeQualityControls
							mode={qualityMode}
							qualityComparator={qualityComparator}
							qualitySelection={qualitySelection}
							onComparatorChange={setQualityComparator}
							onQualityChange={setQualitySelection}
						/>
					)}
					<ButtonGreen
						disabled={!selectionAllowed}
						onClick={(event) => {
							event.preventDefault();
							confirmSelection();
						}}
					>
						<span aria-hidden="true">✓</span>
						<span className="transform-picker__confirm-label">Confirm</span>
					</ButtonGreen>
				</footer>
			</section>
		</div>,
		document.body,
	);
}
