import {useNavigate} from '@tanstack/react-router';
import {useEffect, useId, useMemo, useState} from 'react';

import gameData from '../../../../generated/game-data.json';
import {BlueprintWrapper} from '../../../../parsing/BlueprintWrapper';
import {serializeBlueprint} from '../../../../parsing/blueprintParser';
import {extractNames} from '../../../../parsing/modDetection/nameExtractor';
import type {
	BlueprintString,
	Parameter,
	SignalID,
	UpgradePlanner,
	UpgradeSourceSignal,
} from '../../../../parsing/types';
import {updateNestedBlueprint} from '../../../../transform/applyAtPath';
import {flattenBook, sortBookByLabel} from '../../../../transform/bookOps';
import {
	applyBlueprintEditorMetadata,
	applyBlueprintParameters,
	applyBlueprintSnapGrid,
	blueprintEditorMetadata,
	blueprintParameters,
	blueprintSnapGrid,
	type BlueprintSnapGrid,
} from '../../../../transform/blueprintEditor';
import {
	blueprintComponentRemovalKey,
	type BlueprintComponentIdentity,
	type BlueprintComponentRemovalKey,
	removeBlueprintComponents,
} from '../../../../transform/componentRemoval';
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
	stripEntities,
	stripModules,
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
import {BlueprintEditorDialog} from './BlueprintEditorDialog';
import {BlueprintLabelIcons} from './BlueprintLabelIcons';
import type {PlacedUpgradePlanner} from './BlueprintEditorToolbar';
import {BlueprintToolbelt} from './BlueprintToolbelt';
import {SignalPickerDialog} from './SignalPickerDialog';
import {UpgradePlannerSelectorDialog, type UpgradePlannerChoice} from './UpgradePlannerSelectorDialog';

interface TransformPanelProps {
	blueprint?: BlueprintString;
	rootBlueprint?: BlueprintString;
	selectedPath?: string;
}

interface ResolvedRules {
	error: string | undefined;
	rules: UpgradeRule[];
}

interface SignalSlotProps {
	label: string;
	onClick?: () => void;
	onContextMenu?: () => void;
	signal?: SignalID;
}

interface UpgradeMappingsEditorProps {
	candidates: UpgradeCandidate[];
	error: string | undefined;
	excludedSources: ReadonlySet<string>;
	manualRules: readonly UpgradeRule[];
	onAddManualRule: (rule: UpgradeRule) => void;
	onChangeManualRule: (previousSource: UpgradeSourceSignal, rule: UpgradeRule) => void;
	onPlannerInputChange: (value: string) => void;
	onRemoveRule: (source: UpgradeSourceSignal, manual: boolean) => void;
	onPlannerSourceChange: (choice: UpgradePlannerChoice) => void;
	onTargetChange: (source: SignalID, target: SignalID, preserveQuality: boolean) => void;
	plannerInput: string;
	rootBlueprint: BlueprintString;
	source: string;
	sourceLabel: string;
	sourceOptions: SignalID[];
}

interface IconReplacementDialogProps {
	candidates: MetadataIconCandidate[];
	onChange: (replacements: IconReplacement[]) => void;
	onClose: () => void;
	replacements: IconReplacement[];
}

const virtualSignals: SignalID[] = gameData.virtualSignals.map((name) => ({type: 'virtual', name}));
const pickerSignals: SignalID[] = gameData.pickerSignals.map(({name, type}) => {
	switch (type) {
		case 'achievement':
		case 'fluid':
		case 'item':
		case 'item-group':
		case 'planet':
		case 'recipe':
		case 'space-location':
		case 'technology':
		case 'tile':
		case 'virtual':
			return {type, name};
		default:
			throw new Error(`Unknown generated picker signal type: ${type}`);
	}
});

interface UpgradeTargetOverride {
	preserveQuality: boolean;
	to: SignalID;
}

interface MappingSourceDraft {
	candidate?: UpgradeCandidate;
	source: UpgradeSourceSignal;
}

function normalizedSignalType(signal: SignalID): string {
	if (signal.type === 'virtual-signal') {
		return 'virtual';
	}
	return signal.type ?? 'item';
}

function signalIdentity(signal: UpgradeSourceSignal): string {
	return [normalizedSignalType(signal), signal.name, signal.quality ?? 'normal', signal.comparator ?? '='].join(':');
}

function signalName(signal: SignalID): string {
	const words = signal.name.replace(/^signal-/, 'signal ').replaceAll('-', ' ');
	return words.slice(0, 1).toUpperCase() + words.slice(1);
}

