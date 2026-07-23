import {useNavigate} from '@tanstack/react-router';
import {useMemo, useState} from 'react';

import gameData from '../../../../generated/game-data.json';
import {BlueprintWrapper} from '../../../../parsing/BlueprintWrapper';
import {serializeBlueprint} from '../../../../parsing/blueprintParser';
import {extractNames} from '../../../../parsing/modDetection/nameExtractor';
import type {BlueprintString, SignalID, UpgradePlanner} from '../../../../parsing/types';
import {updateNestedBlueprint} from '../../../../transform/applyAtPath';
import {blueprintComponentRemovalKey, type BlueprintComponentIdentity} from '../../../../transform/componentRemoval';
import {
	analyzeIconReplacements,
	analyzeMetadataIcons,
	analyzeMetadataSubstitution,
	applyIconReplacements,
	applyMetadataSubstitution,
	type IconReplacement,
	type MetadataIconCandidate,
} from '../../../../transform/metadataSubstitution';
import {blueprintFilterCategories} from '../../../../transform/strip';
import {
	analyzeUpgradeRules,
	applyUpgradeRules,
	builtInUpgradeRules,
	findUpgradePlanners,
	parseUpgradePlanner,
	rulesFromUpgradePlanner,
	type UpgradeDirection,
	type UpgradePlannerSource,
	type UpgradeRule,
} from '../../../../transform/upgradePlanner';
import {ButtonGreen} from '../../../ui/ButtonGreen';
import {BlueprintEditorDialog} from './BlueprintEditorDialog';
import {BlueprintLabelIcons} from './BlueprintLabelIcons';
import {BlueprintToolbelt} from './BlueprintToolbelt';
import {SignalPickerDialog} from './SignalPickerDialog';
import {SignalSlot, UpgradePlannerDialog} from './UpgradePlannerDialog';
import {normalizedSignalType, signalIdentity, signalName, signalTitle} from './upgradePlannerSignals';
import {useBlueprintEditorDraft} from './useBlueprintEditorDraft';
import type {UpgradePlannerChoice} from './UpgradePlannerSelectorDialog';

interface TransformPanelProps {
	blueprint?: BlueprintString;
	rootBlueprint?: BlueprintString;
	selectedPath?: string;
}

