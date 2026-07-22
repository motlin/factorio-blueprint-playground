import {useNavigate} from '@tanstack/react-router';
import {useEffect, useMemo, useState} from 'react';

import gameData from '../../../../generated/game-data.json';
import {BlueprintWrapper} from '../../../../parsing/BlueprintWrapper';
import {serializeBlueprint} from '../../../../parsing/blueprintParser';
import {extractNames} from '../../../../parsing/modDetection/nameExtractor';
import type {
	BlueprintString,
	Quality,
	QualityComparator,
	SignalID,
	UpgradeSourceSignal,
} from '../../../../parsing/types';
import {updateNestedBlueprint} from '../../../../transform/applyAtPath';
import {flattenBook, sortBookByLabel} from '../../../../transform/bookOps';
import {applyBlueprintEditorMetadata, blueprintEditorMetadata} from '../../../../transform/blueprintEditor';
import {
	analyzeIconReplacements,
	analyzeMetadataIcons,
	analyzeMetadataSubstitution,
	applyIconReplacements,
	applyMetadataSubstitution,
	type IconReplacement,
	type MetadataIconCandidate,
} from '../../../../transform/metadataSubstitution';
import {
	blueprintFilterCategories,
	stripModules,
	stripNonTrainEntities,
	stripQuality,
	stripTiles,
	stripTrains,
} from '../../../../transform/strip';
import {
	analyzeUpgradeRules,
	applyUpgradeRules,
	builtInUpgradeRules,
	findUpgradePlanners,
	parseUpgradePlanner,
	rulesFromUpgradePlanner,
	type UpgradeCandidate,
	type UpgradeDirection,
	type UpgradePlannerSource,
	type UpgradeRule,
} from '../../../../transform/upgradePlanner';
import {FactorioIcon} from '../../../core/icons/FactorioIcon';
import {ButtonGreen} from '../../../ui/ButtonGreen';
import {Textarea} from '../../../ui/Textarea';
import {BlueprintExportButtons} from '../../export/ExportActions';

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
	initialQuality?: QualitySelection;
	onChoose: (signal: PickerSignal, preserveQuality?: boolean) => void;
	onClose: () => void;
	options: SignalID[];
	qualityMode?: 'source' | 'target';
	title: string;
}

interface SignalSlotProps {
	label: string;
	onClick?: () => void;
	onContextMenu?: () => void;
	signal?: SignalID;
}

interface UpgradeMappingsEditorProps {
	candidates: UpgradeCandidate[];
	direction: UpgradeDirection;
	error: string | undefined;
	excludedSources: ReadonlySet<string>;
	manualRules: readonly UpgradeRule[];
	onAddManualRule: (rule: UpgradeRule) => void;
	onDirectionChange: (direction: UpgradeDirection) => void;
	onPlannerInputChange: (value: string) => void;
	onRemoveManualRule: (source: UpgradeSourceSignal) => void;
	onSourceChange: (value: string) => void;
	onStripQualityChange: (selected: boolean) => void;
	onTargetChange: (source: SignalID, target: SignalID, preserveQuality: boolean) => void;
	onToggleCandidate: (source: SignalID, checked: boolean) => void;
	plannerInput: string;
	planners: UpgradePlannerSource[];
	source: string;
	sourceOptions: SignalID[];
	stripQualitySelected: boolean;
}

interface IconReplacementDialogProps {
	candidates: MetadataIconCandidate[];
	onChange: (replacements: IconReplacement[]) => void;
	onClose: () => void;
	replacements: IconReplacement[];
}

const virtualSignals: SignalID[] = gameData.virtualSignals.map((name) => ({type: 'virtual', name}));
const qualities = ['normal', 'uncommon', 'rare', 'epic', 'legendary'] as const;
const qualityComparators: readonly QualityComparator[] = ['=', '≠', '<', '≤', '>', '≥'];
type QualitySelection = 'any' | 'preserve' | Exclude<Quality, undefined>;
type PickerSignal = SignalID & {comparator?: QualityComparator};

interface UpgradeTargetOverride {
	preserveQuality: boolean;
	to: SignalID;
}