function signalTitle(signal: UpgradeSourceSignal): string {
	const quality = signal.quality === undefined ? '' : `\nQuality: ${signal.comparator ?? '='} ${signal.quality}`;
	return `${signalName(signal)}\n${normalizedSignalType(signal)}:${signal.name}${quality}`;
}

function resolveRules(
	source: string,
	direction: UpgradeDirection,
	plannerInput: string,
	planners: UpgradePlannerSource[],
	selectedPlanner: UpgradePlanner | undefined,
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
		if (source.startsWith('history:')) {
			if (selectedPlanner === undefined) {
				throw new Error('The selected upgrade planner is no longer in history.');
			}
			return {error: undefined, rules: rulesFromUpgradePlanner(selectedPlanner, direction)};
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
	if (target === undefined) {
		for (const {from, to} of gameData.nextUpgrades) {
			options.set(`entity:${from}`, {type: 'entity', name: from});
			options.set(`entity:${to}`, {type: 'entity', name: to});
		}
	} else {
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

function reverseUpgradeRule(rule: UpgradeRule): UpgradeRule {
	const {comparator: _comparator, ...target} = rule.from;
	return {
		from: rule.to,
		preserveQuality: rule.preserveQuality,
		to: target,
	};
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

function UpgradeMappingsEditor({
	candidates,
	error,
	excludedSources,
	manualRules,
	onAddManualRule,
	onChangeManualRule,
	onPlannerInputChange,
	onRemoveRule,
	onPlannerSourceChange,
	onTargetChange,
	plannerInput,
	rootBlueprint,
	source,
	sourceLabel,
	sourceOptions,
}: UpgradeMappingsEditorProps) {
	const plannerSelectorId = useId();
	const [plannerSelectorOpen, setPlannerSelectorOpen] = useState(false);
	const [targetPickerCandidate, setTargetPickerCandidate] = useState<UpgradeCandidate>();
	const [sourcePickerCandidate, setSourcePickerCandidate] = useState<UpgradeCandidate | null>();
	const [mappingSourceDraft, setMappingSourceDraft] = useState<MappingSourceDraft>();
	const manualSourceKeys = new Set(manualRules.map((rule) => signalIdentity(rule.from)));
	const visibleCandidates = candidates.filter((candidate) => !excludedSources.has(signalIdentity(candidate.from)));

	return (
		<>
			<div className="panel-hole upgrade-planner-editor">
				<div className="panel-hole-inner upgrade-planner-editor__source">
					<strong>Load planner</strong>
					<button
						type="button"
						className="upgrade-planner-editor__source-button"
						aria-controls={plannerSelectorId}
						aria-expanded={plannerSelectorOpen}
						aria-haspopup="dialog"
						aria-label={`Load planner, currently ${sourceLabel}`}
						onClick={() => {
							setPlannerSelectorOpen(true);
						}}
					>
						<FactorioIcon icon={{type: 'item', name: 'upgrade-planner'}} size="small" />
						<span>{sourceLabel}</span>
					</button>
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
					{visibleCandidates.length === 0 && error === undefined ? (
						<p className="upgrade-planner-editor__empty">No matching entities or modules in this scope.</p>
					) : (
						<>
							<div className="upgrade-planner-editor__mapping-headings" aria-hidden="true">
								<span>From</span>
								<span />
								<span>To</span>
								<span>Matches</span>
								<span />
							</div>
							{visibleCandidates.map((candidate) => {
								const sourceKey = signalIdentity(candidate.from);
								const manual = manualSourceKeys.has(sourceKey);
								return (
									<div key={sourceKey} className="upgrade-planner-editor__mapping">
										<SignalSlot
											label={`Choose source, currently ${signalName(candidate.from)}`}
											signal={candidate.from}
											onClick={() => {
												setSourcePickerCandidate(candidate);
											}}
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
										<button
											type="button"
											className="upgrade-planner-editor__remove"
											aria-label={`Remove mapping from ${signalName(candidate.from)}`}
											onClick={() => {
												onRemoveRule(candidate.from, manual);
											}}
										>
											×
										</button>
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
						setSourcePickerCandidate(null);
					}}
				>
					+ Add mapping
				</button>
			</div>
			{plannerSelectorOpen ? (
				<UpgradePlannerSelectorDialog
					dialogId={plannerSelectorId}
					includeEditingChoices
					rootBlueprint={rootBlueprint}
					selectedSource={source}
					onClose={() => {
						setPlannerSelectorOpen(false);
					}}
					onChoose={(choice) => {
						onPlannerSourceChange(choice);
						setPlannerSelectorOpen(false);
					}}
				/>
			) : null}
			{targetPickerCandidate === undefined ? null : (
				<SignalPickerDialog
					initialSignal={targetPickerCandidate.to}
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
			{sourcePickerCandidate === undefined ? null : (
				<SignalPickerDialog
					initialSignal={sourcePickerCandidate?.from}
					title="Choose mapping source"
					options={[
						...new Map(
							[
								...sourceOptions,
								...(sourcePickerCandidate === null ? [] : [sourcePickerCandidate.from]),
							].map((signal) => [signalIdentity(signal), signal]),
						).values(),
					]}
					qualityMode="source"
					onClose={() => {
						setSourcePickerCandidate(undefined);
					}}
					onChoose={(sourceSignal) => {
						setMappingSourceDraft({candidate: sourcePickerCandidate ?? undefined, source: sourceSignal});
						setSourcePickerCandidate(undefined);
					}}
				/>
			)}
			{mappingSourceDraft === undefined ? null : (
				<SignalPickerDialog
					initialSignal={mappingSourceDraft.source}
					title={`Choose target for ${signalName(mappingSourceDraft.source)}`}
					options={upgradeTargetOptions(mappingSourceDraft.source, mappingSourceDraft.source)}
					qualityMode="target"
					onClose={() => {
						setMappingSourceDraft(undefined);
					}}
					onChoose={(target, preserveQuality = false) => {
						const rule = {from: mappingSourceDraft.source, preserveQuality, to: target};
						if (mappingSourceDraft.candidate === undefined) {
							onAddManualRule(rule);
						} else {
							onChangeManualRule(mappingSourceDraft.candidate.from, rule);
						}
						setMappingSourceDraft(undefined);
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
	const [upgradeDraftChanged, setUpgradeDraftChanged] = useState(false);
	const [iconReplacementOpen, setIconReplacementOpen] = useState(false);
	const [discardConfirmation, setDiscardConfirmation] = useState<'blueprint' | 'upgrade'>();
	const planners = useMemo(
		() => (rootBlueprint === undefined ? [] : findUpgradePlanners(rootBlueprint)),
		[rootBlueprint],
	);
	const [upgradeSource, setUpgradeSource] = useState(() =>
		blueprint?.upgrade_planner === undefined ? 'suggested' : `book:${selectedPath}`,
	);
	const [upgradeSourceLabel, setUpgradeSourceLabel] = useState(() =>
		blueprint?.upgrade_planner === undefined
			? 'Default Upgrade'
			: (blueprint.upgrade_planner.label ?? 'Current upgrade planner'),
	);
	const [selectedPlanner, setSelectedPlanner] = useState<UpgradePlanner>();
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
	const [editorSnapGrid, setEditorSnapGrid] = useState<BlueprintSnapGrid | undefined>(() =>
		blueprint?.blueprint === undefined ? undefined : blueprintSnapGrid(blueprint),
	);
	const [editorParameters, setEditorParameters] = useState<Parameter[]>(() =>
		blueprint?.blueprint === undefined ? [] : blueprintParameters(blueprint),
	);
	const [editorIconPickerIndex, setEditorIconPickerIndex] = useState<number>();
	const [editorPlacedPlanner, setEditorPlacedPlanner] = useState<PlacedUpgradePlanner>();
	const [editorPlannerDropError, setEditorPlannerDropError] = useState<string>();
	const [removedEditorComponents, setRemovedEditorComponents] = useState<Set<BlueprintComponentRemovalKey>>(
		() => new Set(),
	);

	const type = blueprint === undefined ? undefined : new BlueprintWrapper(blueprint).getType();
	useEffect(() => {
		if (blueprint?.blueprint === undefined && blueprint?.blueprint_book === undefined) {
			return;
		}
		const metadata = blueprintEditorMetadata(blueprint);
		setEditorLabel(metadata.label);
		setEditorDescription(metadata.description);
		setEditorSnapGrid(blueprint.blueprint === undefined ? undefined : blueprintSnapGrid(blueprint));
		setEditorParameters(blueprint.blueprint === undefined ? [] : blueprintParameters(blueprint));
		setRemovedEditorComponents(new Set());
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
	const transformTarget = upgradeScope === 'root' ? rootBlueprint : blueprint;
	const resolvedRules = useMemo(
		() => resolveRules(upgradeSource, 'upgrade', plannerInput, planners, selectedPlanner),
		[upgradeSource, plannerInput, planners, selectedPlanner],
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
		for (const signal of [...pickerSignals, ...sourceOptions, ...editorIcons]) {
			options.set(signalIdentity(signal), signal);
		}
		return [...options.values()];
	}, [editorIcons, sourceOptions]);
	const editorFilters = useMemo(() => blueprintFilterCategories(blueprint ?? {}), [blueprint]);
	const candidates = useMemo(() => {
		if (transformTarget === undefined) {
			return [];
		}
		const forwardMatches = analyzeUpgradeRules(transformTarget, effectiveRules);
		const reverseRules = effectiveRules.map(reverseUpgradeRule);
		const reverseMatches = analyzeUpgradeRules(transformTarget, reverseRules);
		const forwardCounts = new Map(
			forwardMatches.map((candidate) => [signalIdentity(candidate.from), candidate.count]),
		);
		const reverseCounts = new Map(
			reverseMatches.map((candidate) => [signalIdentity(candidate.to), candidate.count]),
		);
		if (upgradeSource === 'suggested') {
			return effectiveRules.flatMap((rule) => {
				const sourceKey = signalIdentity(rule.from);
				const count = (forwardCounts.get(sourceKey) ?? 0) + (reverseCounts.get(sourceKey) ?? 0);
				return count === 0 && !manualSourceKeys.has(sourceKey) ? [] : [{...rule, count}];
			});
		}
		return effectiveRules.map((rule) => {
			const sourceKey = signalIdentity(rule.from);
			return {
				...rule,
				count: (forwardCounts.get(sourceKey) ?? 0) + (reverseCounts.get(sourceKey) ?? 0),
			};
		});
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
			rootBlueprint === undefined || metadataFind === ''
				? 0
				: analyzeMetadataSubstitution(rootBlueprint, metadataSubstitution),
		[rootBlueprint, metadataFind, metadataSubstitution],
	);
	const metadataIconCandidates = useMemo(
		() => (rootBlueprint === undefined ? [] : analyzeMetadataIcons(rootBlueprint)),
		[rootBlueprint],
	);
	const iconReplacementCount = useMemo(
		() =>
			rootBlueprint === undefined || iconReplacements.length === 0
				? 0
				: analyzeIconReplacements(rootBlueprint, iconReplacements),
		[rootBlueprint, iconReplacements],
	);
	const plannerDraftBlueprint = useMemo(() => {
		if (rootBlueprint === undefined || resolvedRules.error !== undefined) {
			return undefined;
		}
		const rules = selectedCandidates.map(({from, preserveQuality, to}) => ({from, preserveQuality, to}));
		const applyEntityRules = (target: BlueprintString) => applyUpgradeRules(target, rules);
		const upgradedRoot =
			upgradeScope === 'root'
				? applyEntityRules(rootBlueprint)
				: updateNestedBlueprint(rootBlueprint, selectedPath, applyEntityRules);
		if (upgradedRoot === null) {
			return undefined;
		}
		let transformedRoot = upgradedRoot;
		if (iconReplacements.length > 0) {
			transformedRoot = applyIconReplacements(transformedRoot, iconReplacements);
		}
		if (textReplacementEnabled && metadataFind !== '') {
			transformedRoot = applyMetadataSubstitution(transformedRoot, metadataSubstitution);
		}
		return transformedRoot;
	}, [
		iconReplacements,
		metadataFind,
		metadataSubstitution,
		resolvedRules.error,
		rootBlueprint,
		selectedCandidates,
		selectedPath,
		textReplacementEnabled,
		upgradeScope,
	]);
	const editorDraftBlueprint = useMemo(() => {
		if (rootBlueprint === undefined) {
			return undefined;
		}
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
			if (blueprintEditorEnabled && transformed.blueprint !== undefined && editorSnapGrid !== undefined) {
				transformed = applyBlueprintSnapGrid(transformed, editorSnapGrid);
			}
			if (blueprintEditorEnabled && transformed.blueprint !== undefined) {
				transformed = applyBlueprintParameters(transformed, editorParameters);
			}
			transformed = removeBlueprintComponents(transformed, removedEditorComponents);
			if (stripTrainsSelected) transformed = stripTrains(transformed);
			if (stripEntitiesSelected) transformed = stripEntities(transformed);
			if (stripModulesSelected) transformed = stripModules(transformed);
			if (stripTilesSelected) transformed = stripTiles(transformed);
			if (flattenBookSelected) transformed = flattenBook(transformed);
			if (sortBookSelected) transformed = sortBookByLabel(transformed);
			return transformed;
		};
		return updateNestedBlueprint(rootBlueprint, selectedPath, transformEditor) ?? undefined;
	}, [
		blueprintEditorEnabled,
		editorDescription,
		editorIcons,
		editorLabel,
		editorParameters,
		editorSnapGrid,
		flattenBookSelected,
		rootBlueprint,
		removedEditorComponents,
		selectedPath,
		sortBookSelected,
		stripEntitiesSelected,
		stripModulesSelected,
		stripTilesSelected,
		stripTrainsSelected,
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
	const rootLabel =
		rootBlueprint === undefined
			? 'blueprint'
			: (new BlueprintWrapper(rootBlueprint).getLabel() ?? 'Blueprint book');
	const selectedLabel = new BlueprintWrapper(blueprint).getLabel() ?? 'Untitled blueprint';
	const editorBreadcrumb = selectedPath === '' ? selectedLabel : `${rootLabel} › ${selectedLabel}`;
	const originalEditorMetadata =
		blueprint.blueprint === undefined && blueprint.blueprint_book === undefined
			? {description: '', icons: [], label: ''}
			: blueprintEditorMetadata(blueprint);
	const originalSnapGrid = blueprint.blueprint === undefined ? undefined : blueprintSnapGrid(blueprint);
	const originalParameters = blueprint.blueprint === undefined ? [] : blueprintParameters(blueprint);
	const editorDirty =
		editorLabel !== originalEditorMetadata.label ||
		editorDescription !== originalEditorMetadata.description ||
		JSON.stringify(editorIcons) !==
			JSON.stringify(
				[...originalEditorMetadata.icons]
					.sort((left, right) => left.index - right.index)
					.map((icon) => icon.signal),
			) ||
		JSON.stringify(editorSnapGrid) !== JSON.stringify(originalSnapGrid) ||
		JSON.stringify(editorParameters) !== JSON.stringify(originalParameters) ||
		removedEditorComponents.size > 0 ||
		stripEntitiesSelected ||
		stripModulesSelected ||
		stripTrainsSelected ||
		stripTilesSelected ||
		flattenBookSelected ||
		sortBookSelected;
	const plannerDirty = upgradeDraftChanged;
	const resetBlueprintEditorDraft = () => {
		setEditorLabel(originalEditorMetadata.label);
		setEditorDescription(originalEditorMetadata.description);
		setEditorSnapGrid(originalSnapGrid);
		setEditorParameters(originalParameters);
		setEditorIcons(
			[...originalEditorMetadata.icons]
				.sort((left, right) => left.index - right.index)
				.map((icon) => icon.signal),
		);
		setStripEntitiesSelected(false);
		setStripModulesSelected(false);
		setStripTrainsSelected(false);
		setStripTilesSelected(false);
		setFlattenBookSelected(false);
		setSortBookSelected(false);
		setRemovedEditorComponents(new Set());
		setEditorPlacedPlanner(undefined);
		setEditorPlannerDropError(undefined);
	};
	const openBlueprintEditor = () => {
		resetBlueprintEditorDraft();
		setUpgradePlannerOpen(false);
		setBlueprintEditorEnabled(true);
		setBlueprintEditorOpen(true);
	};
	const openUpgradePlanner = () => {
		setBlueprintEditorOpen(false);
		setUpgradeEnabled(true);
		setUpgradeDraftChanged(false);
		setUpgradePlannerOpen(true);
	};
	const requestCloseBlueprintEditor = () => {
		if (editorDirty) {
			setDiscardConfirmation('blueprint');
		} else {
			setBlueprintEditorOpen(false);
		}
	};
	const requestCloseUpgradePlanner = () => {
		if (plannerDirty) {
			setDiscardConfirmation('upgrade');
		} else {
			setUpgradePlannerOpen(false);
		}
	};
	const resetUpgradePlannerDraft = () => {
		setUpgradeSource(blueprint.upgrade_planner === undefined ? 'suggested' : `book:${selectedPath}`);
		setUpgradeSourceLabel(
			blueprint.upgrade_planner === undefined
				? 'Default Upgrade'
				: (blueprint.upgrade_planner.label ?? 'Current upgrade planner'),
		);
		setSelectedPlanner(undefined);
		setPlannerInput('');
		setUpgradeScope(blueprint.upgrade_planner === undefined ? 'selection' : 'root');
		setExcludedSources(new Set());
		setTargetOverrides(new Map());
		setManualRules([]);
		setIconReplacements([]);
		setTextReplacementEnabled(true);
		setMetadataFind('');
		setMetadataReplace('');
		setUpgradeDraftChanged(false);
	};
	const commitBlueprint = (committedBlueprint: BlueprintString) => {
		setBlueprintEditorOpen(false);
		setIconReplacementOpen(false);
		setUpgradePlannerOpen(false);
		void navigate({
			to: '/',
			search: {
				pasted: serializeBlueprint(committedBlueprint),
				selection: selectedPath,
			},
		});
	};
	const applyPlanner = (direction: UpgradeDirection) => {
		if (rootBlueprint === undefined || resolvedRules.error !== undefined) {
			throw new Error('Cannot apply an invalid upgrade planner.');
		}
		const forwardRules = selectedCandidates.map(({from, preserveQuality, to}) => ({from, preserveQuality, to}));
		const rules = direction === 'upgrade' ? forwardRules : forwardRules.map(reverseUpgradeRule);
		const applyEntityRules = (target: BlueprintString) => applyUpgradeRules(target, rules);
		const upgradedRoot =
			upgradeScope === 'root'
				? applyEntityRules(rootBlueprint)
				: updateNestedBlueprint(rootBlueprint, selectedPath, applyEntityRules);
		if (upgradedRoot === null) {
			throw new Error('The selected blueprint no longer exists in the root book.');
		}
		let committed = upgradedRoot;
		if (iconReplacements.length > 0) committed = applyIconReplacements(committed, iconReplacements);
		if (textReplacementEnabled && metadataFind !== '') {
			committed = applyMetadataSubstitution(committed, metadataSubstitution);
		}
		resetUpgradePlannerDraft();
		commitBlueprint(committed);
	};
	const applyPlannerFromBlueprintEditor = (choice: UpgradePlannerChoice, direction: UpgradeDirection) => {
		if (editorDraftBlueprint === undefined) {
			throw new Error('Cannot apply an upgrade planner to an invalid blueprint draft.');
		}
		let rules: UpgradeRule[];
		if (choice.source === 'suggested') {
			rules = builtInUpgradeRules(direction);
		} else {
			if (choice.planner === undefined) {
				throw new Error('The selected upgrade planner is unavailable.');
			}
			rules = rulesFromUpgradePlanner(choice.planner, direction);
		}
		const transformedRoot = updateNestedBlueprint(editorDraftBlueprint, selectedPath, (target) =>
			applyUpgradeRules(target, rules),
		);
		if (transformedRoot === null) {
			throw new Error('The selected blueprint no longer exists in the root book.');
		}
		commitBlueprint(transformedRoot);
	};
	const placeDroppedPlanner = (serializedPlanner: string) => {
		try {
			const planner = parseUpgradePlanner(serializedPlanner);
			setEditorPlacedPlanner({
				choice: {
					label: planner.label ?? planner.settings.description ?? 'Dropped upgrade planner',
					planner,
					source: 'dropped',
				},
				direction: 'upgrade',
			});
			setEditorPlannerDropError(undefined);
		} catch {
			setEditorPlannerDropError('Drop an encoded or JSON upgrade planner.');
		}
	};

	return (
		<>
			<BlueprintToolbelt
				blueprintEditorAvailable={type !== 'upgrade-planner'}
				blueprintEditorOpen={blueprintEditorOpen}
				onOpenBlueprintEditor={openBlueprintEditor}
				onOpenUpgradePlanner={openUpgradePlanner}
				upgradePlannerOpen={upgradePlannerOpen}
			/>

			{upgradePlannerOpen ? (
				<div className="transform-dialog-backdrop transform-workbench-backdrop">
					<section
						className="transform-dialog transform-workbench"
						role="dialog"
						aria-modal="true"
						aria-label="Upgrade Planner"
						onKeyDown={(event) => {
							if (event.key === 'Escape') {
								requestCloseUpgradePlanner();
							}
						}}
					>
						<header className="transform-dialog__header transform-workbench__header">
							<div className="transform-workbench__title">
								<FactorioIcon icon={{type: 'item', name: 'upgrade-planner'}} size="large" />
								<div>
									<h3>Upgrade Planner</h3>
									<span>{editorBreadcrumb}</span>
								</div>
							</div>
							<div
								className="transform-workbench__status"
								aria-label={`${plannerReplacementCount.toString()} ${
									plannerReplacementCount === 1 ? 'match' : 'matches'
								}`}
							>
								<strong>{plannerReplacementCount}</strong>
								<span>{plannerReplacementCount === 1 ? 'match' : 'matches'}</span>
							</div>
							<button
								type="button"
								className="transform-dialog__close"
								aria-label="Close Upgrade Planner"
								onClick={() => {
									requestCloseUpgradePlanner();
								}}
							>
								×
							</button>
						</header>

						<div className="transform-workbench__body">
							<div className="panel-hole transform-workflow">
								<div className="panel-hole-inner transform-workflow__scope">
									<strong>Apply mappings to</strong>
									<select
										aria-label="Apply to"
										value={upgradeScope}
										onChange={(event) => {
											setUpgradeDraftChanged(true);
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
									error={resolvedRules.error}
									excludedSources={excludedSources}
									manualRules={manualRules}
									onAddManualRule={(rule) => {
										setUpgradeDraftChanged(true);
										setManualRules((current) => [
											...current.filter(
												(candidate) =>
													signalIdentity(candidate.from) !== signalIdentity(rule.from),
											),
											rule,
										]);
									}}
									onChangeManualRule={(previousSource, rule) => {
										setUpgradeDraftChanged(true);
										const previousKey = signalIdentity(previousSource);
										setExcludedSources((current) => new Set(current).add(previousKey));
										setManualRules((current) => [
											...current.filter(
												(candidate) => signalIdentity(candidate.from) !== previousKey,
											),
											rule,
										]);
									}}
									onPlannerInputChange={(value) => {
										setUpgradeDraftChanged(true);
										setPlannerInput(value);
										setExcludedSources(new Set());
										setTargetOverrides(new Map());
									}}
									onRemoveRule={(source, manual) => {
										setUpgradeDraftChanged(true);
										const sourceKey = signalIdentity(source);
										if (manual) {
											setManualRules((current) =>
												current.filter(
													(candidate) => signalIdentity(candidate.from) !== sourceKey,
												),
											);
										} else {
											setExcludedSources((current) => new Set(current).add(sourceKey));
										}
									}}
									onPlannerSourceChange={(choice) => {
										setUpgradeDraftChanged(true);
										setUpgradeSource(choice.source);
										setUpgradeSourceLabel(choice.label);
										setSelectedPlanner(choice.planner);
										setExcludedSources(new Set());
										setTargetOverrides(new Map());
									}}
									onTargetChange={(source, target, preserveQuality) => {
										setUpgradeDraftChanged(true);
										setTargetOverrides((current) =>
											new Map(current).set(signalIdentity(source), {preserveQuality, to: target}),
										);
									}}
									plannerInput={plannerInput}
									rootBlueprint={rootBlueprint ?? blueprint}
									source={upgradeSource}
									sourceLabel={upgradeSourceLabel}
									sourceOptions={sourceOptions}
								/>

								<section
									className="transform-workflow__section transform-workflow__website-replacements"
									aria-labelledby="transform-website-replacements-heading"
								>
									<h4 id="transform-website-replacements-heading">Book-wide replacements</h4>
									<p className="transform-workflow__scope-note">
										Applies to titles, descriptions, and label icons throughout the entire book.
									</p>
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
													setUpgradeDraftChanged(true);
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
													setUpgradeDraftChanged(true);
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
													setUpgradeDraftChanged(true);
													setMetadataReplace(event.currentTarget.value);
												}}
											/>
										</div>
									</div>
								</section>
							</div>
						</div>

						<footer className="transform-workbench__footer transform-workbench__footer--actions">
							<button type="button" className="transform-button" onClick={requestCloseUpgradePlanner}>
								Cancel
							</button>
							<div className="transform-workbench__apply-actions">
								<button
									type="button"
									className="transform-button"
									disabled={plannerDraftBlueprint === undefined}
									onClick={() => {
										applyPlanner('downgrade');
									}}
								>
									Apply downgrades
								</button>
								<ButtonGreen
									disabled={plannerDraftBlueprint === undefined}
									onClick={(event) => {
										event.preventDefault();
										applyPlanner('upgrade');
									}}
								>
									Apply upgrades
								</ButtonGreen>
							</div>
						</footer>
					</section>
				</div>
			) : null}
			{blueprintEditorOpen ? (
				<BlueprintEditorDialog
					blueprint={blueprint}
					book={type === 'blueprint-book'}
					bookOperationSelected={hasSelectedBookOperation}
					breadcrumb={editorBreadcrumb}
					description={editorDescription}
					filters={editorFilters}
					flattenBookSelected={flattenBookSelected}
					icons={
						<BlueprintLabelIcons
							icons={editorIcons}
							onChange={setEditorIcons}
							onChoose={setEditorIconPickerIndex}
							signalTitle={signalTitle}
						/>
					}
					label={editorLabel}
					onApplyPlacedPlanner={(direction) => {
						if (editorPlacedPlanner === undefined) {
							throw new Error('No upgrade planner is placed on the editor toolbar.');
						}
						applyPlannerFromBlueprintEditor(editorPlacedPlanner.choice, direction);
					}}
					onClose={requestCloseBlueprintEditor}
					onClearPlacedPlanner={() => {
						setEditorPlacedPlanner(undefined);
						setEditorPlannerDropError(undefined);
					}}
					onComponentRemovedChange={(component: BlueprintComponentIdentity, removed) => {
						setRemovedEditorComponents((current) => {
							const next = new Set(current);
							const key = blueprintComponentRemovalKey(component);
							if (removed) {
								next.add(key);
							} else {
								next.delete(key);
							}
							return next;
						});
					}}
					onDescriptionChange={setEditorDescription}
					onDropPlanner={placeDroppedPlanner}
					onEntitiesIncludedChange={(included) => {
						setStripEntitiesSelected(!included);
					}}
					onFlattenBookSelectedChange={setFlattenBookSelected}
					onLabelChange={setEditorLabel}
					onModulesIncludedChange={(included) => {
						setStripModulesSelected(!included);
					}}
					onParametersChange={setEditorParameters}
					onPlannerPlace={(choice, direction) => {
						setEditorPlacedPlanner({choice, direction});
						setEditorPlannerDropError(undefined);
					}}
					onSave={() => {
						if (editorDraftBlueprint !== undefined) {
							commitBlueprint(editorDraftBlueprint);
						}
					}}
					onSnapGridChange={setEditorSnapGrid}
					onSortBookSelectedChange={setSortBookSelected}
					onTilesIncludedChange={(included) => {
						setStripTilesSelected(!included);
					}}
					onTrainsIncludedChange={(included) => {
						setStripTrainsSelected(!included);
					}}
					parameters={editorParameters}
					plannerDropError={editorPlannerDropError}
					placedPlanner={editorPlacedPlanner}
					rootBlueprint={rootBlueprint ?? blueprint}
					removedComponents={removedEditorComponents}
					saveDisabled={editorDraftBlueprint === undefined || !editorDirty}
					saveLabel={selectedPath === '' ? 'Save blueprint' : 'Save to book'}
					signalOptions={editorIconOptions}
					snapGrid={editorSnapGrid}
					sortBookSelected={sortBookSelected}
					stripEntitiesSelected={stripEntitiesSelected}
					stripModulesSelected={stripModulesSelected}
					stripTilesSelected={stripTilesSelected}
					stripTrainsSelected={stripTrainsSelected}
				/>
			) : null}
			{discardConfirmation === undefined ? null : (
				<div className="transform-dialog-backdrop transform-dialog-backdrop--confirmation">
					<section
						className="transform-dialog transform-dialog--confirmation"
						role="alertdialog"
						aria-modal="true"
						aria-labelledby="discard-transform-heading"
					>
						<header className="transform-dialog__header">
							<h3 id="discard-transform-heading">Discard unsaved changes?</h3>
						</header>
						<p>Your changes have not been written back to the loaded blueprint or book.</p>
						<div className="transform-dialog__actions">
							<button
								type="button"
								className="transform-button"
								onClick={() => {
									setDiscardConfirmation(undefined);
								}}
							>
								Keep editing
							</button>
							<button
								type="button"
								className="transform-button transform-button--danger"
								onClick={() => {
									if (discardConfirmation === 'blueprint') {
										resetBlueprintEditorDraft();
										setBlueprintEditorOpen(false);
									} else {
										resetUpgradePlannerDraft();
										setUpgradePlannerOpen(false);
									}
									setDiscardConfirmation(undefined);
								}}
							>
								Discard changes
							</button>
						</div>
					</section>
				</div>
			)}
			{editorIconPickerIndex === undefined ? null : (
				<SignalPickerDialog
					initialSignal={editorIcons[editorIconPickerIndex]}
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
					onChange={(replacements) => {
						setUpgradeDraftChanged(true);
						setIconReplacements(replacements);
					}}
					onClose={() => {
						setIconReplacementOpen(false);
					}}
					replacements={iconReplacements}
				/>
			) : null}
		</>
	);
}
