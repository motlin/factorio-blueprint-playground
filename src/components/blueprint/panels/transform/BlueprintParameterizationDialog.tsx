import {useId, useMemo, useState} from 'react';

import type {Parameter, SignalID} from '../../../../parsing/types';
import {FactorioIcon} from '../../../core/icons/FactorioIcon';
import {ButtonGreen} from '../../../ui/ButtonGreen';
import {SignalPickerDialog} from './SignalPickerDialog';

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

export function BlueprintParameterizationDialog({
	dialogId,
	onClose,
	onConfirm,
	parameters,
	signalOptions,
}: BlueprintParameterizationDialogProps) {
	const dialogTitleId = useId();
	const [draftParameters, setDraftParameters] = useState(() => cloneParameters(parameters));
	const [choosingValueIndex, setChoosingValueIndex] = useState<number>();
	const editableParameters = draftParameters.flatMap((parameter, index) =>
		parameter.type === 'id' ? [{index, parameter}] : [],
	);
	const unsupportedCount = draftParameters.length - editableParameters.length;
	const pickerOptions = useMemo(
		() => parameterPickerOptions(draftParameters, signalOptions),
		[draftParameters, signalOptions],
	);
	const choosingParameter = choosingValueIndex === undefined ? undefined : draftParameters[choosingValueIndex];

	const updateParameter = (index: number, update: (parameter: Parameter) => Parameter) => {
		setDraftParameters((current) =>
			current.map((parameter, parameterIndex) => (parameterIndex === index ? update(parameter) : parameter)),
		);
	};

	return (
		<div className="transform-dialog-backdrop blueprint-parameterization__backdrop">
			<section
				id={dialogId}
				className="transform-dialog blueprint-parameterization"
				role="dialog"
				aria-modal="true"
				aria-labelledby={dialogTitleId}
				onKeyDown={(event) => {
					if (event.key === 'Escape') {
						event.preventDefault();
						event.stopPropagation();
						onClose();
					}
				}}
			>
				<header className="transform-dialog__header blueprint-parameterization__header">
					<h3 id={dialogTitleId}>Blueprint parametrisation</h3>
					<button
						type="button"
						className="transform-dialog__close"
						aria-label="Close Blueprint parametrisation"
						onClick={onClose}
					>
						×
					</button>
				</header>

				<div className="panel-hole blueprint-parameterization__body">
					<p className="blueprint-parameterization__order">
						Parameters are evaluated top to bottom. Dependencies can only target parameters above them.
					</p>
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
						return (
							<div className="blueprint-parameterization__row" key={index}>
								<div className="blueprint-parameterization__primary">
									<label>
										<span>Name</span>
										<input
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
										<button
											type="button"
											className={`transform-signal-slot${signal === undefined ? ' transform-signal-slot--empty' : ''}`}
											aria-label={`Choose value for parameter ${parameterNumber.toString()}${parameter.name === undefined ? '' : ` ${parameter.name}`}`}
											title={parameter.id}
											onClick={() => {
												setChoosingValueIndex(index);
											}}
										>
											{signal === undefined ? (
												<span aria-hidden="true">+</span>
											) : (
												<FactorioIcon icon={signal} size="large" />
											)}
										</button>
									</label>
									<button
										type="button"
										className="blueprint-parameterization__remove"
										aria-label={`Remove parameter ${parameterNumber.toString()}${parameter.name === undefined ? '' : ` ${parameter.name}`}`}
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
													const next = checked ? {...current} : withoutDependencies(current);
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
									</label>
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
									<select
										aria-label={`Parameter ${parameterNumber.toString()} dependency source`}
										value={currentSource}
										disabled={
											parameter.parameter === false || currentDependency.field === undefined
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
								</div>
							</div>
						);
					})}

					{editableParameters.length === 0 ? (
						<p className="blueprint-parameterization__empty">No editable signal parameters.</p>
					) : null}
					{unsupportedCount === 0 ? null : (
						<p className="blueprint-parameterization__preserved">
							{unsupportedCount} unsupported {unsupportedCount === 1 ? 'parameter is' : 'parameters are'}{' '}
							preserved unchanged.
						</p>
					)}
					<button
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
				</div>

				<footer className="blueprint-parameterization__footer">
					<ButtonGreen
						disabled={!dependenciesValid(draftParameters)}
						onClick={(event) => {
							event.preventDefault();
							onConfirm(cloneParameters(draftParameters));
						}}
					>
						<span aria-hidden="true">✓</span>
						<span>Confirm</span>
					</ButtonGreen>
				</footer>
			</section>

			{choosingValueIndex === undefined || choosingParameter?.type !== 'id' ? null : (
				<SignalPickerDialog
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
		</div>
	);
}