interface ResolvedRules {
	error: string | undefined;
	rules: UpgradeRule[];
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

function resolveRules(
	source: string,
	plannerInput: string,
	planners: UpgradePlannerSource[],
	selectedPlanner: UpgradePlanner | undefined,
): ResolvedRules {
	try {
		if (source === 'custom') {
			return {error: undefined, rules: []};
		}
		if (source === 'suggested') {
			return {error: undefined, rules: builtInUpgradeRules('upgrade')};
		}
		if (source === 'pasted') {
			return {
				error: undefined,
				rules: rulesFromUpgradePlanner(parseUpgradePlanner(plannerInput), 'upgrade'),
			};
		}
		if (source.startsWith('history:')) {
			if (selectedPlanner === undefined) {
				throw new Error('The selected upgrade planner is no longer in history.');
			}
			return {error: undefined, rules: rulesFromUpgradePlanner(selectedPlanner, 'upgrade')};
		}
		const path = source.slice('book:'.length);
		const planner = planners.find((candidate) => candidate.path === path);
		if (planner === undefined) {
			throw new Error('The selected upgrade planner is no longer in this book.');
		}
		return {error: undefined, rules: rulesFromUpgradePlanner(planner.planner, 'upgrade')};
	} catch (error) {
		return {error: error instanceof Error ? error.message : String(error), rules: []};
	}
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
	const [upgradeEnabled, setUpgradeEnabled] = useState(false);
	const [upgradePlannerOpen, setUpgradePlannerOpen] = useState(false);
	const [upgradeDraftChanged, setUpgradeDraftChanged] = useState(false);
	const [iconReplacementOpen, setIconReplacementOpen] = useState(false);
	const [upgradeDiscardConfirmationOpen, setUpgradeDiscardConfirmationOpen] = useState(false);
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
	const {
		blueprintEditorOpen,
		closeConfirmationOpen: blueprintCloseConfirmationOpen,
		closeBlueprintEditor,
		discardBlueprintEditorDraft,
		editorDescription,
		editorDirty,
		editorDraft,
		editorIconPickerIndex,
		editorIcons,
		editorLabel,
		editorParameters,
		editorPlacedPlanner,
		editorPlannerDropError,
		editorSnapGrid,
		flattenBookSelected,
		keepEditingBlueprint,
		openBlueprintEditor: openBlueprintEditorDraft,
		removedEditorComponents,
		requestCloseBlueprintEditor,
		setEditorDescription,
		setEditorIconPickerIndex,
		setEditorIcons,
		setEditorLabel,
		setEditorParameters,
		setEditorPlacedPlanner,
		setEditorPlannerDropError,
		setEditorSnapGrid,
		setFlattenBookSelected,
		setRemovedEditorComponents,
		setSortBookSelected,
		setStripEntitiesSelected,
		setStripModulesSelected,
		setStripTilesSelected,
		setStripTrainsSelected,
		sortBookSelected,
		stripEntitiesSelected,
		stripModulesSelected,
		stripTilesSelected,
		stripTrainsSelected,
	} = useBlueprintEditorDraft({blueprint, rootBlueprint, selectedPath});

	const type = blueprint === undefined ? undefined : new BlueprintWrapper(blueprint).getType();
	const transformTarget = upgradeScope === 'root' ? rootBlueprint : blueprint;
	const resolvedRules = useMemo(
		() => resolveRules(upgradeSource, plannerInput, planners, selectedPlanner),
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
	const editorDraftBlueprint = editorDraft.rootBlueprint;
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
	const plannerDirty = upgradeDraftChanged;
	const openBlueprintEditor = () => {
		setUpgradePlannerOpen(false);
		openBlueprintEditorDraft();
	};
	const openUpgradePlanner = () => {
		if (editorDirty) {
			requestCloseBlueprintEditor();
			return;
		}
		closeBlueprintEditor();
		setUpgradeEnabled(true);
		setUpgradeDraftChanged(false);
		setUpgradePlannerOpen(true);
	};
	const requestCloseUpgradePlanner = () => {
		if (plannerDirty) {
			setUpgradeDiscardConfirmationOpen(true);
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
		closeBlueprintEditor();
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
				<UpgradePlannerDialog
					applyDisabled={plannerDraftBlueprint === undefined}
					breadcrumb={editorBreadcrumb}
					canChooseRootScope={canChooseRootScope}
					mappings={{
						candidates,
						error: resolvedRules.error,
						excludedSources,
						manualRules,
						onAddManualRule: (rule) => {
							setUpgradeDraftChanged(true);
							setManualRules((current) => [
								...current.filter(
									(candidate) => signalIdentity(candidate.from) !== signalIdentity(rule.from),
								),
								rule,
							]);
						},
						onChangeManualRule: (previousSource, rule) => {
							setUpgradeDraftChanged(true);
							const previousKey = signalIdentity(previousSource);
							setExcludedSources((current) => new Set(current).add(previousKey));
							setManualRules((current) => [
								...current.filter((candidate) => signalIdentity(candidate.from) !== previousKey),
								rule,
							]);
						},
						onPlannerInputChange: (value) => {
							setUpgradeDraftChanged(true);
							setPlannerInput(value);
							setExcludedSources(new Set());
							setTargetOverrides(new Map());
						},
						onRemoveRule: (source, manual) => {
							setUpgradeDraftChanged(true);
							const sourceKey = signalIdentity(source);
							if (manual) {
								setManualRules((current) =>
									current.filter((candidate) => signalIdentity(candidate.from) !== sourceKey),
								);
							} else {
								setExcludedSources((current) => new Set(current).add(sourceKey));
							}
						},
						onPlannerSourceChange: (choice) => {
							setUpgradeDraftChanged(true);
							setUpgradeSource(choice.source);
							setUpgradeSourceLabel(choice.label);
							setSelectedPlanner(choice.planner);
							setExcludedSources(new Set());
							setTargetOverrides(new Map());
						},
						onTargetChange: (source, target, preserveQuality) => {
							setUpgradeDraftChanged(true);
							setTargetOverrides((current) =>
								new Map(current).set(signalIdentity(source), {preserveQuality, to: target}),
							);
						},
						plannerInput,
						rootBlueprint: rootBlueprint ?? blueprint,
						source: upgradeSource,
						sourceLabel: upgradeSourceLabel,
						sourceOptions,
					}}
					matchCount={plannerReplacementCount}
					onApplyDowngrades={() => {
						applyPlanner('downgrade');
					}}
					onApplyUpgrades={() => {
						applyPlanner('upgrade');
					}}
					onClose={requestCloseUpgradePlanner}
					onScopeChange={(scope) => {
						setUpgradeDraftChanged(true);
						setUpgradeScope(scope);
						setExcludedSources(new Set());
					}}
					replacements={{
						iconMappingCount: iconReplacements.length,
						iconReplacementCount,
						metadataFind,
						metadataReplace,
						metadataReplacementCount,
						onIconReplacementsOpen: () => {
							setIconReplacementOpen(true);
						},
						onMetadataFindChange: (value) => {
							setUpgradeDraftChanged(true);
							setMetadataFind(value);
						},
						onMetadataReplaceChange: (value) => {
							setUpgradeDraftChanged(true);
							setMetadataReplace(value);
						},
						onTextReplacementEnabledChange: (enabled) => {
							setUpgradeDraftChanged(true);
							setTextReplacementEnabled(enabled);
						},
						textReplacementEnabled,
					}}
					scope={upgradeScope}
					selectionScopeDisabled={type === 'upgrade-planner'}
					selectionScopeLabel={canChooseRootScope ? 'This selection' : 'This blueprint or book'}
				/>
			) : null}
			{blueprintEditorOpen ? (
				<BlueprintEditorDialog
					blueprint={blueprint}
					book={type === 'blueprint-book'}
					bookOperationSelected={hasSelectedBookOperation}
					breadcrumb={editorBreadcrumb}
					description={editorDescription}
					dirty={editorDirty}
					draftBlueprint={editorDraft.selectedBlueprint}
					closeConfirmationOpen={blueprintCloseConfirmationOpen}
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
					onDiscard={discardBlueprintEditorDraft}
					onDropPlanner={placeDroppedPlanner}
					onEntitiesIncludedChange={(included) => {
						setStripEntitiesSelected(!included);
					}}
					onFlattenBookSelectedChange={setFlattenBookSelected}
					onLabelChange={setEditorLabel}
					onKeepEditing={keepEditingBlueprint}
					onModulesIncludedChange={(included) => {
						setStripModulesSelected(!included);
					}}
					onParametersChange={setEditorParameters}
					onPlannerPlace={(choice, direction) => {
						setEditorPlacedPlanner({choice, direction});
						setEditorPlannerDropError(undefined);
					}}
					onSaved={() => {
						closeBlueprintEditor();
						setIconReplacementOpen(false);
						setUpgradePlannerOpen(false);
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
					selectedPath={selectedPath}
					signalOptions={editorIconOptions}
					snapGrid={editorSnapGrid}
					sortBookSelected={sortBookSelected}
					stripEntitiesSelected={stripEntitiesSelected}
					stripModulesSelected={stripModulesSelected}
					stripTilesSelected={stripTilesSelected}
					stripTrainsSelected={stripTrainsSelected}
				/>
			) : null}
			{upgradeDiscardConfirmationOpen ? (
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
									setUpgradeDiscardConfirmationOpen(false);
								}}
							>
								Keep editing
							</button>
							<button
								type="button"
								className="transform-button transform-button--danger"
								onClick={() => {
									resetUpgradePlannerDraft();
									setUpgradePlannerOpen(false);
									setUpgradeDiscardConfirmationOpen(false);
								}}
							>
								Discard changes
							</button>
						</div>
					</section>
				</div>
			) : null}
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
