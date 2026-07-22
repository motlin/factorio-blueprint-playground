import {useNavigate} from '@tanstack/react-router';
import {useEffect, useMemo, useState} from 'react';

import gameData from '../../../../generated/game-data.json';
import {BlueprintWrapper} from '../../../../parsing/BlueprintWrapper';
import {serializeBlueprint} from '../../../../parsing/blueprintParser';
import type {BlueprintString, SignalID} from '../../../../parsing/types';
import {updateNestedBlueprint} from '../../../../transform/applyAtPath';
import {flattenBook, sortBookByLabel} from '../../../../transform/bookOps';
import {
	analyzeIconReplacements,
	analyzeMetadataIcons,
	analyzeMetadataSubstitution,
	applyIconReplacements,
	applyMetadataSubstitution,
	type IconReplacement,
	type MetadataIconCandidate,
} from '../../../../transform/metadataSubstitution';
import {stripQuality, stripTiles, stripTrains, stripWires} from '../../../../transform/strip';
import {
	analyzeUpgradeRules,
	applyUpgradeRules,
	builtInUpgradeRules,
	findUpgradePlanners,
	parseUpgradePlanner,
	rulesFromUpgradePlanner,
	type UpgradeCandidate,
	type UpgradePlannerSource,
	type UpgradeRule,
} from '../../../../transform/upgradePlanner';
import {FactorioIcon} from '../../../core/icons/FactorioIcon';
import {ButtonGreen} from '../../../ui/ButtonGreen';
import {Panel} from '../../../ui/Panel';
import {Textarea} from '../../../ui/Textarea';
import {ExportActions} from '../../export/ExportActions';

interface TransformPanelProps {
	blueprint?: BlueprintString;
	rootBlueprint?: BlueprintString;
	selectedPath?: string;
}

interface ResolvedRules {
	error: string | undefined;
	rules: UpgradeRule[];
}

interface SignalPickerDialogProps {
	onChoose: (signal: SignalID) => void;
	onClose: () => void;
	options: SignalID[];
	title: string;
}

interface SignalSlotProps {
	label: string;
	onClick?: () => void;
	signal?: SignalID;
}

interface UpgradePlannerDialogProps {
	candidates: UpgradeCandidate[];
	error: string | undefined;
	excludedSources: ReadonlySet<string>;
	onClose: () => void;
	onPlannerInputChange: (value: string) => void;
	onSourceChange: (value: string) => void;
	onTargetChange: (source: SignalID, target: SignalID) => void;
	onToggleCandidate: (source: SignalID, checked: boolean) => void;
	plannerInput: string;
	planners: UpgradePlannerSource[];
	source: string;
}

interface IconReplacementDialogProps {
	candidates: MetadataIconCandidate[];
	onChange: (replacements: IconReplacement[]) => void;
	onClose: () => void;
	replacements: IconReplacement[];
}

const virtualSignals: SignalID[] = gameData.virtualSignals.map((name) => ({type: 'virtual', name}));

function normalizedSignalType(signal: SignalID): string {
	if (signal.type === 'virtual-signal') {
		return 'virtual';
	}
	return signal.type ?? 'item';
}

function signalIdentity(signal: SignalID): string {
	return [normalizedSignalType(signal), signal.name, signal.quality ?? 'normal'].join(':');
}

function signalName(signal: SignalID): string {
	const words = signal.name.replace(/^signal-/, 'signal ').replaceAll('-', ' ');
	return words.slice(0, 1).toUpperCase() + words.slice(1);
}

function signalTitle(signal: SignalID): string {
	return `${signalName(signal)}\n${normalizedSignalType(signal)}:${signal.name}`;
}

function resolveRules(source: string, plannerInput: string, planners: UpgradePlannerSource[]): ResolvedRules {
	try {
		if (source === 'suggested-upgrade') {
			return {error: undefined, rules: builtInUpgradeRules('upgrade')};
		}
		if (source === 'suggested-downgrade') {
			return {error: undefined, rules: builtInUpgradeRules('downgrade')};
		}
		if (source === 'pasted') {
			return {error: undefined, rules: rulesFromUpgradePlanner(parseUpgradePlanner(plannerInput))};
		}
		const path = source.slice('book:'.length);
		const planner = planners.find((candidate) => candidate.path === path);
		if (planner === undefined) {
			throw new Error('The selected upgrade planner is no longer in this book.');
		}
		return {error: undefined, rules: rulesFromUpgradePlanner(planner.planner)};
	} catch (error) {
		return {error: error instanceof Error ? error.message : String(error), rules: []};
	}
}

