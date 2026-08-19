import {
	useEffect,
	useId,
	useLayoutEffect,
	useMemo,
	useRef,
	useState,
	type DragEvent,
	type KeyboardEvent,
	type ReactNode,
} from 'react';
import {createPortal} from 'react-dom';

import type {Parameter, SignalID} from '../../../../parsing/types';
import {FactorioIcon} from '../../../core/icons/FactorioIcon';
import {FactorioButton, FactorioButtonKind, FactorioInventorySlot, FactorioScrollFrame} from '../../../ui/FactorioUi';
import {SignalPickerDialog} from './SignalPickerDialog';
import {useDialogFocus} from './useDialogFocus';

const dependencyOptions = [
	{field: undefined, label: 'Independent', value: 'independent'},
	{field: 'ingredient-of', label: 'Ingredient of', value: 'ingredient-of'},
	{field: 'item-ingredient-of', label: 'Item ingredient of', value: 'item-ingredient-of'},
	{field: 'fluid-ingredient-of', label: 'Fluid ingredient of', value: 'fluid-ingredient-of'},
	{field: 'product-of', label: 'Product of', value: 'product-of'},
	{field: 'item-product-of', label: 'Item product of', value: 'item-product-of'},
	{field: 'fluid-product-of', label: 'Fluid product of', value: 'fluid-product-of'},
] as const;

interface BlueprintParameterizationDialogProps {
	dialogId: string;
	onClose: () => void;
	onConfirm: (parameters: Parameter[]) => void;
	parameters: readonly Parameter[];
	signalOptions: readonly SignalID[];
}

interface ParameterizationBodyProps {
	children: ReactNode;
	empty: boolean;
}

function ParameterizationBody({children, empty}: ParameterizationBodyProps) {
	return empty ? (
		<div className="blueprint-parameterization__empty-state">{children}</div>
	) : (
		<FactorioScrollFrame className="blueprint-parameterization__body" aria-label="Blueprint parameters">
			{children}
		</FactorioScrollFrame>
	);
}

interface DialogAnchor {
	bottom: number;
	left: number;
}

interface DependencySourceOption {
	id: string;
	name: string;
	signal: SignalID;
}

interface ParameterDependencyDropdownProps {
	disabled: boolean;
	onChange: (value: (typeof dependencyOptions)[number]) => void;
	parameterNumber: number;
	value: (typeof dependencyOptions)[number];
}

