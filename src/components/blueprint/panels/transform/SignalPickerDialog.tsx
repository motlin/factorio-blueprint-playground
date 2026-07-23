import {useCallback, useEffect, useId, useMemo, useRef, useState} from 'react';

import type {Quality, QualityComparator, SignalID, SignalType} from '../../../../parsing/types';
import {FactorioIcon} from '../../../core/icons/FactorioIcon';
import {ButtonGreen} from '../../../ui/ButtonGreen';

const gridColumnCount = 10;
const qualities = ['normal', 'uncommon', 'rare', 'epic', 'legendary'] as const;
const qualityComparators: readonly QualityComparator[] = ['=', '≠', '<', '≤', '>', '≥'];

type QualitySelection = 'any' | 'preserve' | Exclude<Quality, undefined>;
type PickerSignal = SignalID & {comparator?: QualityComparator};
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
	initialQuality?: QualitySelection;
	initialSignal?: PickerSignal;
	isSelectionAllowed?: (signal: PickerSignal, preserveQuality: boolean) => boolean;
	onChoose: (signal: PickerSignal, preserveQuality?: boolean) => void;
	onClose: () => void;
	options: SignalID[];
	qualityMode?: QualityMode;
	title: string;
}

interface SignalPickerQualityBarProps {
	mode: QualityMode;
	onComparatorChange: (comparator: QualityComparator) => void;
	onQualityChange: (selection: QualitySelection) => void;
	qualityComparator: QualityComparator;
	qualitySelection: QualitySelection;
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

function signalIdentity(signal: PickerSignal): string {
	return [normalizedSignalType(signal), signal.name, signal.quality ?? 'normal', signal.comparator ?? '='].join(':');
}

function signalName(signal: SignalID): string {
	const words = signal.name.replace(/^signal-/, 'signal ').replaceAll('-', ' ');
	return words.slice(0, 1).toUpperCase() + words.slice(1);
}

function signalTitle(signal: PickerSignal): string {
	const quality = signal.quality === undefined ? '' : `\nQuality: ${signal.comparator ?? '='} ${signal.quality}`;
	return `${signalName(signal)}\n${normalizedSignalType(signal)}:${signal.name}${quality}`;
}

function isTextEditingTarget(target: EventTarget | null): boolean {
	return (
		target instanceof HTMLInputElement ||
		target instanceof HTMLTextAreaElement ||
		target instanceof HTMLSelectElement ||
		(target instanceof HTMLElement && target.isContentEditable)
	);
}

function categoryForSignal(signal: SignalID): PickerCategory {
	const type = normalizedSignalType(signal);
	const category = pickerCategories.find((candidate) => candidate.types.has(type));
	if (category === undefined) {
		throw new Error(`Signal type ${type} has no picker category.`);
	}
	return category;
}

function selectedSignalWithQuality(
	signal: SignalID,
	qualityMode: QualityMode | undefined,
	qualitySelection: QualitySelection,
	qualityComparator: QualityComparator,
): PickerSignal {
	const selectedSignal: PickerSignal = {...signal};
	if (qualityMode === undefined) {
		return selectedSignal;
	}
	delete selectedSignal.comparator;
	delete selectedSignal.quality;
	if (qualitySelection === 'any' || qualitySelection === 'preserve') {
		if (
			(qualityMode === 'source' && qualitySelection !== 'any') ||
			(qualityMode === 'target' && qualitySelection !== 'preserve')
		) {
			throw new Error(`${qualitySelection} is not valid for ${qualityMode} quality selection.`);
		}
		return selectedSignal;
	}
	selectedSignal.quality = qualitySelection;
	if (qualityMode === 'source') {
		selectedSignal.comparator = qualityComparator;
	}
	return selectedSignal;
}

function SignalPickerQualityBar({
	mode,
	onComparatorChange,
	onQualityChange,
	qualityComparator,
	qualitySelection,
}: SignalPickerQualityBarProps) {
	const sentinel = mode === 'source' ? 'any' : 'preserve';
	return (
		<div className="transform-picker__quality-bar" role="group" aria-label={`${signalName({name: mode})} quality`}>
			<button
				type="button"
				aria-label={mode === 'source' ? 'Any quality' : 'Set as source'}
				aria-pressed={qualitySelection === sentinel}
				onClick={() => {
					onQualityChange(sentinel);
				}}
			>
				{mode === 'source' ? 'Any quality' : 'Set as source'}
			</button>
			{mode === 'source' ? (
				<select
					aria-label="Quality comparison"
					value={qualityComparator}
					disabled={qualitySelection === 'any'}
					onChange={(event) => {
						const comparator = qualityComparators.find(
							(candidate) => candidate === event.currentTarget.value,
						);
						if (comparator === undefined) {
							throw new Error(`Unknown quality comparator: ${event.currentTarget.value}`);
						}
						onComparatorChange(comparator);
					}}
				>
					{qualityComparators.map((comparator) => (
						<option key={comparator} value={comparator}>
							{comparator}
						</option>
					))}
				</select>
			) : null}
			{qualities.map((quality) => (
				<button
					type="button"
					key={quality}
					aria-label={`${signalName({name: quality})} quality`}
					aria-pressed={qualitySelection === quality}
					title={`${signalName({name: quality})} quality`}
					onClick={() => {
						onQualityChange(quality);
					}}
				>
					<FactorioIcon icon={{type: 'quality', name: quality}} size="small" />
				</button>
			))}
		</div>
	);
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
			!options.some((signal) => signalIdentity(signal) === signalIdentity(initialSignal))
			? undefined
			: initialSignal,
	);
	const [qualitySelection, setQualitySelection] = useState<QualitySelection>(
		initialQuality ??
			(qualityMode === 'source'
				? (initialSignal?.quality ?? 'any')
				: qualityMode === 'target'
					? 'preserve'
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
	const selectedIdentity = selectedSignal === undefined ? undefined : signalIdentity(selectedSignal);
	const selectedOptionIndex = filteredOptions.findIndex((signal) => signalIdentity(signal) === selectedIdentity);
	const tabbableOptionIndex = selectedOptionIndex < 0 ? 0 : selectedOptionIndex;
	const preserveQuality = qualitySelection === 'preserve';
	const confirmedSignal =
		selectedSignal === undefined
			? undefined
			: selectedSignalWithQuality(selectedSignal, qualityMode, qualitySelection, qualityComparator);
	const selectionAllowed =
		confirmedSignal !== undefined && (isSelectionAllowed?.(confirmedSignal, preserveQuality) ?? true);

	const confirmSelection = useCallback(() => {
		if (confirmedSignal === undefined || !selectionAllowed) {
			return;
		}
		onChoose(confirmedSignal, preserveQuality);
	}, [confirmedSignal, onChoose, preserveQuality, selectionAllowed]);

	useEffect(() => {
		const handlePickerShortcut = (event: KeyboardEvent) => {
			const escapePressed = event.key === 'Escape';
			const clearCursorPressed =
				event.code === 'KeyQ' &&
				!event.altKey &&
				!event.ctrlKey &&
				!event.metaKey &&
				!event.shiftKey &&
				!isTextEditingTarget(event.target);
			const confirmPressed =
				event.key === 'Enter' &&
				!event.altKey &&
				!event.ctrlKey &&
				!event.metaKey &&
				!event.shiftKey &&
				!(event.target instanceof HTMLButtonElement);
			if (!escapePressed && !clearCursorPressed && !confirmPressed) {
				return;
			}
			event.preventDefault();
			event.stopPropagation();
			if (confirmPressed) {
				confirmSelection();
			} else {
				onClose();
			}
		};
		window.addEventListener('keydown', handlePickerShortcut);
		return () => {
			window.removeEventListener('keydown', handlePickerShortcut);
		};
	}, [confirmSelection, onClose]);

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

	return (
		<div className="transform-dialog-backdrop transform-picker__backdrop">
			<section
				className="transform-dialog transform-dialog--picker"
				role="dialog"
				aria-modal="true"
				aria-label={title}
			>
				<header className="transform-dialog__header transform-picker__header">
					<h3>{title}</h3>
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
					<button
						type="button"
						className="transform-dialog__close"
						aria-label={`Close ${title}`}
						onClick={() => {
							onClose();
						}}
					>
						×
					</button>
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
						className="transform-picker__grid"
						role="group"
						aria-label={`${activeCategory?.label ?? 'Signal'} choices`}
					>
						{filteredOptions.map((signal, index) => (
							<button
								type="button"
								key={signalIdentity(signal)}
								ref={(button) => {
									optionButtons.current[index] = button;
								}}
								className="transform-picker__option"
								aria-label={`Choose ${signalName(signal)}`}
								aria-pressed={signalIdentity(signal) === selectedIdentity}
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
							</button>
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
						<SignalPickerQualityBar
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
		</div>
	);
}