function upgradeTargetOptions(source: SignalID, currentTarget: SignalID): SignalID[] {
	const adjacent = new Map<string, Set<string>>();
	for (const {from, to} of gameData.nextUpgrades) {
		const fromTargets = adjacent.get(from) ?? new Set<string>();
		fromTargets.add(to);
		adjacent.set(from, fromTargets);
		const toTargets = adjacent.get(to) ?? new Set<string>();
		toTargets.add(from);
		adjacent.set(to, toTargets);
	}
	const visited = new Set([source.name]);
	const pending = [source.name];
	while (pending.length > 0) {
		const current = pending.shift();
		if (current === undefined) {
			break;
		}
		for (const candidate of adjacent.get(current) ?? []) {
			if (!visited.has(candidate)) {
				visited.add(candidate);
				pending.push(candidate);
			}
		}
	}
	if (visited.size === 1) {
		return [currentTarget];
	}
	return [...visited].filter((name) => name !== source.name).map((name) => ({...currentTarget, name}));
}

function SignalSlot({label, onClick, signal}: SignalSlotProps) {
	return (
		<button
			type="button"
			className={`transform-signal-slot${signal === undefined ? ' transform-signal-slot--empty' : ''}`}
			aria-label={label}
			aria-disabled={onClick === undefined}
			title={signal === undefined ? label : signalTitle(signal)}
			onClick={onClick}
		>
			{signal === undefined ? <span aria-hidden="true">+</span> : <FactorioIcon icon={signal} size="large" />}
		</button>
	);
}

function SignalPickerDialog({onChoose, onClose, options, title}: SignalPickerDialogProps) {
	const [search, setSearch] = useState('');
	const normalizedSearch = search.trim().toLowerCase();
	const filteredOptions = options.filter((signal) =>
		normalizedSearch === '' ? true : signalName(signal).toLowerCase().includes(normalizedSearch),
	);

	return (
		<div className="transform-dialog-backdrop">
			<section
				className="transform-dialog transform-dialog--picker"
				role="dialog"
				aria-modal="true"
				aria-label={title}
			>
				<header className="transform-dialog__header">
					<h3>{title}</h3>
					<button
						type="button"
						className="transform-dialog__close"
						aria-label={`Close ${title}`}
						onClick={onClose}
					>
						×
					</button>
				</header>
				<div className="panel-hole transform-picker">
					<div className="panel-hole-inner transform-picker__search">
						<label htmlFor="transform-signal-search">Search</label>
						<input
							id="transform-signal-search"
							type="search"
							value={search}
							onChange={(event) => {
								setSearch(event.currentTarget.value);
							}}
						/>
					</div>
					<div className="transform-picker__grid">
						{filteredOptions.map((signal) => (
							<button
								type="button"
								key={signalIdentity(signal)}
								className="transform-picker__option"
								aria-label={`Choose ${signalName(signal)}`}
								title={signalTitle(signal)}
								onClick={() => {
									onChoose(signal);
								}}
							>
								<FactorioIcon icon={signal} size="large" />
							</button>
						))}
					</div>
				</div>
			</section>
		</div>
	);
}