function ParameterDependencyDropdown({disabled, onChange, parameterNumber, value}: ParameterDependencyDropdownProps) {
	const [open, setOpen] = useState(false);
	const rootReference = useRef<HTMLDivElement>(null);
	const listboxId = useId();

	useEffect(() => {
		if (!open) {
			return undefined;
		}
		const closeOutside = (event: PointerEvent) => {
			if (
				event.target instanceof Node &&
				(rootReference.current === null || !rootReference.current.contains(event.target))
			) {
				setOpen(false);
			}
		};
		document.addEventListener('pointerdown', closeOutside);
		return () => {
			document.removeEventListener('pointerdown', closeOutside);
		};
	}, [open]);

	const focusOption = (position: 'first' | 'last' | 'selected') => {
		requestAnimationFrame(() => {
			const options = rootReference.current?.querySelectorAll<HTMLElement>('[role="option"]');
			if (options === undefined || options.length === 0) {
				return;
			}
			const selectedIndex = dependencyOptions.findIndex((option) => option.value === value.value);
			options[position === 'first' ? 0 : position === 'last' ? options.length - 1 : selectedIndex]?.focus();
		});
	};

	return (
		<div ref={rootReference} className="blueprint-parameterization__dependency-dropdown">
			<button
				type="button"
				className="blueprint-parameterization__dependency-trigger"
				aria-controls={open ? listboxId : undefined}
				aria-expanded={open}
				aria-haspopup="listbox"
				aria-label={`Parameter ${parameterNumber.toString()} dependency mode: ${value.label}`}
				data-factorio-style="train_schedule_circuit_condition_comparator_dropdown"
				disabled={disabled}
				onClick={() => {
					setOpen((current) => !current);
				}}
				onKeyDown={(event) => {
					if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
						event.preventDefault();
						setOpen(true);
						focusOption(event.key === 'ArrowDown' ? 'first' : 'last');
					}
				}}
			>
				<span>{value.label}</span>
				<span className="blueprint-parameterization__dependency-chevron" aria-hidden="true" />
			</button>
			{open ? (
				<div
					id={listboxId}
					className="blueprint-parameterization__dependency-list"
					role="listbox"
					aria-label={`Dependency mode for parameter ${parameterNumber.toString()}`}
				>
					{dependencyOptions.map((option, optionIndex) => (
						<button
							type="button"
							key={option.value}
							className="blueprint-parameterization__dependency-option"
							role="option"
							aria-selected={option.value === value.value}
							onClick={() => {
								onChange(option);
								setOpen(false);
								rootReference.current
									?.querySelector<HTMLButtonElement>('[aria-haspopup="listbox"]')
									?.focus();
							}}
							onKeyDown={(event) => {
								const target =
									event.key === 'ArrowDown'
										? optionIndex + 1
										: event.key === 'ArrowUp'
											? optionIndex - 1
											: event.key === 'Home'
												? 0
												: event.key === 'End'
													? dependencyOptions.length - 1
													: undefined;
								if (target !== undefined) {
									event.preventDefault();
									rootReference.current
										?.querySelectorAll<HTMLElement>('[role="option"]')
										.item(clamp(target, 0, dependencyOptions.length - 1))
										.focus();
								} else if (event.key === 'Escape') {
									event.preventDefault();
									event.stopPropagation();
									setOpen(false);
									rootReference.current
										?.querySelector<HTMLButtonElement>('[aria-haspopup="listbox"]')
										?.focus();
								}
							}}
						>
							{option.label}
						</button>
					))}
				</div>
			) : null}
		</div>
	);
}

interface ParameterDependencySourceProps {
	currentSource: string;
	disabled: boolean;
	invalid: boolean;
	onChange: (source: string) => void;
	options: readonly DependencySourceOption[];
	parameterNumber: number;
}

