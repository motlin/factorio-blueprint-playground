import {useId, useLayoutEffect, useMemo, useState, type DragEvent, type KeyboardEvent} from 'react';
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

interface DialogAnchor {
	bottom: number;
	left: number;
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

function dependenciesValid(parameters: readonly Parameter[]): boolean {
	const available = new Set<string>();
	for (const parameter of parameters) {
		if (parameter.type !== 'id') {
			continue;
		}
		const source = parameter.parameter === false ? '' : dependencySource(parameter);
		if (source !== '' && (!available.has(source) || source === parameter.id)) {
			return false;
		}
		if (parameter.id !== undefined && parameter.id !== '') {
			available.add(parameter.id);
		}
	}
	return true;
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
					<FactorioScrollFrame className="blueprint-parameterization__body" aria-label="Blueprint parameters">
						{editableParameters.map(({index, parameter}, editableIndex) => {
							const currentDependency = dependencyOption(parameter);
							const currentSource = dependencySource(parameter);
							const baseSignal = inferredSignal(parameter, pickerOptions);
							const signal =
								baseSignal === undefined || parameter['quality-condition'] === undefined
									? baseSignal
									: {...baseSignal, quality: parameter['quality-condition'].quality};
							const sourceOptions = draftParameters
								.slice(0, index)
								.flatMap((candidate) =>
									candidate.type === 'id' &&
									candidate.parameter !== false &&
									candidate.id !== undefined &&
									candidate.id !== ''
										? [{id: candidate.id, name: candidate.name ?? candidate.id}]
										: [],
								);
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
										<label>
											<span>
												Name
												<span className="transform-visually-hidden">
													{' '}
													for parameter {parameterNumber}
												</span>
											</span>
											<input
												data-dialog-initial-focus={editableIndex === 0 ? 'true' : undefined}
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
											/>
										</label>
										<label>
											<span>Value signal</span>
											<FactorioInventorySlot
												className={`transform-signal-slot${signal === undefined ? ' transform-signal-slot--empty' : ''}`}
												aria-label={`Choose value for parameter ${parameterNumber.toString()}${parameter.name === undefined ? '' : ` ${parameter.name}`}`}
												title={`Choose value for parameter ${parameterNumber.toString()}${parameter.name === undefined ? '' : ` ${parameter.name}`}`}
												onClick={() => {
													setChoosingValueIndex(index);
												}}
											>
												{signal === undefined ? (
													<span aria-hidden="true">+</span>
												) : (
													<FactorioIcon icon={signal} size="large" />
												)}
											</FactorioInventorySlot>
										</label>
										<button
											type="button"
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
										>
											×
										</button>
									</div>

									<div className="blueprint-parameterization__secondary">
										<label>
											<input
												type="checkbox"
												checked={parameter.parameter !== false}
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
											/>{' '}
											Parameter
											<span className="transform-visually-hidden"> {parameterNumber}</span>
										</label>
										<label className="blueprint-parameterization__select-label">
											<span>
												Dependency
												<span className="transform-visually-hidden">
													{' '}
													mode for parameter {parameterNumber}
												</span>
											</span>
											<select
												aria-label={`Parameter ${parameterNumber.toString()} dependency mode`}
												value={currentDependency.value}
												disabled={parameter.parameter === false}
												onChange={(event) => {
													const selected = dependencyOptions.find(
														(option) => option.value === event.currentTarget.value,
													);
													if (selected === undefined) {
														throw new Error(
															`Unknown parameter dependency mode: ${event.currentTarget.value}`,
														);
													}
													updateParameter(index, (current) => {
														const next = withoutDependencies(current);
														const source = currentSource || sourceOptions.at(0)?.id;
														if (selected.field !== undefined && source !== undefined) {
															next[selected.field] = source;
														}
														return next;
													});
												}}
											>
												{dependencyOptions.map((option) => (
													<option key={option.value} value={option.value}>
														{option.label}
													</option>
												))}
											</select>
										</label>
										<label className="blueprint-parameterization__select-label">
											<span>
												Source parameter
												<span className="transform-visually-hidden">
													{' '}
													for parameter {parameterNumber}
												</span>
											</span>
											<select
												aria-label={`Parameter ${parameterNumber.toString()} dependency source`}
												value={currentSource}
												disabled={
													parameter.parameter === false ||
													currentDependency.field === undefined
												}
												onChange={(event) => {
													const source = event.currentTarget.value;
													updateParameter(index, (current) => {
														const option = dependencyOption(current);
														const next = withoutDependencies(current);
														if (option.field !== undefined && source !== '') {
															next[option.field] = source;
														}
														return next;
													});
												}}
											>
												<option value="">Select source</option>
												{currentSource !== '' &&
												!sourceOptions.some((option) => option.id === currentSource) ? (
													<option value={currentSource}>{currentSource} (unavailable)</option>
												) : null}
												{sourceOptions.map((option) => (
													<option key={option.id} value={option.id}>
														{option.name}
													</option>
												))}
											</select>
										</label>
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
						<button
							data-dialog-initial-focus="true"
							type="button"
							className="blueprint-parameterization__add"
							onClick={() => {
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
							}}
						>
							+ Add parameter
						</button>
					</FactorioScrollFrame>
				</div>

				<footer className="blueprint-parameterization__footer">
					<FactorioButton
						kind={FactorioButtonKind.Confirm}
						className="transform-picker__confirm blueprint-parameterization__confirm"
						disabled={!dependenciesValid(draftParameters)}
						title="Confirm Blueprint parametrisation"
						onClick={(event) => {
							event.preventDefault();
							onConfirm(cloneParameters(draftParameters));
						}}
					>
						<span aria-hidden="true">✓</span>
						<span className="transform-picker__confirm-label">Confirm</span>
					</FactorioButton>
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