function UpgradePlannerDialog({
	candidates,
	error,
	excludedSources,
	onClose,
	onPlannerInputChange,
	onSourceChange,
	onTargetChange,
	onToggleCandidate,
	plannerInput,
	planners,
	source,
}: UpgradePlannerDialogProps) {
	const [targetPickerCandidate, setTargetPickerCandidate] = useState<UpgradeCandidate>();

	return (
		<div className="transform-dialog-backdrop">
			<section className="transform-dialog" role="dialog" aria-modal="true" aria-label="Upgrade Planner">
				<header className="transform-dialog__header">
					<h3>Upgrade Planner</h3>
					<button
						type="button"
						className="transform-dialog__close"
						aria-label="Close Upgrade Planner"
						onClick={onClose}
					>
						×
					</button>
				</header>
				<div className="panel-hole upgrade-planner-editor">
					<div className="panel-hole-inner upgrade-planner-editor__source">
						<label htmlFor="upgrade-source">Planner</label>
						<select
							id="upgrade-source"
							value={source}
							onChange={(event) => {
								onSourceChange(event.currentTarget.value);
							}}
						>
							<option value="suggested-upgrade">Suggested upgrades</option>
							<option value="suggested-downgrade">Suggested downgrades</option>
							{planners.map((planner) => (
								<option key={planner.path} value={`book:${planner.path}`}>
									{planner.label}
								</option>
							))}
							<option value="pasted">Pasted upgrade planner</option>
						</select>
					</div>
					{source === 'pasted' ? (
						<div className="upgrade-planner-editor__paste">
							<Textarea
								value={plannerInput}
								onChange={onPlannerInputChange}
								placeholder="Paste an upgrade planner string or JSON"
								rows={3}
							/>
						</div>
					) : null}
					{error === undefined ? null : (
						<p className="panel alert alert-error upgrade-planner-editor__error" role="alert">
							{error}
						</p>
					)}
					<div className="upgrade-planner-editor__mappings">
						{candidates.length === 0 && error === undefined ? (
							<p className="upgrade-planner-editor__empty">
								No matching entities or modules in this scope.
							</p>
						) : (
							candidates.map((candidate) => {
								const sourceKey = signalIdentity(candidate.from);
								const checked = !excludedSources.has(sourceKey);
								return (
									<div key={sourceKey} className="upgrade-planner-editor__mapping">
										<input
											type="checkbox"
											aria-label={`Replace ${candidate.from.name} with ${candidate.to.name}`}
											checked={checked}
											onChange={(event) => {
												onToggleCandidate(candidate.from, event.currentTarget.checked);
											}}
										/>
										<SignalSlot
											label={`Source ${signalName(candidate.from)}`}
											signal={candidate.from}
										/>
										<span className="upgrade-planner-editor__arrow" aria-hidden="true">
											→
										</span>
										<SignalSlot
											label={`Choose target for ${signalName(candidate.from)}`}
											signal={candidate.to}
											onClick={() => {
												setTargetPickerCandidate(candidate);
											}}
										/>
										<strong>{candidate.count}</strong>
									</div>
								);
							})
						)}
					</div>
				</div>
				<div className="transform-dialog__actions">
					<ButtonGreen onClick={onClose}>Done</ButtonGreen>
				</div>
			</section>
			{targetPickerCandidate === undefined ? null : (
				<SignalPickerDialog
					title={`Choose target for ${signalName(targetPickerCandidate.from)}`}
					options={upgradeTargetOptions(targetPickerCandidate.from, targetPickerCandidate.to)}
					onClose={() => {
						setTargetPickerCandidate(undefined);
					}}
					onChoose={(target) => {
						onTargetChange(targetPickerCandidate.from, target);
						setTargetPickerCandidate(undefined);
					}}
				/>
			)}
		</div>
	);
}