function ParameterDependencySource({
	currentSource,
	disabled,
	invalid,
	onChange,
	options,
	parameterNumber,
}: ParameterDependencySourceProps) {
	const [open, setOpen] = useState(false);
	const rootReference = useRef<HTMLDivElement>(null);
	const listboxId = useId();
	const selected = options.find((option) => option.id === currentSource);

	useEffect(() => {
		if (!open) {
			return undefined;
		}
		const closeOutside = (event: PointerEvent) => {
			if (
				event.target instanceof Node &&
				(rootReference.current === null || !rootReference.current.contains(event.target))
			) {
				setOpen(false);
			}
		};
		document.addEventListener('pointerdown', closeOutside);
		return () => {
			document.removeEventListener('pointerdown', closeOutside);
		};
	}, [open]);

	return (
		<div ref={rootReference} className="blueprint-parameterization__source-picker">
			<FactorioInventorySlot
				size={28}
				className="blueprint-parameterization__source-trigger"
				aria-controls={open ? listboxId : undefined}
				aria-expanded={open}
				aria-haspopup="listbox"
				aria-invalid={invalid || undefined}
				aria-label={`Parameter ${parameterNumber.toString()} dependency source: ${selected?.name ?? (currentSource === '' ? 'None' : `${currentSource} unavailable`)}`}
				data-factorio-style="train_schedule_item_select_button"
				disabled={disabled}
				title={
					invalid
						? "Source of dependency isn't above."
						: selected === undefined
							? 'Choose dependency source'
							: `Dependency source: ${selected.name}`
				}
				onClick={() => {
					setOpen((current) => !current);
				}}
				onKeyDown={(event) => {
					if ((event.key === 'Delete' || event.key === 'Backspace') && currentSource !== '') {
						event.preventDefault();
						onChange('');
					} else if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
						event.preventDefault();
						setOpen(true);
						requestAnimationFrame(() => {
							const available = rootReference.current?.querySelectorAll<HTMLElement>('[role="option"]');
							available?.item(event.key === 'ArrowDown' ? 0 : Math.max(0, available.length - 1)).focus();
						});
					}
				}}
			>
				{selected === undefined ? (
					<span aria-hidden="true">+</span>
				) : (
					<FactorioIcon icon={selected.signal} size="large" />
				)}
			</FactorioInventorySlot>
			{open ? (
				<div
					id={listboxId}
					className="blueprint-parameterization__source-list"
					role="listbox"
					aria-label={`Dependency source for parameter ${parameterNumber.toString()}`}
				>
					{options.length === 0 ? (
						<span className="blueprint-parameterization__source-empty">No parameters above</span>
					) : (
						options.map((option, optionIndex) => (
							<button
								type="button"
								key={option.id}
								className="blueprint-parameterization__source-option"
								role="option"
								aria-label={option.name}
								aria-selected={option.id === currentSource}
								onClick={() => {
									onChange(option.id);
									setOpen(false);
									rootReference.current
										?.querySelector<HTMLButtonElement>('[aria-haspopup="listbox"]')
										?.focus();
								}}
								onKeyDown={(event) => {
									const target =
										event.key === 'ArrowDown'
											? optionIndex + 1
											: event.key === 'ArrowUp'
												? optionIndex - 1
												: event.key === 'Home'
													? 0
													: event.key === 'End'
														? options.length - 1
														: undefined;
									if (target !== undefined) {
										event.preventDefault();
										rootReference.current
											?.querySelectorAll<HTMLElement>('[role="option"]')
											.item(clamp(target, 0, options.length - 1))
											.focus();
									} else if (event.key === 'Escape') {
										event.preventDefault();
										event.stopPropagation();
										setOpen(false);
										rootReference.current
											?.querySelector<HTMLButtonElement>('[aria-haspopup="listbox"]')
											?.focus();
									}
								}}
							>
								<FactorioIcon icon={option.signal} size="large" />
								<span>{option.name}</span>
							</button>
						))
					)}
				</div>
			) : null}
		</div>
	);
}

function activeDialogAnchor(): DialogAnchor | undefined {
	const activeElement = document.activeElement;
	if (!(activeElement instanceof HTMLElement) || activeElement === document.body) {
		return undefined;
	}
	const bounds = activeElement.getBoundingClientRect();
	return {bottom: bounds.bottom, left: bounds.left};
}

function clamp(value: number, minimum: number, maximum: number): number {
	return Math.min(Math.max(value, minimum), maximum);
}

function cloneParameters(parameters: readonly Parameter[]): Parameter[] {
	return parameters.map((parameter) => ({
		...parameter,
		...(parameter['quality-condition'] === undefined
			? {}
			: {'quality-condition': {...parameter['quality-condition']}}),
	}));
}

function dependencyOption(parameter: Parameter) {
	return (
		dependencyOptions.find((option) => option.field !== undefined && parameter[option.field] !== undefined) ??
		dependencyOptions[0]
	);
}

function dependencySource(parameter: Parameter): string {
	const option = dependencyOption(parameter);
	return option.field === undefined ? '' : (parameter[option.field] ?? '');
}

function withoutDependencies(parameter: Parameter): Parameter {
	const next = {...parameter};
	delete next['ingredient-of'];
	delete next['item-ingredient-of'];
	delete next['fluid-ingredient-of'];
	delete next['product-of'];
	delete next['item-product-of'];
	delete next['fluid-product-of'];
	return next;
}