function normalizedSignalType(signal: SignalID): string {
	if (signal.type === 'virtual-signal') {
		return 'virtual';
	}
	return signal.type ?? 'item';
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

function resolveRules(
	source: string,
	direction: UpgradeDirection,
	plannerInput: string,
	planners: UpgradePlannerSource[],
): ResolvedRules {
	try {
		if (source === 'custom') {
			return {error: undefined, rules: []};
		}
		if (source === 'suggested') {
			return {error: undefined, rules: builtInUpgradeRules(direction)};
		}
		if (source === 'pasted') {
			return {
				error: undefined,
				rules: rulesFromUpgradePlanner(parseUpgradePlanner(plannerInput), direction),
			};
		}
		const path = source.slice('book:'.length);
		const planner = planners.find((candidate) => candidate.path === path);
		if (planner === undefined) {
			throw new Error('The selected upgrade planner is no longer in this book.');
		}
		return {error: undefined, rules: rulesFromUpgradePlanner(planner.planner, direction)};
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
	visited.add(currentTarget.name);
	return [...visited].map((name) => ({...currentTarget, name}));
}

function upgradeSourceOptions(target: BlueprintString | undefined): SignalID[] {
	const options = new Map<string, SignalID>();
	for (const {from, to} of gameData.nextUpgrades) {
		options.set(`entity:${from}`, {type: 'entity', name: from});
		options.set(`entity:${to}`, {type: 'entity', name: to});
	}
	if (target !== undefined) {
		for (const [name, details] of extractNames(target).names) {
			if (details.kinds.has('entity')) {
				options.set(`entity:${name}`, {type: 'entity', name});
			}
			if (details.kinds.has('item')) {
				options.set(`item:${name}`, {type: 'item', name});
			}
		}
	}
	return [...options.values()].sort(
		(left, right) =>
			normalizedSignalType(left).localeCompare(normalizedSignalType(right)) ||
			left.name.localeCompare(right.name),
	);
}

function SignalSlot({label, onClick, onContextMenu, signal}: SignalSlotProps) {
	return (
		<button
			type="button"
			className={`transform-signal-slot${signal === undefined ? ' transform-signal-slot--empty' : ''}`}
			aria-label={label}
			aria-disabled={onClick === undefined}
			title={signal === undefined ? label : signalTitle(signal)}
			onClick={onClick}
			onContextMenu={(event) => {
				if (onContextMenu !== undefined) {
					event.preventDefault();
					onContextMenu();
				}
			}}
		>
			{signal === undefined ? <span aria-hidden="true">+</span> : <FactorioIcon icon={signal} size="large" />}
		</button>
	);
}

function SignalPickerDialog({initialQuality, onChoose, onClose, options, qualityMode, title}: SignalPickerDialogProps) {
	const [search, setSearch] = useState('');
	const [qualitySelection, setQualitySelection] = useState<QualitySelection>(
		initialQuality ?? (qualityMode === 'source' ? 'any' : 'preserve'),
	);
	const [qualityComparator, setQualityComparator] = useState<QualityComparator>('=');
	const normalizedSearch = search.trim().toLowerCase();
	const filteredOptions = options.filter((signal) =>
		normalizedSearch === '' ? true : signalName(signal).toLowerCase().includes(normalizedSearch),
	);
	useEffect(() => {
		const closePicker = (event: KeyboardEvent) => {
			const escapePressed = event.key === 'Escape';
			const clearCursorPressed =
				event.code === 'KeyQ' &&
				!event.altKey &&
				!event.ctrlKey &&
				!event.metaKey &&
				!event.shiftKey &&
				!isTextEditingTarget(event.target);
			if (!escapePressed && !clearCursorPressed) {
				return;
			}
			event.preventDefault();
			event.stopPropagation();
			onClose();
		};
		window.addEventListener('keydown', closePicker);
		return () => {
			window.removeEventListener('keydown', closePicker);
		};
	}, [onClose]);

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
									const selectedSignal: PickerSignal = {...signal};
									if (
										qualitySelection === 'any' ||
										qualitySelection === 'preserve' ||
										qualitySelection === 'normal'
									) {
										delete selectedSignal.quality;
									} else {
										selectedSignal.quality = qualitySelection;
									}
									if (qualityMode === 'source' && qualitySelection !== 'any') {
										selectedSignal.comparator = qualityComparator;
									}
									onChoose(selectedSignal, qualitySelection === 'preserve');
								}}
							>
								<FactorioIcon icon={signal} size="large" />
							</button>
						))}
					</div>
					{qualityMode === undefined ? null : (
						<div
							className="transform-picker__qualities"
							role="group"
							aria-label={`${signalName({name: qualityMode})} quality`}
						>
							<button
								type="button"
								aria-pressed={qualitySelection === (qualityMode === 'source' ? 'any' : 'preserve')}
								onClick={() => {
									setQualitySelection(qualityMode === 'source' ? 'any' : 'preserve');
								}}
							>
								{qualityMode === 'source' ? 'Any quality' : 'Set as source'}
							</button>
							{qualityMode === 'source' ? (
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
										setQualityComparator(comparator);
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
										setQualitySelection(quality);
									}}
								>
									<FactorioIcon icon={{type: 'quality', name: quality}} size="small" />
								</button>
							))}
						</div>
					)}
				</div>
			</section>
		</div>
	);
}