function IconReplacementDialog({candidates, onChange, onClose, replacements}: IconReplacementDialogProps) {
	const availableCandidates = candidates.filter(
		(candidate) =>
			!replacements.some((replacement) => signalIdentity(replacement.from) === signalIdentity(candidate.signal)),
	);
	const [draftFrom, setDraftFrom] = useState<SignalID>();
	const [choosingSource, setChoosingSource] = useState(false);
	const [choosingTarget, setChoosingTarget] = useState(false);
	const draftCount = candidates.find(
		(candidate) => draftFrom !== undefined && signalIdentity(candidate.signal) === signalIdentity(draftFrom),
	)?.count;
	const targetOptions =
		draftFrom === undefined
			? []
			: normalizedSignalType(draftFrom) === 'virtual'
				? virtualSignals.filter((signal) => signalIdentity(signal) !== signalIdentity(draftFrom))
				: candidates
						.map((candidate) => candidate.signal)
						.filter(
							(signal) =>
								normalizedSignalType(signal) === normalizedSignalType(draftFrom) &&
								signalIdentity(signal) !== signalIdentity(draftFrom),
						);
	return (
		<div className="transform-dialog-backdrop">
			<section className="transform-dialog" role="dialog" aria-modal="true" aria-label="Icon Replacements">
				<header className="transform-dialog__header">
					<h3>Icon Replacements</h3>
					<button
						type="button"
						className="transform-dialog__close"
						aria-label="Close Icon Replacements"
						onClick={onClose}
					>
						×
					</button>
				</header>
				<div className="panel-hole icon-replacement-editor">
					<div className="icon-replacement-editor__mappings">
						{replacements.map((replacement) => (
							<div key={signalIdentity(replacement.from)} className="icon-replacement-editor__mapping">
								<SignalSlot
									label={`Source ${signalName(replacement.from)}`}
									signal={replacement.from}
								/>
								<span aria-hidden="true">→</span>
								<SignalSlot label={`Target ${signalName(replacement.to)}`} signal={replacement.to} />
								<strong>
									{candidates.find(
										(candidate) =>
											signalIdentity(candidate.signal) === signalIdentity(replacement.from),
									)?.count ?? 0}
								</strong>
								<button
									type="button"
									className="icon-replacement-editor__remove"
									aria-label={`Remove replacement for ${signalName(replacement.from)}`}
									onClick={() => {
										onChange(
											replacements.filter(
												(candidate) =>
													signalIdentity(candidate.from) !== signalIdentity(replacement.from),
											),
										);
									}}
								>
									×
								</button>
							</div>
						))}
					</div>
					<div className="panel-hole-inner icon-replacement-editor__add">
						<SignalSlot
							label="Choose source icon"
							signal={draftFrom}
							onClick={() => {
								setChoosingSource(true);
							}}
						/>
						<span aria-hidden="true">→</span>
						<SignalSlot
							label="Choose target icon"
							onClick={
								draftFrom === undefined
									? undefined
									: () => {
											setChoosingTarget(true);
										}
							}
						/>
						<strong>{draftCount ?? 0}</strong>
						{draftFrom === undefined ? (
							<span aria-hidden="true" />
						) : (
							<button
								type="button"
								className="icon-replacement-editor__remove"
								aria-label={`Clear source ${signalName(draftFrom)}`}
								onClick={() => {
									setDraftFrom(undefined);
								}}
							>
								×
							</button>
						)}
					</div>
				</div>
				<div className="transform-dialog__actions">
					<ButtonGreen onClick={onClose}>Done</ButtonGreen>
				</div>
			</section>
			{choosingSource ? (
				<SignalPickerDialog
					title="Choose source icon used here"
					options={availableCandidates.map((candidate) => candidate.signal)}
					onClose={() => {
						setChoosingSource(false);
					}}
					onChoose={(signal) => {
						setDraftFrom(signal);
						setChoosingSource(false);
					}}
				/>
			) : null}
			{choosingTarget ? (
				<SignalPickerDialog
					title="Choose target icon"
					options={targetOptions}
					onClose={() => {
						setChoosingTarget(false);
					}}
					onChoose={(signal) => {
						if (draftFrom === undefined) {
							throw new Error('An icon replacement requires a source signal.');
						}
						onChange([...replacements, {from: draftFrom, to: signal}]);
						setDraftFrom(undefined);
						setChoosingTarget(false);
					}}
				/>
			) : null}
		</div>
	);
}