function inferredSignal(parameter: Parameter, options: readonly SignalID[]): SignalID | undefined {
	if (parameter.id === undefined || parameter.id === '') {
		return undefined;
	}
	const matchingOptions = options.filter((option) => option.name === parameter.id);
	const preferred = parameter.id.startsWith('signal-')
		? matchingOptions.find((option) => option.type === 'virtual')
		: matchingOptions.find((option) => option.type === 'item');
	return preferred ?? matchingOptions.at(0) ?? {type: 'item', name: parameter.id};
}

function parameterPickerOptions(parameters: readonly Parameter[], options: readonly SignalID[]): SignalID[] {
	const result = new Map<string, SignalID>();
	for (const signal of options) {
		result.set(`${signal.type ?? 'item'}:${signal.name}`, {...signal, quality: undefined});
	}
	for (const parameter of parameters) {
		if (parameter.type !== 'id') {
			continue;
		}
		const signal = inferredSignal(parameter, options);
		if (signal !== undefined) {
			result.set(`${signal.type ?? 'item'}:${signal.name}`, {...signal, quality: undefined});
		}
	}
	return [...result.values()];
}

function nextParameterId(parameters: readonly Parameter[]): string {
	const used = new Set(parameters.flatMap((parameter) => (parameter.id === undefined ? [] : [parameter.id])));
	let index = 0;
	while (used.has(`parameter-${index.toString()}`)) {
		index += 1;
	}
	return `parameter-${index.toString()}`;
}

function dependencyValidationMessage(parameters: readonly Parameter[]): string | undefined {
	const available = new Set<string>();
	for (const parameter of parameters) {
		if (parameter.type !== 'id') {
			continue;
		}
		const option = parameter.parameter === false ? dependencyOptions[0] : dependencyOption(parameter);
		const source = option.field === undefined ? '' : dependencySource(parameter);
		if (option.field !== undefined && (source === '' || !available.has(source) || source === parameter.id)) {
			return "Source of dependency isn't above.";
		}
		if (parameter.id !== undefined && parameter.id !== '') {
			available.add(parameter.id);
		}
	}
	return undefined;
}

function moveParameter(parameters: readonly Parameter[], fromIndex: number, toIndex: number): Parameter[] {
	if (fromIndex === toIndex) {
		return [...parameters];
	}
	const editableIndexes = parameters.flatMap((parameter, index) => (parameter.type === 'id' ? [index] : []));
	const fromEditableIndex = editableIndexes.indexOf(fromIndex);
	const toEditableIndex = editableIndexes.indexOf(toIndex);
	if (fromEditableIndex === -1 || toEditableIndex === -1) {
		throw new Error(`Cannot reorder hidden parameter from ${fromIndex.toString()} to ${toIndex.toString()}`);
	}
	const editableParameters = editableIndexes.map((index) => parameters[index]);
	const [moved] = editableParameters.splice(fromEditableIndex, 1);
	editableParameters.splice(toEditableIndex, 0, moved);
	const next = [...parameters];
	for (const [editableIndex, parameterIndex] of editableIndexes.entries()) {
		next[parameterIndex] = editableParameters[editableIndex];
	}
	return next;
}