function UpgradeMappingsEditor({
	candidates,
	direction,
	error,
	excludedSources,
	manualRules,
	onAddManualRule,
	onDirectionChange,
	onPlannerInputChange,
	onRemoveManualRule,
	onSourceChange,
	onStripQualityChange,
	onTargetChange,
	onToggleCandidate,
	plannerInput,
	planners,
	source,
	sourceOptions,
	stripQualitySelected,
}: UpgradeMappingsEditorProps) {
	const [targetPickerCandidate, setTargetPickerCandidate] = useState<UpgradeCandidate>();
	const [manualSourcePickerOpen, setManualSourcePickerOpen] = useState(false);
	const [pendingManualSource, setPendingManualSource] = useState<UpgradeSourceSignal>();
	const manualSourceKeys = new Set(manualRules.map((rule) => signalIdentity(rule.from)));

	return (
		<>
			<div className="panel-hole upgrade-planner-editor">
				<div className="upgrade-planner-editor__modes" role="group" aria-label="Planner operation">
					<button
						type="button"
						aria-pressed={direction === 'upgrade'}
						onClick={() => {
							onDirectionChange('upgrade');
						}}
					>
						<span aria-hidden="true">↑</span> Upgrade
					</button>
					<button
						type="button"
						aria-pressed={direction === 'downgrade'}
						onClick={() => {
							onDirectionChange('downgrade');
						}}
					>
						<span aria-hidden="true">↓</span> Downgrade
					</button>
					<button
						type="button"
						aria-pressed={stripQualitySelected}
						onClick={() => {
							onStripQualityChange(!stripQualitySelected);
						}}
					>
						<span aria-hidden="true">◇</span> Strip quality
					</button>
				</div>
				<div className="panel-hole-inner upgrade-planner-editor__source">
					<label htmlFor="upgrade-source">Planner</label>
					<select
						id="upgrade-source"
						value={source}
						onChange={(event) => {
							onSourceChange(event.currentTarget.value);
						}}
					>
						<option value="suggested">Built-in suggestions</option>
						<option value="custom">Custom mappings</option>
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
						<p className="upgrade-planner-editor__empty">No matching entities or modules in this scope.</p>
					) : (
						<>
							<div className="upgrade-planner-editor__mapping-headings" aria-hidden="true">
								<span />
								<span>From</span>
								<span />
								<span>To</span>
								<span>Matches</span>
								<span />
							</div>
							{candidates.map((candidate) => {
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
										{manualSourceKeys.has(sourceKey) ? (
											<button
												type="button"
												className="upgrade-planner-editor__remove"
												aria-label={`Remove mapping from ${signalName(candidate.from)}`}
												onClick={() => {
													onRemoveManualRule(candidate.from);
												}}
											>
												×
											</button>
										) : (
											<span />
										)}
									</div>
								);
							})}
						</>
					)}
				</div>
				<button
					type="button"
					className="upgrade-planner-editor__add"
					onClick={() => {
						setManualSourcePickerOpen(true);
					}}
				>
					+ Add mapping
				</button>
			</div>
			{targetPickerCandidate === undefined ? null : (
				<SignalPickerDialog
					initialQuality={
						targetPickerCandidate.preserveQuality
							? 'preserve'
							: (targetPickerCandidate.to.quality ?? 'normal')
					}
					title={`Choose target for ${signalName(targetPickerCandidate.from)}`}
					options={upgradeTargetOptions(targetPickerCandidate.from, targetPickerCandidate.to)}
					qualityMode="target"
					onClose={() => {
						setTargetPickerCandidate(undefined);
					}}
					onChoose={(target, preserveQuality = false) => {
						onTargetChange(targetPickerCandidate.from, target, preserveQuality);
						setTargetPickerCandidate(undefined);
					}}
				/>
			)}
			{manualSourcePickerOpen ? (
				<SignalPickerDialog
					title="Choose mapping source"
					options={sourceOptions}
					qualityMode="source"
					onClose={() => {
						setManualSourcePickerOpen(false);
					}}
					onChoose={(sourceSignal) => {
						setPendingManualSource(sourceSignal);
						setManualSourcePickerOpen(false);
					}}
				/>
			) : null}
			{pendingManualSource === undefined ? null : (
				<SignalPickerDialog
					title={`Choose target for ${signalName(pendingManualSource)}`}
					options={sourceOptions.filter(
						(option) => normalizedSignalType(option) === normalizedSignalType(pendingManualSource),
					)}
					qualityMode="target"
					onClose={() => {
						setPendingManualSource(undefined);
					}}
					onChoose={(target, preserveQuality = false) => {
						onAddManualRule({from: pendingManualSource, preserveQuality, to: target});
						setPendingManualSource(undefined);
					}}
				/>
			)}
		</>
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
	const [stripEntitiesSelected, setStripEntitiesSelected] = useState(false);
	const [stripModulesSelected, setStripModulesSelected] = useState(false);
	const [stripTrainsSelected, setStripTrainsSelected] = useState(false);
	const [stripTilesSelected, setStripTilesSelected] = useState(false);
	const [flattenBookSelected, setFlattenBookSelected] = useState(false);
	const [sortBookSelected, setSortBookSelected] = useState(false);
	const [blueprintEditorEnabled, setBlueprintEditorEnabled] = useState(false);
	const [blueprintEditorOpen, setBlueprintEditorOpen] = useState(false);
	const [upgradeEnabled, setUpgradeEnabled] = useState(false);
	const [upgradePlannerOpen, setUpgradePlannerOpen] = useState(false);
	const [iconReplacementOpen, setIconReplacementOpen] = useState(false);
	const planners = useMemo(
		() => (rootBlueprint === undefined ? [] : findUpgradePlanners(rootBlueprint)),
		[rootBlueprint],
	);
	const [upgradeDirection, setUpgradeDirection] = useState<UpgradeDirection>('upgrade');
	const [upgradeSource, setUpgradeSource] = useState(() =>
		blueprint?.upgrade_planner === undefined ? 'suggested' : `book:${selectedPath}`,
	);
	const [plannerInput, setPlannerInput] = useState('');
	const [upgradeScope, setUpgradeScope] = useState<'selection' | 'root'>(() =>
		blueprint?.upgrade_planner === undefined ? 'selection' : 'root',
	);
	const [excludedSources, setExcludedSources] = useState<Set<string>>(() => new Set());
	const [targetOverrides, setTargetOverrides] = useState<Map<string, UpgradeTargetOverride>>(() => new Map());
	const [manualRules, setManualRules] = useState<UpgradeRule[]>([]);
	const [iconReplacements, setIconReplacements] = useState<IconReplacement[]>([]);
	const [textReplacementEnabled, setTextReplacementEnabled] = useState(true);
	const [metadataFind, setMetadataFind] = useState('');
	const [metadataReplace, setMetadataReplace] = useState('');
	const [editorLabel, setEditorLabel] = useState('');
	const [editorDescription, setEditorDescription] = useState('');
	const [editorIcons, setEditorIcons] = useState<SignalID[]>([]);
	const [editorIconPickerIndex, setEditorIconPickerIndex] = useState<number>();

	const type = blueprint === undefined ? undefined : new BlueprintWrapper(blueprint).getType();
	useEffect(() => {
		if (blueprint?.blueprint === undefined && blueprint?.blueprint_book === undefined) {
			return;
		}
		const metadata = blueprintEditorMetadata(blueprint);
		setEditorLabel(metadata.label);
		setEditorDescription(metadata.description);
		const nextIcons = [...metadata.icons]
			.sort((left, right) => left.index - right.index)
			.map((icon) => icon.signal);
		setEditorIcons((current) =>
			current.length === nextIcons.length &&
			current.every((signal, index) => signalIdentity(signal) === signalIdentity(nextIcons[index]))
				? current
				: nextIcons,
		);
	}, [blueprint, selectedPath]);
	useEffect(() => {
		const openTool = (event: KeyboardEvent) => {
			if (!event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) {
				return;
			}
			if (isTextEditingTarget(event.target)) {
				return;
			}
			if (event.code === 'KeyB' && type !== 'upgrade-planner') {
				event.preventDefault();
				setUpgradePlannerOpen(false);
				setBlueprintEditorEnabled(true);
				setBlueprintEditorOpen(true);
			} else if (event.code === 'KeyU') {
				event.preventDefault();
				setBlueprintEditorOpen(false);
				setUpgradeEnabled(true);
				setUpgradePlannerOpen(true);
			}
		};
		window.addEventListener('keydown', openTool);
		return () => {
			window.removeEventListener('keydown', openTool);
		};
	}, [type]);
	const transformTarget = upgradeScope === 'root' ? rootBlueprint : blueprint;
	const resolvedRules = useMemo(
		() => resolveRules(upgradeSource, upgradeDirection, plannerInput, planners),
		[upgradeSource, upgradeDirection, plannerInput, planners],
	);
	const manualSourceKeys = useMemo(
		() => new Set(manualRules.map((rule) => signalIdentity(rule.from))),
		[manualRules],
	);
	const effectiveRules = useMemo(() => {
		const combinedRules = [
			...resolvedRules.rules.filter((rule) => !manualSourceKeys.has(signalIdentity(rule.from))),
			...manualRules,
		];
		return combinedRules.map((rule) => {
			const override = targetOverrides.get(signalIdentity(rule.from));
			return override === undefined ? rule : {...rule, ...override};
		});
	}, [manualRules, manualSourceKeys, resolvedRules.rules, targetOverrides]);
	const sourceOptions = useMemo(() => upgradeSourceOptions(transformTarget), [transformTarget]);
	const editorIconOptions = useMemo(() => {
		const options = new Map<string, SignalID>();
		for (const signal of [...virtualSignals, ...sourceOptions, ...editorIcons]) {
			options.set(signalIdentity(signal), signal);
		}
		return [...options.values()];
	}, [editorIcons, sourceOptions]);
	const editorFilters = useMemo(() => blueprintFilterCategories(blueprint ?? {}), [blueprint]);
	const editorEntityFilterCount = [editorFilters.entities, editorFilters.tiles, editorFilters.trains].filter(
		Boolean,
	).length;
	const showEditorEntityFilters = editorEntityFilterCount > 1;
	const showEditorFilters = editorFilters.modules || showEditorEntityFilters;
	const candidates = useMemo(() => {
		if (transformTarget === undefined) {
			return [];
		}
		const matches = analyzeUpgradeRules(transformTarget, effectiveRules);
		const counts = new Map(matches.map((candidate) => [signalIdentity(candidate.from), candidate.count]));
		if (upgradeSource === 'suggested') {
			return effectiveRules.flatMap((rule) => {
				const count = counts.get(signalIdentity(rule.from));
				return count === undefined && !manualSourceKeys.has(signalIdentity(rule.from))
					? []
					: [{...rule, count: count ?? 0}];
			});
		}
		return effectiveRules.map((rule) => ({...rule, count: counts.get(signalIdentity(rule.from)) ?? 0}));
	}, [transformTarget, effectiveRules, manualSourceKeys, upgradeSource]);
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
	const transformedBlueprint = useMemo(() => {
		if (rootBlueprint === undefined || resolvedRules.error !== undefined) {
			return undefined;
		}
		const rules = upgradeEnabled
			? selectedCandidates.map(({from, preserveQuality, to}) => ({from, preserveQuality, to}))
			: [];
		const transformGlobal = (target: BlueprintString) => {
			let transformed = target;
			if (rules.length > 0) transformed = applyUpgradeRules(transformed, rules);
			if (iconReplacements.length > 0) transformed = applyIconReplacements(transformed, iconReplacements);
			if (textReplacementEnabled && metadataFind !== '') {
				transformed = applyMetadataSubstitution(transformed, metadataSubstitution);
			}
			if (stripQualitySelected) transformed = stripQuality(transformed);
			return transformed;
		};
		const transformEditor = (target: BlueprintString) => {
			let transformed = target;
			if (
				blueprintEditorEnabled &&
				(transformed.blueprint !== undefined || transformed.blueprint_book !== undefined)
			) {
				transformed = applyBlueprintEditorMetadata(transformed, {
					description: editorDescription,
					icons: editorIcons.map((signal, index) => ({index: index + 1, signal})),
					label: editorLabel,
				});
			}
			if (stripTrainsSelected) transformed = stripTrains(transformed);
			if (stripEntitiesSelected) transformed = stripNonTrainEntities(transformed);
			if (stripModulesSelected) transformed = stripModules(transformed);
			if (stripTilesSelected) transformed = stripTiles(transformed);
			if (flattenBookSelected) transformed = flattenBook(transformed);
			if (sortBookSelected) transformed = sortBookByLabel(transformed);
			return transformed;
		};
		const globallyTransformed =
			upgradeScope === 'root'
				? transformGlobal(rootBlueprint)
				: (updateNestedBlueprint(rootBlueprint, selectedPath, transformGlobal) ?? undefined);
		return globallyTransformed === undefined
			? undefined
			: (updateNestedBlueprint(globallyTransformed, selectedPath, transformEditor) ?? undefined);
	}, [
		blueprintEditorEnabled,
		editorDescription,
		editorIcons,
		editorLabel,
		flattenBookSelected,
		iconReplacements,
		metadataFind,
		metadataSubstitution,
		resolvedRules.error,
		rootBlueprint,
		selectedCandidates,
		selectedPath,
		sortBookSelected,
		stripQualitySelected,
		stripEntitiesSelected,
		stripModulesSelected,
		stripTilesSelected,
		stripTrainsSelected,
		textReplacementEnabled,
		upgradeEnabled,
		upgradeScope,
	]);
	if (blueprint === undefined || type === 'deconstruction-planner') {
		return null;
	}
	const activeUpgradeCount = upgradeEnabled ? upgradeReplacementCount : 0;
	const activeIconCount = iconReplacementCount;
	const activeTextCount = textReplacementEnabled ? metadataReplacementCount : 0;
	const plannerReplacementCount = activeUpgradeCount + activeIconCount + activeTextCount;
	const canChooseRootScope = rootBlueprint?.blueprint_book !== undefined && selectedPath !== '';
	const hasSelectedBookOperation = flattenBookSelected || sortBookSelected;
	const openInPlayground = () => {
		if (transformedBlueprint === undefined) {
			throw new Error('Cannot open a transformation while its configuration is invalid');
		}

		setBlueprintEditorOpen(false);
		setIconReplacementOpen(false);
		setUpgradePlannerOpen(false);
		void navigate({
			to: '/',
			search: {
				pasted: serializeBlueprint(transformedBlueprint),
				selection: selectedPath,
			},
		});
	};

	return (
		<>
			<div className="transform-toolbelt" role="toolbar" aria-label="Blueprint tools">
				{type === 'upgrade-planner' ? null : (
					<button
						type="button"
						className="transform-toolbelt__button"
						aria-label="Open Blueprint Editor"
						aria-expanded={blueprintEditorOpen}
						title="Blueprint editor (Alt+B)"
						onClick={() => {
							setUpgradePlannerOpen(false);
							setBlueprintEditorEnabled(true);
							setBlueprintEditorOpen(true);
						}}
					>
						<span className="transform-toolbelt__icon">
							<FactorioIcon icon={{type: 'item', name: 'blueprint'}} size="large" />
						</span>
						<span>
							Blueprint editor <kbd>Alt+B</kbd>
						</span>
					</button>
				)}
				<button
					type="button"
					className="transform-toolbelt__button"
					aria-label="Open Upgrade Planner"
					aria-expanded={upgradePlannerOpen}
					title="Upgrade planner (Alt+U)"
					onClick={() => {
						setBlueprintEditorOpen(false);
						setUpgradeEnabled(true);
						setUpgradePlannerOpen(true);
					}}
				>
					<span className="transform-toolbelt__icon">
						<FactorioIcon icon={{type: 'item', name: 'upgrade-planner'}} size="large" />
					</span>
					<span>
						Upgrade planner <kbd>Alt+U</kbd>
					</span>
				</button>
			</div>

			{upgradePlannerOpen ? (
				<div className="transform-dialog-backdrop transform-workbench-backdrop">
					<section
						className="transform-dialog transform-workbench"
						role="dialog"
						aria-modal="true"
						aria-label="Upgrade Planner"
					>
						<header className="transform-dialog__header transform-workbench__header">
							<div className="transform-workbench__title">
								<FactorioIcon icon={{type: 'item', name: 'upgrade-planner'}} size="large" />
								<div>
									<h3>Upgrade Planner</h3>
									<span>Changes update the result immediately</span>
								</div>
							</div>
							<div
								className="transform-workbench__status"
								aria-label={`${plannerReplacementCount.toString()} ${
									plannerReplacementCount === 1 ? 'replacement ready' : 'replacements ready'
								}${stripQualitySelected ? ', strip quality selected' : ''}`}
							>
								<strong>{plannerReplacementCount}</strong>
								<span>
									{plannerReplacementCount === 1 ? 'replacement ready' : 'replacements ready'}
									{stripQualitySelected ? ' · strip quality' : ''}
								</span>
							</div>
							<button
								type="button"
								className="transform-dialog__close"
								aria-label="Close Upgrade Planner"
								onClick={() => {
									setUpgradePlannerOpen(false);
								}}
							>
								×
							</button>
						</header>

						<div className="transform-workbench__body">
							<div className="panel-hole transform-workflow">
								<div className="panel-hole-inner transform-workflow__scope">
									<strong>Change</strong>
									<select
										aria-label="Apply to"
										value={upgradeScope}
										onChange={(event) => {
											setUpgradeScope(
												event.currentTarget.value === 'root' ? 'root' : 'selection',
											);
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

								<UpgradeMappingsEditor
									candidates={candidates}
									direction={upgradeDirection}
									error={resolvedRules.error}
									excludedSources={excludedSources}
									manualRules={manualRules}
									onAddManualRule={(rule) => {
										setManualRules((current) => [
											...current.filter(
												(candidate) =>
													signalIdentity(candidate.from) !== signalIdentity(rule.from),
											),
											rule,
										]);
									}}
									onDirectionChange={(direction) => {
										setUpgradeDirection(direction);
										setExcludedSources(new Set());
										setTargetOverrides(new Map());
									}}
									onPlannerInputChange={(value) => {
										setPlannerInput(value);
										setExcludedSources(new Set());
										setTargetOverrides(new Map());
									}}
									onRemoveManualRule={(source) => {
										setManualRules((current) =>
											current.filter(
												(candidate) =>
													signalIdentity(candidate.from) !== signalIdentity(source),
											),
										);
									}}
									onSourceChange={(value) => {
										setUpgradeSource(value);
										setExcludedSources(new Set());
										setTargetOverrides(new Map());
									}}
									onStripQualityChange={setStripQualitySelected}
									onTargetChange={(source, target, preserveQuality) => {
										setTargetOverrides((current) =>
											new Map(current).set(signalIdentity(source), {preserveQuality, to: target}),
										);
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
									sourceOptions={sourceOptions}
									stripQualitySelected={stripQualitySelected}
								/>

								<section
									className="transform-workflow__section transform-workflow__website-replacements"
									aria-labelledby="transform-website-replacements-heading"
								>
									<h4 id="transform-website-replacements-heading">Book-wide replacements</h4>
									<div className="transform-workflow__operations">
										<button
											type="button"
											className="transform-operation"
											onClick={() => {
												setIconReplacementOpen(true);
											}}
										>
											<span className="transform-operation__icon">
												<span aria-hidden="true">+</span>
											</span>
											<span className="transform-operation__text">
												<strong>Icon replacements</strong>
												<small>
													{iconReplacements.length}{' '}
													{iconReplacements.length === 1 ? 'mapping' : 'mappings'} ·{' '}
													{iconReplacementCount}{' '}
													{iconReplacementCount === 1 ? 'replacement' : 'replacements'}
												</small>
											</span>
											<span>Edit…</span>
										</button>
									</div>

									<div className="transform-workflow__text">
										<label className="transform-workflow__text-toggle">
											<input
												type="checkbox"
												checked={textReplacementEnabled}
												onChange={(event) => {
													setTextReplacementEnabled(event.currentTarget.checked);
												}}
											/>{' '}
											Text replacement <strong>{metadataReplacementCount}</strong>
										</label>
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
								</section>
							</div>
						</div>

						<footer className="transform-workbench__footer">
							{transformedBlueprint === undefined ? (
								<span className="transform-workbench__invalid">Fix the planner error to export.</span>
							) : (
								<BlueprintExportButtons blueprint={transformedBlueprint} path={selectedPath} />
							)}
							<ButtonGreen
								disabled={transformedBlueprint === undefined}
								onClick={(event) => {
									event.preventDefault();
									openInPlayground();
								}}
							>
								Open in Playground
							</ButtonGreen>
						</footer>
					</section>
				</div>
			) : null}
			{blueprintEditorOpen ? (
				<div className="transform-dialog-backdrop transform-workbench-backdrop">
					<section
						className="transform-dialog transform-workbench"
						role="dialog"
						aria-modal="true"
						aria-label="Blueprint Editor"
					>
						<header className="transform-dialog__header transform-workbench__header">
							<div className="transform-workbench__title">
								<FactorioIcon icon={{type: 'item', name: 'blueprint'}} size="large" />
								<div>
									<h3>Blueprint Editor</h3>
									<span>Changes update the result immediately</span>
								</div>
							</div>
							<button
								type="button"
								className="transform-dialog__close"
								aria-label="Close Blueprint Editor"
								onClick={() => {
									setBlueprintEditorOpen(false);
								}}
							>
								×
							</button>
						</header>

						<div className="transform-workbench__body">
							<div className="panel-hole transform-workflow">
								<div className="panel-hole-inner blueprint-editor__name">
									<label htmlFor="blueprint-editor-name">Name</label>
									<input
										id="blueprint-editor-name"
										type="text"
										value={editorLabel}
										onChange={(event) => {
											setEditorLabel(event.currentTarget.value);
										}}
									/>
								</div>

								<section
									className="transform-workflow__section blueprint-editor__icons"
									aria-labelledby="blueprint-editor-icons-heading"
								>
									<h4 id="blueprint-editor-icons-heading">Icon</h4>
									<div>
										{[0, 1, 2, 3].map((index) => {
											const icon = editorIcons.at(index);
											return (
												<SignalSlot
													key={index}
													label={`${icon === undefined ? 'Choose' : 'Edit'} icon ${(index + 1).toString()}`}
													signal={icon}
													onClick={() => {
														setEditorIconPickerIndex(index);
													}}
													onContextMenu={
														icon === undefined
															? undefined
															: () => {
																	setEditorIcons((current) =>
																		current.filter(
																			(_signal, iconIndex) => iconIndex !== index,
																		),
																	);
																}
													}
												/>
											);
										})}
									</div>
									<small>Left-click to edit. Right-click to remove.</small>
								</section>

								<section
									className="transform-workflow__section blueprint-editor__description"
									aria-labelledby="blueprint-editor-description-heading"
								>
									<h4 id="blueprint-editor-description-heading">Description</h4>
									<textarea
										aria-label="Blueprint description"
										value={editorDescription}
										onChange={(event) => {
											setEditorDescription(event.currentTarget.value);
										}}
									/>
								</section>

								{showEditorFilters ? (
									<section
										className="transform-workflow__section"
										aria-labelledby="blueprint-editor-filters-heading"
									>
										<h4 id="blueprint-editor-filters-heading">Filters</h4>
										<div className="transform-workflow__checks">
											{editorFilters.modules ? (
												<label>
													<input
														type="checkbox"
														checked={!stripModulesSelected}
														onChange={(event) => {
															setStripModulesSelected(!event.currentTarget.checked);
														}}
													/>{' '}
													Modules
												</label>
											) : null}
											{showEditorEntityFilters && editorFilters.entities ? (
												<label>
													<input
														type="checkbox"
														checked={!stripEntitiesSelected}
														onChange={(event) => {
															setStripEntitiesSelected(!event.currentTarget.checked);
														}}
													/>{' '}
													Entities
												</label>
											) : null}
											{showEditorEntityFilters && editorFilters.trains ? (
												<label>
													<input
														type="checkbox"
														checked={!stripTrainsSelected}
														onChange={(event) => {
															setStripTrainsSelected(!event.currentTarget.checked);
														}}
													/>{' '}
													Trains
												</label>
											) : null}
											{showEditorEntityFilters && editorFilters.tiles ? (
												<label>
													<input
														type="checkbox"
														checked={!stripTilesSelected}
														onChange={(event) => {
															setStripTilesSelected(!event.currentTarget.checked);
														}}
													/>{' '}
													Tiles
												</label>
											) : null}
										</div>
									</section>
								) : null}
								{type === 'blueprint-book' ? (
									<section
										className="transform-workflow__section"
										aria-labelledby="transform-book-operations-heading"
									>
										<h4 id="transform-book-operations-heading">
											Book operations{hasSelectedBookOperation ? ' · selected' : ''}
										</h4>
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
									</section>
								) : null}
							</div>
						</div>

						<footer className="transform-workbench__footer">
							{transformedBlueprint === undefined ? (
								<span className="transform-workbench__invalid">Fix the editor error to export.</span>
							) : (
								<BlueprintExportButtons blueprint={transformedBlueprint} path={selectedPath} />
							)}
							<ButtonGreen
								disabled={transformedBlueprint === undefined}
								onClick={(event) => {
									event.preventDefault();
									openInPlayground();
								}}
							>
								Open in Playground
							</ButtonGreen>
						</footer>
					</section>
				</div>
			) : null}
			{editorIconPickerIndex === undefined ? null : (
				<SignalPickerDialog
					title={`Choose label icon ${(editorIconPickerIndex + 1).toString()}`}
					options={editorIconOptions}
					onClose={() => {
						setEditorIconPickerIndex(undefined);
					}}
					onChoose={(signal) => {
						setEditorIcons((current) => {
							const next = [...current];
							next[Math.min(editorIconPickerIndex, current.length)] = signal;
							return next;
						});
						setEditorIconPickerIndex(undefined);
					}}
				/>
			)}
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
		</>
	);
}