export function TransformPanel({blueprint, rootBlueprint = blueprint, selectedPath = ''}: TransformPanelProps) {
	const navigate = useNavigate();
	const [stripQualitySelected, setStripQualitySelected] = useState(false);
	const [stripWiresSelected, setStripWiresSelected] = useState(false);
	const [stripTrainsSelected, setStripTrainsSelected] = useState(false);
	const [stripTilesSelected, setStripTilesSelected] = useState(false);
	const [flattenBookSelected, setFlattenBookSelected] = useState(false);
	const [sortBookSelected, setSortBookSelected] = useState(false);
	const [result, setResult] = useState<BlueprintString>();
	const [upgradePlannerOpen, setUpgradePlannerOpen] = useState(false);
	const [iconReplacementOpen, setIconReplacementOpen] = useState(false);
	const planners = useMemo(
		() => (rootBlueprint === undefined ? [] : findUpgradePlanners(rootBlueprint)),
		[rootBlueprint],
	);
	const [upgradeSource, setUpgradeSource] = useState(() =>
		blueprint?.upgrade_planner === undefined ? 'suggested-upgrade' : `book:${selectedPath}`,
	);
	const [plannerInput, setPlannerInput] = useState('');
	const [upgradeScope, setUpgradeScope] = useState<'selection' | 'root'>(() =>
		blueprint?.upgrade_planner === undefined ? 'selection' : 'root',
	);
	const [excludedSources, setExcludedSources] = useState<Set<string>>(() => new Set());
	const [targetOverrides, setTargetOverrides] = useState<Map<string, SignalID>>(() => new Map());
	const [iconReplacements, setIconReplacements] = useState<IconReplacement[]>([]);
	const [textReplacementEnabled, setTextReplacementEnabled] = useState(true);
	const [metadataFind, setMetadataFind] = useState('');
	const [metadataReplace, setMetadataReplace] = useState('');

	useEffect(() => {
		setResult(undefined);
	}, [blueprint]);

	const type = blueprint === undefined ? undefined : new BlueprintWrapper(blueprint).getType();
	const transformTarget = upgradeScope === 'root' ? rootBlueprint : blueprint;
	const resolvedRules = useMemo(
		() => resolveRules(upgradeSource, plannerInput, planners),
		[upgradeSource, plannerInput, planners],
	);
	const effectiveRules = useMemo(
		() =>
			resolvedRules.rules.map((rule) => ({
				...rule,
				to: targetOverrides.get(signalIdentity(rule.from)) ?? rule.to,
			})),
		[resolvedRules.rules, targetOverrides],
	);
	const candidates = useMemo(
		() => (transformTarget === undefined ? [] : analyzeUpgradeRules(transformTarget, effectiveRules)),
		[transformTarget, effectiveRules],
	);
	const selectedCandidates = useMemo(
		() => candidates.filter((candidate) => !excludedSources.has(signalIdentity(candidate.from))),
		[candidates, excludedSources],
	);
	const upgradeReplacementCount = selectedCandidates.reduce((total, candidate) => total + candidate.count, 0);
	const metadataSubstitution = useMemo(
		() => ({find: metadataFind, replace: metadataReplace, matchCase: false}),
		[metadataFind, metadataReplace],
	);
	const metadataReplacementCount = useMemo(
		() =>
			transformTarget === undefined || metadataFind === ''
				? 0
				: analyzeMetadataSubstitution(transformTarget, metadataSubstitution),
		[transformTarget, metadataFind, metadataSubstitution],
	);
	const metadataIconCandidates = useMemo(
		() => (transformTarget === undefined ? [] : analyzeMetadataIcons(transformTarget)),
		[transformTarget],
	);
	const iconReplacementCount = useMemo(
		() =>
			transformTarget === undefined || iconReplacements.length === 0
				? 0
				: analyzeIconReplacements(transformTarget, iconReplacements),
		[transformTarget, iconReplacements],
	);
	if (blueprint === undefined || type === 'deconstruction-planner') {
		return null;
	}
	const activeUpgradeCount = upgradeReplacementCount;
	const activeIconCount = iconReplacementCount;
	const activeTextCount = textReplacementEnabled ? metadataReplacementCount : 0;
	const replacementCount = activeUpgradeCount + activeIconCount + activeTextCount;
	const canChooseRootScope = rootBlueprint?.blueprint_book !== undefined && selectedPath !== '';
	const hasSelectedStrip = stripQualitySelected || stripWiresSelected || stripTrainsSelected || stripTilesSelected;
	const hasSelectedBookOperation = flattenBookSelected || sortBookSelected;
	const hasPendingChanges = replacementCount > 0 || hasSelectedStrip || hasSelectedBookOperation;
	const firstIconReplacement = iconReplacements.at(0);

	const applyToSelection = (transform: (selected: BlueprintString) => BlueprintString) => {
		if (rootBlueprint === undefined) {
			throw new Error('Cannot apply a transformation without a root blueprint');
		}

		const transformed = updateNestedBlueprint(rootBlueprint, selectedPath, transform);
		if (transformed === null) {
			throw new Error(`Cannot apply a transformation at path ${selectedPath}`);
		}
		setResult(transformed);
	};
	const applyChanges = () => {
		const rules = selectedCandidates.map(({from, preserveQuality, to}) => ({from, preserveQuality, to}));
		const transform = (target: BlueprintString) => {
			let transformed = target;
			if (rules.length > 0) transformed = applyUpgradeRules(transformed, rules);
			if (iconReplacements.length > 0) {
				transformed = applyIconReplacements(transformed, iconReplacements);
			}
			if (textReplacementEnabled && metadataFind !== '') {
				transformed = applyMetadataSubstitution(transformed, metadataSubstitution);
			}
			if (stripQualitySelected) transformed = stripQuality(transformed);
			if (stripWiresSelected) transformed = stripWires(transformed);
			if (stripTrainsSelected) transformed = stripTrains(transformed);
			if (stripTilesSelected) transformed = stripTiles(transformed);
			if (flattenBookSelected) transformed = flattenBook(transformed);
			if (sortBookSelected) transformed = sortBookByLabel(transformed);
			return transformed;
		};
		if (upgradeScope === 'root') {
			if (rootBlueprint === undefined) {
				throw new Error('Cannot apply transformations without a root blueprint');
			}
			setResult(transform(rootBlueprint));
			return;
		}
		applyToSelection(transform);
	};

	const openInPlayground = () => {
		if (result === undefined) {
			throw new Error('Cannot open a transformation before applying it');
		}

		void navigate({
			to: '/',
			search: {
				pasted: serializeBlueprint(result),
				selection: selectedPath,
			},
		});
	};

	return (
		<>
			<Panel title="Transform">
				<div className="panel-hole transform-workflow">
					<div className="panel-hole-inner transform-workflow__scope">
						<strong>Change</strong>
						<select
							aria-label="Apply to"
							value={upgradeScope}
							onChange={(event) => {
								setUpgradeScope(event.currentTarget.value === 'root' ? 'root' : 'selection');
								setExcludedSources(new Set());
							}}
						>
							<option value="selection" disabled={type === 'upgrade-planner'}>
								{canChooseRootScope ? 'This selection' : 'This blueprint or book'}
							</option>
							{canChooseRootScope || type === 'upgrade-planner' ? (
								<option value="root">Entire root book</option>
							) : null}
						</select>
					</div>

					<div className="transform-workflow__operations">
						<button
							type="button"
							className="transform-operation"
							onClick={() => {
								setUpgradePlannerOpen(true);
							}}
						>
							<span className="transform-operation__icon">
								<FactorioIcon icon={{type: 'item', name: 'upgrade-planner'}} size="large" />
							</span>
							<span className="transform-operation__text">
								<strong>Upgrade Planner</strong>
								<small>
									{selectedCandidates.length}{' '}
									{selectedCandidates.length === 1 ? 'mapping' : 'mappings'} ·{' '}
									{upgradeReplacementCount}{' '}
									{upgradeReplacementCount === 1 ? 'replacement' : 'replacements'}
								</small>
							</span>
							<span>Edit…</span>
						</button>

						<button
							type="button"
							className="transform-operation"
							onClick={() => {
								setIconReplacementOpen(true);
							}}
						>
							<span className="transform-operation__icon">
								{firstIconReplacement === undefined ? (
									<span aria-hidden="true">+</span>
								) : (
									<FactorioIcon icon={firstIconReplacement.from} size="large" />
								)}
							</span>
							<span className="transform-operation__text">
								<strong>Icon Replacements</strong>
								<small>
									{iconReplacements.length} {iconReplacements.length === 1 ? 'mapping' : 'mappings'} ·{' '}
									{iconReplacementCount} {iconReplacementCount === 1 ? 'replacement' : 'replacements'}
								</small>
							</span>
							<span>Edit…</span>
						</button>
					</div>

					<fieldset className="transform-workflow__filters">
						<legend>Change in</legend>
						<label>
							<input type="checkbox" checked disabled readOnly /> Entities{' '}
							<strong>{upgradeReplacementCount}</strong>
						</label>
						<label>
							<input type="checkbox" checked disabled readOnly /> Tiles <strong>0</strong>
						</label>
						<label>
							<input type="checkbox" checked disabled readOnly /> Icons{' '}
							<strong>{iconReplacementCount}</strong>
						</label>
						<label>
							<input
								type="checkbox"
								checked={textReplacementEnabled}
								onChange={(event) => {
									setTextReplacementEnabled(event.currentTarget.checked);
								}}
							/>{' '}
							Text <strong>{metadataReplacementCount}</strong>
						</label>
					</fieldset>

					<div className="transform-workflow__text">
						<strong>Text replacement</strong>
						<div>
							<label htmlFor="metadata-find">Find</label>
							<input
								id="metadata-find"
								type="text"
								value={metadataFind}
								onChange={(event) => {
									setMetadataFind(event.currentTarget.value);
								}}
							/>
							<span aria-hidden="true">→</span>
							<label htmlFor="metadata-replace">Replace with</label>
							<input
								id="metadata-replace"
								type="text"
								value={metadataReplace}
								onChange={(event) => {
									setMetadataReplace(event.currentTarget.value);
								}}
							/>
						</div>
					</div>

					{type === 'upgrade-planner' ? null : (
						<details className="transform-workflow__details">
							<summary>Cleanup{hasSelectedStrip ? ' · selected' : ''}</summary>
							<div className="transform-workflow__checks">
								<label>
									<input
										type="checkbox"
										checked={stripQualitySelected}
										onChange={(event) => {
											setStripQualitySelected(event.currentTarget.checked);
										}}
									/>{' '}
									Strip quality
								</label>
								<label>
									<input
										type="checkbox"
										checked={stripWiresSelected}
										onChange={(event) => {
											setStripWiresSelected(event.currentTarget.checked);
										}}
									/>{' '}
									Strip wires
								</label>
								<label>
									<input
										type="checkbox"
										checked={stripTrainsSelected}
										onChange={(event) => {
											setStripTrainsSelected(event.currentTarget.checked);
										}}
									/>{' '}
									Strip trains
								</label>
								<label>
									<input
										type="checkbox"
										checked={stripTilesSelected}
										onChange={(event) => {
											setStripTilesSelected(event.currentTarget.checked);
										}}
									/>{' '}
									Strip tiles
								</label>
							</div>
						</details>
					)}

					{type === 'blueprint-book' ? (
						<details className="transform-workflow__details">
							<summary>Book operations{hasSelectedBookOperation ? ' · selected' : ''}</summary>
							<div className="transform-workflow__checks">
								<label>
									<input
										type="checkbox"
										checked={flattenBookSelected}
										onChange={(event) => {
											setFlattenBookSelected(event.currentTarget.checked);
										}}
									/>{' '}
									Flatten nested books
								</label>
								<label>
									<input
										type="checkbox"
										checked={sortBookSelected}
										onChange={(event) => {
											setSortBookSelected(event.currentTarget.checked);
										}}
									/>{' '}
									Sort entries by label
								</label>
							</div>
						</details>
					) : null}

					<div className="transform-workflow__summary">
						<div>
							<strong>Planned changes</strong>
							<span>
								{replacementCount} replacements
								{hasSelectedStrip ? ' · cleanup selected' : ''}
								{hasSelectedBookOperation ? ' · book operation selected' : ''}
							</span>
						</div>
						<ButtonGreen
							disabled={!hasPendingChanges || resolvedRules.error !== undefined}
							onClick={(event) => {
								event.preventDefault();
								applyChanges();
							}}
						>
							Apply changes
						</ButtonGreen>
					</div>
				</div>
			</Panel>

			{upgradePlannerOpen ? (
				<UpgradePlannerDialog
					candidates={candidates}
					error={resolvedRules.error}
					excludedSources={excludedSources}
					onClose={() => {
						setUpgradePlannerOpen(false);
					}}
					onPlannerInputChange={(value) => {
						setPlannerInput(value);
						setExcludedSources(new Set());
						setTargetOverrides(new Map());
					}}
					onSourceChange={(value) => {
						setUpgradeSource(value);
						setExcludedSources(new Set());
						setTargetOverrides(new Map());
					}}
					onTargetChange={(source, target) => {
						setTargetOverrides((current) => new Map(current).set(signalIdentity(source), target));
					}}
					onToggleCandidate={(source, checked) => {
						setExcludedSources((current) => {
							const next = new Set(current);
							if (checked) next.delete(signalIdentity(source));
							else next.add(signalIdentity(source));
							return next;
						});
					}}
					plannerInput={plannerInput}
					planners={planners}
					source={upgradeSource}
				/>
			) : null}
			{iconReplacementOpen ? (
				<IconReplacementDialog
					candidates={metadataIconCandidates}
					onChange={setIconReplacements}
					onClose={() => {
						setIconReplacementOpen(false);
					}}
					replacements={iconReplacements}
				/>
			) : null}

			{result === undefined ? null : (
				<>
					<ExportActions blueprint={result} title="Transformed Blueprint" />
					<Panel>
						<ButtonGreen
							onClick={(event) => {
								event.preventDefault();
								openInPlayground();
							}}
						>
							Open in Playground
						</ButtonGreen>
					</Panel>
				</>
			)}
		</>
	);
}