export function BlueprintParameterizationDialog({
	dialogId,
	onClose,
	onConfirm,
	parameters,
	signalOptions,
}: BlueprintParameterizationDialogProps) {
	const dialogTitleId = useId();
	const dialogDescriptionId = useId();
	const confirmErrorId = useId();
	const [draftParameters, setDraftParameters] = useState(() => cloneParameters(parameters));
	const [choosingValueIndex, setChoosingValueIndex] = useState<number>();
	const [draggedParameterIndex, setDraggedParameterIndex] = useState<number>();
	const [dragTargetIndex, setDragTargetIndex] = useState<number>();
	const [dialogAnchor] = useState(activeDialogAnchor);
	const editableParameters = draftParameters.flatMap((parameter, index) =>
		parameter.type === 'id' ? [{index, parameter}] : [],
	);
	const unsupportedCount = draftParameters.length - editableParameters.length;
	const pickerOptions = useMemo(
		() => parameterPickerOptions(draftParameters, signalOptions),
		[draftParameters, signalOptions],
	);
	const choosingParameter = choosingValueIndex === undefined ? undefined : draftParameters[choosingValueIndex];
	const validationMessage = dependencyValidationMessage(draftParameters);
	const dialogReference = useDialogFocus<HTMLElement>({
		initialFocusSelector: '[data-dialog-initial-focus="true"]',
		onClose,
	});

	useLayoutEffect(() => {
		const dialog = dialogReference.current;
		if (dialog === null || dialogAnchor === undefined) {
			return undefined;
		}

		const positionDialog = () => {
			const viewportGutter = window.innerWidth <= 480 || window.innerHeight <= 640 ? 8 : 24;
			const dialogBounds = dialog.getBoundingClientRect();
			const maximumLeft = Math.max(viewportGutter, window.innerWidth - dialogBounds.width - viewportGutter);
			const maximumTop = Math.max(viewportGutter, window.innerHeight - dialogBounds.height - viewportGutter);
			dialog.style.left = `${clamp(dialogAnchor.left, viewportGutter, maximumLeft).toString()}px`;
			dialog.style.top = `${clamp(dialogAnchor.bottom + 4, viewportGutter, maximumTop).toString()}px`;
		};

		positionDialog();
		window.addEventListener('resize', positionDialog);
		const resizeObserver = typeof ResizeObserver === 'undefined' ? undefined : new ResizeObserver(positionDialog);
		resizeObserver?.observe(dialog);
		return () => {
			resizeObserver?.disconnect();
			window.removeEventListener('resize', positionDialog);
		};
	}, [dialogAnchor, dialogReference]);

	const updateParameter = (index: number, update: (parameter: Parameter) => Parameter) => {
		setDraftParameters((current) =>
			current.map((parameter, parameterIndex) => (parameterIndex === index ? update(parameter) : parameter)),
		);
	};
	const reorderParameter = (fromIndex: number, toIndex: number, focusMovedHandle = false) => {
		setDraftParameters((current) => moveParameter(current, fromIndex, toIndex));
		if (focusMovedHandle) {
			requestAnimationFrame(() => {
				dialogReference.current
					?.querySelector<HTMLButtonElement>(`[data-parameter-drag-handle="${toIndex.toString()}"]`)
					?.focus();
			});
		}
	};
	const confirmParameters = () => {
		if (validationMessage === undefined) {
			onConfirm(cloneParameters(draftParameters));
		}
	};
	const addParameter = () => {
		setDraftParameters((current) => {
			const id = nextParameterId(current);
			return [
				...current,
				{
					type: 'id',
					id,
					name: `Parameter ${(Number(id.slice('parameter-'.length)) + 1).toString()}`,
					'quality-condition': {quality: 'normal', comparator: '='},
				},
			];
		});
	};

	return createPortal(
		<div
			className="transform-dialog-backdrop blueprint-parameterization__backdrop"
			data-anchor-placement={dialogAnchor === undefined ? 'centered' : 'anchored'}
		>
			<section
				ref={dialogReference}
				id={dialogId}
				className="factorio-frame factorio-frame--shallow transform-dialog blueprint-parameterization"
				role="dialog"
				aria-modal="true"
				aria-labelledby={dialogTitleId}
				aria-describedby={dialogDescriptionId}
			>
				<header className="factorio-title-bar transform-dialog__header blueprint-parameterization__header">
					<h3 id={dialogTitleId}>Blueprint parametrisation</h3>
					<FactorioButton
						kind={FactorioButtonKind.Close}
						className="transform-dialog__close"
						aria-label="Close Blueprint parametrisation"
						title="Close Blueprint parametrisation"
						onClick={onClose}
					/>
				</header>

				<div className="blueprint-parameterization__inside">
					<div className="blueprint-parameterization__subheader">
						<p id={dialogDescriptionId} className="blueprint-parameterization__order">
							Parameters are evaluated top to bottom.
						</p>
						<button
							type="button"
							className="blueprint-parameterization__order-info"
							aria-label="Dependencies can only target parameters above them."
							title="Dependencies can only target parameters above them."
						>
							<span aria-hidden="true">ⓘ</span>
						</button>
					</div>
					<ParameterizationBody empty={editableParameters.length === 0}>
						{editableParameters.map(({index, parameter}, editableIndex) => {
							const currentDependency = dependencyOption(parameter);
							const currentSource = dependencySource(parameter);
							const baseSignal = inferredSignal(parameter, pickerOptions);
							const signal =
								baseSignal === undefined || parameter['quality-condition'] === undefined
									? baseSignal
									: {...baseSignal, quality: parameter['quality-condition'].quality};
							const sourceOptions = draftParameters.slice(0, index).flatMap((candidate) =>
								candidate.type === 'id' &&
								candidate.parameter !== false &&
								candidate.id !== undefined &&
								candidate.id !== ''
									? [
											{
												id: candidate.id,
												name: candidate.name ?? candidate.id,
												signal: inferredSignal(candidate, pickerOptions) ?? {
													type: 'item',
													name: candidate.id,
												},
											},
										]
									: [],
							);
							const sourceValid =
								currentSource !== '' && sourceOptions.some((option) => option.id === currentSource);
							const dependencyEnabled =
								parameter.parameter !== false && currentDependency.field !== undefined;
							const dependencyIndex = sourceValid
								? draftParameters
										.slice(0, index + 1)
										.filter(
											(candidate) =>
												candidate.type === 'id' &&
												dependencyOption(candidate).field === currentDependency.field &&
												dependencySource(candidate) === currentSource,
										).length
								: undefined;
							const parameterNumber = editableIndex + 1;
							const previousParameterIndex = editableParameters[editableIndex - 1]?.index;
							const nextParameterIndex = editableParameters[editableIndex + 1]?.index;
							const parameterLabel =
								parameter.name === undefined || parameter.name === ''
									? `parameter ${parameterNumber.toString()}`
									: parameter.name;
							const handleDragStart = (event: DragEvent<HTMLButtonElement>) => {
								setDraggedParameterIndex(index);
								setDragTargetIndex(index);
								event.dataTransfer.effectAllowed = 'move';
								event.dataTransfer.setData('text/plain', index.toString());
							};
							const handleReorderKey = (event: KeyboardEvent<HTMLButtonElement>) => {
								const targetIndex =
									event.key === 'ArrowUp'
										? previousParameterIndex
										: event.key === 'ArrowDown'
											? nextParameterIndex
											: undefined;
								if (targetIndex === undefined) {
									return;
								}
								event.preventDefault();
								reorderParameter(index, targetIndex, true);
							};
							return (
								<div
									className="factorio-frame factorio-frame--shallow blueprint-parameterization__row"
									data-drag-state={
										draggedParameterIndex === index
											? 'dragging'
											: dragTargetIndex === index
												? 'target'
												: undefined
									}
									data-factorio-style="blueprint_parameter_frame"
									key={index}
									onDragOver={(event) => {
										if (draggedParameterIndex === undefined || draggedParameterIndex === index) {
											return;
										}
										event.preventDefault();
										event.dataTransfer.dropEffect = 'move';
										setDragTargetIndex(index);
									}}
									onDrop={(event) => {
										event.preventDefault();
										if (draggedParameterIndex !== undefined && draggedParameterIndex !== index) {
											reorderParameter(draggedParameterIndex, index);
										}
										setDraggedParameterIndex(undefined);
										setDragTargetIndex(undefined);
									}}
								>
									<div className="blueprint-parameterization__primary">
										<label htmlFor={`parameter-name-${index.toString()}`}>
											Name:
											<span className="transform-visually-hidden">
												{' '}
												for parameter {parameterNumber}
											</span>
										</label>
										<input
											id={`parameter-name-${index.toString()}`}
											type="text"
											aria-label={`Parameter ${parameterNumber.toString()} name`}
											value={parameter.name ?? ''}
											onChange={(event) => {
												const name = event.currentTarget.value;
												updateParameter(index, (current) => {
													const next = {...current};
													if (name === '') {
														delete next.name;
													} else {
														next.name = name;
													}
													return next;
												});
											}}
											onKeyDown={(event) => {
												if (event.key === 'Enter') {
													event.preventDefault();
													confirmParameters();
												}
											}}
										/>
										<span className="blueprint-parameterization__value-label">Value:</span>
										<FactorioInventorySlot
											size={28}
											className={`transform-signal-slot blueprint-parameterization__value-slot${signal === undefined ? ' transform-signal-slot--empty' : ''}`}
											aria-keyshortcuts={
												signal === undefined ? 'Enter Space' : 'Enter Space Delete Backspace'
											}
											aria-label={`${signal === undefined ? 'Choose' : 'Edit'} value for parameter ${parameterNumber.toString()}${parameter.name === undefined ? '' : ` ${parameter.name}`}`}
											title={`${signal === undefined ? 'Choose a value' : 'Edit value. Delete or Backspace to clear'} for parameter ${parameterNumber.toString()}${parameter.name === undefined ? '' : ` ${parameter.name}`}`}
											onClick={() => {
												setChoosingValueIndex(index);
											}}
											onKeyDown={(event) => {
												if (
													signal === undefined ||
													(event.key !== 'Delete' && event.key !== 'Backspace')
												) {
													return;
												}
												event.preventDefault();
												updateParameter(index, (current) => {
													const next = {...current};
													delete next.id;
													delete next['quality-condition'];
													return next;
												});
											}}
										>
											{signal === undefined ? (
												<span aria-hidden="true">+</span>
											) : (
												<FactorioIcon icon={signal} size="large" />
											)}
										</FactorioInventorySlot>
										<FactorioButton
											kind={FactorioButtonKind.Delete}
											className="blueprint-parameterization__remove"
											aria-label={`Remove parameter ${parameterNumber.toString()}${parameter.name === undefined ? '' : ` ${parameter.name}`}`}
											title={`Remove parameter ${parameterNumber.toString()}${parameter.name === undefined ? '' : ` ${parameter.name}`}`}
											onClick={() => {
												setDraftParameters((current) =>
													current.filter(
														(_candidate, parameterIndex) => parameterIndex !== index,
													),
												);
											}}
										/>
									</div>

									<div className="blueprint-parameterization__secondary">
										<label className="checkbox-label blueprint-parameterization__parameter-toggle">
											<input
												type="checkbox"
												aria-label={`Parameter ${parameterNumber.toString()} enabled`}
												checked={parameter.parameter !== false}
												data-factorio-style="checkbox"
												onChange={(event) => {
													const checked = event.currentTarget.checked;
													updateParameter(index, (current) => {
														const next = checked
															? {...current}
															: withoutDependencies(current);
														if (checked) {
															delete next.parameter;
														} else {
															next.parameter = false;
														}
														return next;
													});
												}}
											/>
											<span
												className="checkbox blueprint-parameterization__checkbox"
												aria-hidden="true"
											/>
											<span>Parameter</span>
											<span className="transform-visually-hidden"> {parameterNumber}</span>
										</label>
										<ParameterDependencyDropdown
											disabled={parameter.parameter === false}
											parameterNumber={parameterNumber}
											value={currentDependency}
											onChange={(selected) => {
												updateParameter(index, (current) => {
													const next = withoutDependencies(current);
													if (selected.field !== undefined) {
														next[selected.field] = currentSource;
													}
													return next;
												});
											}}
										/>
										{dependencyEnabled ? (
											<>
												<ParameterDependencySource
													currentSource={currentSource}
													disabled={parameter.parameter === false}
													invalid={!sourceValid}
													options={sourceOptions}
													parameterNumber={parameterNumber}
													onChange={(source) => {
														updateParameter(index, (current) => {
															const option = dependencyOption(current);
															const next = withoutDependencies(current);
															if (option.field !== undefined) {
																next[option.field] = source;
															}
															return next;
														});
													}}
												/>
												<span
													className="blueprint-parameterization__dependency-number"
													data-valid={sourceValid ? 'true' : 'false'}
													title={
														sourceValid
															? `Dependency #${dependencyIndex?.toString()}`
															: "Source of dependency isn't above."
													}
												>
													#{dependencyIndex}
												</span>
												{sourceValid ? null : (
													<span className="transform-visually-hidden" role="alert">
														Source of dependency isn't above.
													</span>
												)}
											</>
										) : null}
										<button
											type="button"
											className="blueprint-parameterization__drag-handle"
											data-parameter-drag-handle={index}
											draggable
											aria-keyshortcuts="ArrowUp ArrowDown"
											aria-label={`Reorder ${parameterLabel}. Use Up Arrow or Down Arrow to change its evaluation order.`}
											title="Drag to reorder. Use Up Arrow or Down Arrow for keyboard reordering."
											onDragEnd={() => {
												setDraggedParameterIndex(undefined);
												setDragTargetIndex(undefined);
											}}
											onDragStart={handleDragStart}
											onKeyDown={handleReorderKey}
										>
											<span aria-hidden="true" />
										</button>
									</div>
								</div>
							);
						})}

						{editableParameters.length === 0 ? (
							<p className="blueprint-parameterization__empty">No editable signal parameters.</p>
						) : null}
						{unsupportedCount === 0 ? null : (
							<p className="blueprint-parameterization__preserved">
								{unsupportedCount} unsupported{' '}
								{unsupportedCount === 1 ? 'parameter is' : 'parameters are'} preserved unchanged.
							</p>
						)}
						<FactorioButton
							kind={FactorioButtonKind.Neutral}
							className="blueprint-parameterization__add"
							data-dialog-initial-focus="true"
							aria-label="Add parameter"
							title="Add parameter"
							onClick={addParameter}
						>
							<span aria-hidden="true">+</span>
							<span>Add parameter</span>
						</FactorioButton>
					</ParameterizationBody>
				</div>

				<footer className="blueprint-parameterization__footer">
					<FactorioButton
						kind={FactorioButtonKind.Confirm}
						className="transform-picker__confirm blueprint-parameterization__confirm"
						aria-describedby={validationMessage === undefined ? undefined : confirmErrorId}
						disabled={validationMessage !== undefined}
						title={validationMessage ?? 'Confirm Blueprint parametrisation'}
						onClick={(event) => {
							event.preventDefault();
							confirmParameters();
						}}
					>
						<span aria-hidden="true">✓</span>
						<span className="transform-picker__confirm-label">Confirm</span>
					</FactorioButton>
					{validationMessage === undefined ? null : (
						<span id={confirmErrorId} className="transform-visually-hidden">
							{validationMessage}
						</span>
					)}
				</footer>
			</section>

			{choosingValueIndex === undefined || choosingParameter?.type !== 'id' ? null : (
				<SignalPickerDialog
					confirmationMode="required"
					initialQuality={choosingParameter['quality-condition']?.quality ?? 'any'}
					initialSignal={inferredSignal(choosingParameter, pickerOptions)}
					onChoose={(signal) => {
						updateParameter(choosingValueIndex, (current) => {
							const next = {...current, id: signal.name};
							if (signal.quality === undefined) {
								delete next['quality-condition'];
							} else {
								next['quality-condition'] = {
									quality: signal.quality,
									comparator: signal.comparator ?? '=',
								};
							}
							return next;
						});
						setChoosingValueIndex(undefined);
					}}
					onClose={() => {
						setChoosingValueIndex(undefined);
					}}
					options={pickerOptions}
					qualityMode="source"
					title={`Choose value for ${choosingParameter.name ?? choosingParameter.id ?? 'parameter'}`}
				/>
			)}
		</div>,
		document.body,
	);
}
