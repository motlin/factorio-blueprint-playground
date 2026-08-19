import {useNavigate} from '@tanstack/react-router';
import {useMemo, useState} from 'react';

import gameData from '../../../../generated/game-data.json';
import {BlueprintWrapper} from '../../../../parsing/BlueprintWrapper';
import {serializeBlueprint} from '../../../../parsing/blueprintParser';
import type {BlueprintString, Quality, SignalID} from '../../../../parsing/types';
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
	onChoose: (signal: SignalID, preserveQuality?: boolean) => void;
	onClose: () => void;
	options: SignalID[];
	showQuality?: boolean;
	title: string;
}

interface SignalSlotProps {
	label: string;
	onClick?: () => void;
	signal?: SignalID;
}

interface UpgradeMappingsEditorProps {
	candidates: UpgradeCandidate[];
	direction: UpgradeDirection;
	error: string | undefined;
	excludedSources: ReadonlySet<string>;
	onDirectionChange: (direction: UpgradeDirection) => void;
	onPlannerInputChange: (value: string) => void;
	onSourceChange: (value: string) => void;
	onStripQualityChange: (selected: boolean) => void;
	onTargetChange: (source: SignalID, target: SignalID, preserveQuality: boolean) => void;
	onToggleCandidate: (source: SignalID, checked: boolean) => void;
	plannerInput: string;
	planners: UpgradePlannerSource[];
	source: string;
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
type QualitySelection = 'preserve' | Exclude<Quality, undefined>;

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

function resolveRules(
	source: string,
	direction: UpgradeDirection,
	plannerInput: string,
	planners: UpgradePlannerSource[],
): ResolvedRules {
	try {
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

function SignalPickerDialog({
	initialQuality,
	onChoose,
	onClose,
	options,
	showQuality = false,
	title,
}: SignalPickerDialogProps) {
	const [search, setSearch] = useState('');
	const [qualitySelection, setQualitySelection] = useState<QualitySelection>(initialQuality ?? 'preserve');
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
									const selectedSignal = {...signal};
									if (qualitySelection === 'preserve' || qualitySelection === 'normal') {
										delete selectedSignal.quality;
									} else {
										selectedSignal.quality = qualitySelection;
									}
									onChoose(selectedSignal, qualitySelection === 'preserve');
								}}
							>
								<FactorioIcon icon={signal} size="large" />
							</button>
						))}
					</div>
					{showQuality ? (
						<div className="transform-picker__qualities" role="group" aria-label="Target quality">
							<button
								type="button"
								aria-pressed={qualitySelection === 'preserve'}
								onClick={() => {
									setQualitySelection('preserve');
								}}
							>
								Same as source
							</button>
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
					) : null}
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
	onDirectionChange,
	onPlannerInputChange,
	onSourceChange,
	onStripQualityChange,
	onTargetChange,
	onToggleCandidate,
	plannerInput,
	planners,
	source,
	stripQualitySelected,
}: UpgradeMappingsEditorProps) {
	const [targetPickerCandidate, setTargetPickerCandidate] = useState<UpgradeCandidate>();

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
									</div>
								);
							})}
						</>
					)}
				</div>
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
					showQuality
					onClose={() => {
						setTargetPickerCandidate(undefined);
					}}
					onChoose={(target, preserveQuality = false) => {
						onTargetChange(targetPickerCandidate.from, target, preserveQuality);
						setTargetPickerCandidate(undefined);
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
	const [stripWiresSelected, setStripWiresSelected] = useState(false);
	const [stripTrainsSelected, setStripTrainsSelected] = useState(false);
	const [stripTilesSelected, setStripTilesSelected] = useState(false);
	const [flattenBookSelected, setFlattenBookSelected] = useState(false);
	const [sortBookSelected, setSortBookSelected] = useState(false);
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
	const [iconReplacements, setIconReplacements] = useState<IconReplacement[]>([]);
	const [textReplacementEnabled, setTextReplacementEnabled] = useState(true);
	const [metadataFind, setMetadataFind] = useState('');
	const [metadataReplace, setMetadataReplace] = useState('');

	const type = blueprint === undefined ? undefined : new BlueprintWrapper(blueprint).getType();
	const transformTarget = upgradeScope === 'root' ? rootBlueprint : blueprint;
	const resolvedRules = useMemo(
		() => resolveRules(upgradeSource, upgradeDirection, plannerInput, planners),
		[upgradeSource, upgradeDirection, plannerInput, planners],
	);
	const effectiveRules = useMemo(
		() =>
			resolvedRules.rules.map((rule) => {
				const override = targetOverrides.get(signalIdentity(rule.from));
				return override === undefined ? rule : {...rule, ...override};
			}),
		[resolvedRules.rules, targetOverrides],
	);
	const candidates = useMemo(() => {
		if (transformTarget === undefined) {
			return [];
		}
		const matches = analyzeUpgradeRules(transformTarget, effectiveRules);
		if (upgradeSource === 'suggested') {
			return matches;
		}
		const counts = new Map(matches.map((candidate) => [signalIdentity(candidate.from), candidate.count]));
		return effectiveRules.map((rule) => ({...rule, count: counts.get(signalIdentity(rule.from)) ?? 0}));
	}, [transformTarget, effectiveRules, upgradeSource]);
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
		const transform = (target: BlueprintString) => {
			let transformed = target;
			if (rules.length > 0) transformed = applyUpgradeRules(transformed, rules);
			if (iconReplacements.length > 0) transformed = applyIconReplacements(transformed, iconReplacements);
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
			return transform(rootBlueprint);
		}
		return updateNestedBlueprint(rootBlueprint, selectedPath, transform) ?? undefined;
	}, [
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
		stripTilesSelected,
		stripTrainsSelected,
		stripWiresSelected,
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
	const blueprintReplacementCount = activeIconCount + activeTextCount;
	const canChooseRootScope = rootBlueprint?.blueprint_book !== undefined && selectedPath !== '';
	const hasSelectedCleanup = stripWiresSelected || stripTrainsSelected || stripTilesSelected;
	const hasSelectedBookOperation = flattenBookSelected || sortBookSelected;
	const openInPlayground = () => {
		if (transformedBlueprint === undefined) {
			throw new Error('Cannot open a transformation while its configuration is invalid');
		}

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
			<div className="transform-toolbelt" aria-label="Blueprint tools">
				<button
					type="button"
					className="transform-toolbelt__button"
					aria-label="Open Upgrade Planner"
					aria-expanded={upgradePlannerOpen}
					onClick={() => {
						setBlueprintEditorOpen(false);
						setUpgradeEnabled(true);
						setUpgradePlannerOpen(true);
					}}
				>
					<span className="transform-toolbelt__icon">
						<FactorioIcon icon={{type: 'item', name: 'upgrade-planner'}} size="large" />
					</span>
					<span>Upgrade planner</span>
				</button>
				{type === 'upgrade-planner' ? null : (
					<button
						type="button"
						className="transform-toolbelt__button"
						aria-label="Open Blueprint Editor"
						aria-expanded={blueprintEditorOpen}
						onClick={() => {
							setUpgradePlannerOpen(false);
							setBlueprintEditorOpen(true);
						}}
					>
						<span className="transform-toolbelt__icon">
							<FactorioIcon icon={{type: 'item', name: 'blueprint'}} size="large" />
						</span>
						<span>Blueprint editor</span>
					</button>
				)}
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
								aria-label={`${activeUpgradeCount.toString()} ${
									activeUpgradeCount === 1 ? 'replacement ready' : 'replacements ready'
								}${stripQualitySelected ? ', strip quality selected' : ''}`}
							>
								<strong>{activeUpgradeCount}</strong>
								<span>
									{activeUpgradeCount === 1 ? 'replacement ready' : 'replacements ready'}
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
									stripQualitySelected={stripQualitySelected}
								/>
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
							<div
								className="transform-workbench__status"
								aria-label={`${blueprintReplacementCount.toString()} ${
									blueprintReplacementCount === 1 ? 'replacement ready' : 'replacements ready'
								}${hasSelectedCleanup ? ', cleanup selected' : ''}${
									hasSelectedBookOperation ? ', book operation selected' : ''
								}`}
							>
								<strong>{blueprintReplacementCount}</strong>
								<span>
									{blueprintReplacementCount === 1 ? 'replacement ready' : 'replacements ready'}
									{hasSelectedCleanup ? ' · cleanup selected' : ''}
									{hasSelectedBookOperation ? ' · book operation selected' : ''}
								</span>
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
										<option value="selection">
											{canChooseRootScope ? 'This selection' : 'This blueprint or book'}
										</option>
										{canChooseRootScope ? <option value="root">Entire root book</option> : null}
									</select>
								</div>

								<section
									className="transform-workflow__section transform-workflow__website-replacements"
									aria-labelledby="transform-website-replacements-heading"
								>
									<h4 id="transform-website-replacements-heading">Website replacements</h4>
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

								<section
									className="transform-workflow__section"
									aria-labelledby="transform-cleanup-heading"
								>
									<h4 id="transform-cleanup-heading">
										Cleanup{hasSelectedCleanup ? ' · selected' : ''}
									</h4>
									<div className="transform-workflow__checks">
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
								</section>

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
