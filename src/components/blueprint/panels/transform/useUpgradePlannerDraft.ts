import {useMemo, useState} from 'react';

import gameData from '../../../../generated/game-data.json';
import {extractNames} from '../../../../parsing/modDetection/nameExtractor';
import type {BlueprintString, SignalID, UpgradePlanner, UpgradeSourceSignal} from '../../../../parsing/types';
import {updateNestedBlueprint} from '../../../../transform/applyAtPath';
import {
	analyzeIconReplacements,
	analyzeMetadataSubstitution,
	applyIconReplacements,
	applyMetadataSubstitution,
	type IconReplacement,
	type MetadataSubstitution,
} from '../../../../transform/metadataSubstitution';
import {
	analyzeUpgradeRules,
	applyUpgradeRules,
	builtInUpgradeRules,
	parseUpgradePlanner,
	rulesFromUpgradePlanner,
	type UpgradeDirection,
	type UpgradeRule,
} from '../../../../transform/upgradePlanner';
import type {UpgradePlannerChoice} from './UpgradePlannerSelectorDialog';
import {normalizedSignalType, signalIdentity} from './upgradePlannerSignals';

type UpgradePlannerScope = 'selection' | 'root';

interface UseUpgradePlannerDraftOptions {
	blueprint?: BlueprintString;
	rootBlueprint?: BlueprintString;
	selectedPath: string;
}

interface ResolvedRules {
	error: string | undefined;
	rules: UpgradeRule[];
}

interface UpgradeTargetOverride {
	preserveQuality: boolean;
	to: SignalID;
}

interface SavedUpgradePlannerSession {
	choice: UpgradePlannerChoice;
	iconReplacements: IconReplacement[];
	metadataSubstitution: MetadataSubstitution;
	rules: UpgradeRule[];
	scope: UpgradePlannerScope;
	textReplacementEnabled: boolean;
}

const savedPlannerSource = 'session:saved-upgrade-planner';

function resolveRules(
	source: string,
	plannerInput: string,
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
		if (source.startsWith('book:') || source.startsWith('history:')) {
			if (selectedPlanner === undefined) {
				throw new Error('The loaded upgrade planner is unavailable.');
			}
			return {error: undefined, rules: rulesFromUpgradePlanner(selectedPlanner, 'upgrade')};
		}
		throw new Error(`Unsupported upgrade planner source: ${source}`);
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

function plannerTarget(rule: UpgradeRule): SignalID {
	if (!rule.preserveQuality) {
		return {...rule.to, quality: rule.to.quality ?? 'normal'};
	}
	const {quality: _quality, ...target} = rule.to;
	return target;
}

function plannerFromRules(rules: readonly UpgradeRule[]): UpgradePlanner {
	return {
		item: 'upgrade-planner',
		label: 'Saved Upgrade Planner',
		version: 0,
		settings: {
			mappers: rules.map((rule, index) => ({
				from: {...rule.from},
				index: index + 1,
				to: plannerTarget(rule),
			})),
		},
	};
}

function applySession(
	session: SavedUpgradePlannerSession,
	rootBlueprint: BlueprintString,
	selectedPath: string,
	direction: UpgradeDirection,
): BlueprintString {
	const rules = direction === 'upgrade' ? session.rules : session.rules.map(reverseUpgradeRule);
	const applyEntityRules = (target: BlueprintString) => applyUpgradeRules(target, rules);
	const upgradedRoot =
		session.scope === 'root'
			? applyEntityRules(rootBlueprint)
			: updateNestedBlueprint(rootBlueprint, selectedPath, applyEntityRules);
	if (upgradedRoot === null) {
		throw new Error('The selected blueprint no longer exists in the root book.');
	}
	let transformedRoot = upgradedRoot;
	if (session.iconReplacements.length > 0) {
		transformedRoot = applyIconReplacements(transformedRoot, session.iconReplacements);
	}
	if (session.textReplacementEnabled && session.metadataSubstitution.find !== '') {
		transformedRoot = applyMetadataSubstitution(transformedRoot, session.metadataSubstitution);
	}
	return transformedRoot;
}

export function useUpgradePlannerDraft({blueprint, rootBlueprint, selectedPath}: UseUpgradePlannerDraftOptions) {
	const [plannerOpen, setPlannerOpen] = useState(false);
	const [draftChanged, setDraftChanged] = useState(false);
	const [iconReplacementOpen, setIconReplacementOpen] = useState(false);
	const [discardConfirmationOpen, setDiscardConfirmationOpen] = useState(false);
	const [applicationSelectorOpen, setApplicationSelectorOpen] = useState(false);
	const [source, setSource] = useState(() =>
		blueprint?.upgrade_planner === undefined ? 'suggested' : `book:${selectedPath}`,
	);
	const [sourceLabel, setSourceLabel] = useState(() =>
		blueprint?.upgrade_planner === undefined
			? 'Default Upgrade'
			: (blueprint.upgrade_planner.label ?? 'Current upgrade planner'),
	);
	const [selectedPlanner, setSelectedPlanner] = useState<UpgradePlanner | undefined>(blueprint?.upgrade_planner);
	const [plannerInput, setPlannerInput] = useState('');
	const [scope, setScope] = useState<UpgradePlannerScope>(() =>
		blueprint?.upgrade_planner === undefined ? 'selection' : 'root',
	);
	const [excludedSources, setExcludedSources] = useState<Set<string>>(() => new Set());
	const [targetOverrides, setTargetOverrides] = useState<Map<string, UpgradeTargetOverride>>(() => new Map());
	const [manualRules, setManualRules] = useState<UpgradeRule[]>([]);
	const [manualRulePositions, setManualRulePositions] = useState<Map<string, number>>(() => new Map());
	const [iconReplacements, setIconReplacements] = useState<IconReplacement[]>([]);
	const [textReplacementEnabled, setTextReplacementEnabled] = useState(true);
	const [metadataFind, setMetadataFind] = useState('');
	const [metadataReplace, setMetadataReplace] = useState('');
	const [savedSession, setSavedSession] = useState<SavedUpgradePlannerSession>();

	const transformTarget = scope === 'root' ? rootBlueprint : blueprint;
	const resolvedRules = useMemo(
		() => resolveRules(source, plannerInput, selectedPlanner),
		[source, plannerInput, selectedPlanner],
	);
	const manualSourceKeys = useMemo(
		() => new Set(manualRules.map((rule) => signalIdentity(rule.from))),
		[manualRules],
	);
	const effectiveRules = useMemo(() => {
		const positionedRules = manualRules
			.map((rule) => ({position: manualRulePositions.get(signalIdentity(rule.from)), rule}))
			.filter((entry): entry is {position: number; rule: UpgradeRule} => entry.position !== undefined)
			.sort((left, right) => left.position - right.position);
		const replacedPositions = new Set(positionedRules.map(({position}) => position));
		const combinedRules = resolvedRules.rules.filter(
			(rule, index) => !replacedPositions.has(index) && !manualSourceKeys.has(signalIdentity(rule.from)),
		);
		for (const {position, rule} of positionedRules) {
			combinedRules.splice(Math.min(position, combinedRules.length), 0, rule);
		}
		combinedRules.push(...manualRules.filter((rule) => !manualRulePositions.has(signalIdentity(rule.from))));
		return combinedRules.map((rule) => {
			const override = targetOverrides.get(signalIdentity(rule.from));
			return override === undefined ? rule : {...rule, ...override};
		});
	}, [manualRulePositions, manualRules, manualSourceKeys, resolvedRules.rules, targetOverrides]);
	const reverseRules = useMemo(() => effectiveRules.map(reverseUpgradeRule), [effectiveRules]);
	const candidates = useMemo(() => {
		if (!plannerOpen || transformTarget === undefined || effectiveRules.length === 0) {
			return [];
		}
		const forwardMatches = analyzeUpgradeRules(transformTarget, effectiveRules);
		const reverseMatches = analyzeUpgradeRules(transformTarget, reverseRules);
		const forwardCounts = new Map(
			forwardMatches.map((candidate) => [signalIdentity(candidate.from), candidate.count]),
		);
		const reverseCounts = new Map(
			reverseMatches.map((candidate) => [signalIdentity(candidate.to), candidate.count]),
		);
		if (source === 'suggested') {
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
	}, [effectiveRules, manualSourceKeys, plannerOpen, reverseRules, source, transformTarget]);
	const selectedCandidates = useMemo(
		() => candidates.filter((candidate) => !excludedSources.has(signalIdentity(candidate.from))),
		[candidates, excludedSources],
	);
	const metadataSubstitution = useMemo(
		() => ({find: metadataFind, replace: metadataReplace}),
		[metadataFind, metadataReplace],
	);
	const metadataReplacementCount = useMemo(
		() =>
			!plannerOpen || rootBlueprint === undefined || metadataFind === ''
				? 0
				: analyzeMetadataSubstitution(rootBlueprint, metadataSubstitution),
		[metadataFind, metadataSubstitution, plannerOpen, rootBlueprint],
	);
	const iconReplacementCount = useMemo(
		() =>
			!plannerOpen || rootBlueprint === undefined || iconReplacements.length === 0
				? 0
				: analyzeIconReplacements(rootBlueprint, iconReplacements),
		[iconReplacements, plannerOpen, rootBlueprint],
	);
	const sourceOptions = useMemo(() => upgradeSourceOptions(transformTarget), [transformTarget]);
	const matchCount =
		selectedCandidates.reduce((total, candidate) => total + candidate.count, 0) +
		iconReplacementCount +
		(textReplacementEnabled ? metadataReplacementCount : 0);

	const resetDraft = () => {
		setSource(blueprint?.upgrade_planner === undefined ? 'suggested' : `book:${selectedPath}`);
		setSourceLabel(
			blueprint?.upgrade_planner === undefined
				? 'Default Upgrade'
				: (blueprint.upgrade_planner.label ?? 'Current upgrade planner'),
		);
		setSelectedPlanner(blueprint?.upgrade_planner);
		setPlannerInput('');
		setScope(blueprint?.upgrade_planner === undefined ? 'selection' : 'root');
		setExcludedSources(new Set());
		setTargetOverrides(new Map());
		setManualRules([]);
		setManualRulePositions(new Map());
		setIconReplacements([]);
		setTextReplacementEnabled(true);
		setMetadataFind('');
		setMetadataReplace('');
		setDraftChanged(false);
	};
	const savePlanner = () => {
		if (rootBlueprint === undefined || resolvedRules.error !== undefined) {
			throw new Error('Cannot save an invalid upgrade planner.');
		}
		const rules = selectedCandidates.map(({from, preserveQuality, to}) => ({
			from: {...from},
			preserveQuality,
			to: {...to},
		}));
		const planner = plannerFromRules(rules);
		setSavedSession({
			choice: {label: planner.label ?? 'Saved Upgrade Planner', planner, source: savedPlannerSource},
			iconReplacements: iconReplacements.map((replacement) => ({
				from: {...replacement.from},
				to: {...replacement.to},
			})),
			metadataSubstitution: {...metadataSubstitution},
			rules,
			scope,
			textReplacementEnabled,
		});
		setDraftChanged(false);
		setPlannerOpen(false);
		setApplicationSelectorOpen(true);
	};
	const applySavedPlanner = (targetRoot: BlueprintString, direction: UpgradeDirection): BlueprintString => {
		if (savedSession === undefined) {
			throw new Error('No saved upgrade planner session is available.');
		}
		return applySession(savedSession, targetRoot, selectedPath, direction);
	};
	const changeManualRule = (previousSource: UpgradeSourceSignal, rule: UpgradeRule) => {
		setDraftChanged(true);
		const previousKey = signalIdentity(previousSource);
		const nextKey = signalIdentity(rule.from);
		const previousPosition = effectiveRules.findIndex(
			(candidate) => signalIdentity(candidate.from) === previousKey,
		);
		setExcludedSources((current) => {
			const next = new Set(current);
			next.delete(nextKey);
			if (previousKey !== nextKey) {
				next.add(previousKey);
			}
			return next;
		});
		setTargetOverrides((current) => {
			const next = new Map(current);
			next.delete(previousKey);
			next.delete(nextKey);
			return next;
		});
		setManualRulePositions((current) => {
			const next = new Map(current);
			const position = next.get(previousKey) ?? previousPosition;
			next.delete(previousKey);
			if (position >= 0) {
				next.set(nextKey, position);
			}
			return next;
		});
		setManualRules((current) => [
			...current.filter((candidate) => signalIdentity(candidate.from) !== previousKey),
			rule,
		]);
	};

	return {
		applicationSelectorOpen,
		applySavedPlanner,
		closeApplicationSelector: () => {
			setApplicationSelectorOpen(false);
		},
		closeIconReplacement: () => {
			setIconReplacementOpen(false);
		},
		closePlanner: () => {
			setDiscardConfirmationOpen(false);
			setPlannerOpen(false);
		},
		discardConfirmationOpen,
		discardPlanner: () => {
			resetDraft();
			setDiscardConfirmationOpen(false);
			setPlannerOpen(false);
		},
		iconReplacementOpen,
		iconReplacements,
		keepEditingPlanner: () => {
			setDiscardConfirmationOpen(false);
		},
		mappings: {
			candidates,
			error: resolvedRules.error,
			excludedSources,
			manualRules,
			onAddManualRule: (rule: UpgradeRule) => {
				setDraftChanged(true);
				setManualRules((current) => [
					...current.filter((candidate) => signalIdentity(candidate.from) !== signalIdentity(rule.from)),
					rule,
				]);
			},
			onChangeManualRule: changeManualRule,
			onPlannerInputChange: (value: string) => {
				setDraftChanged(true);
				setPlannerInput(value);
				setExcludedSources(new Set());
				setTargetOverrides(new Map());
				setManualRules([]);
				setManualRulePositions(new Map());
			},
			onPlannerLoad: (choice: UpgradePlannerChoice) => {
				setDraftChanged(true);
				setSource(choice.source);
				setSourceLabel(choice.label);
				setSelectedPlanner(choice.planner);
				setExcludedSources(new Set());
				setTargetOverrides(new Map());
				setManualRules([]);
				setManualRulePositions(new Map());
			},
			onRemoveRule: (mappingSource: UpgradeSourceSignal, manual: boolean) => {
				setDraftChanged(true);
				const sourceKey = signalIdentity(mappingSource);
				if (manual) {
					setManualRulePositions((current) => {
						const next = new Map(current);
						next.delete(sourceKey);
						return next;
					});
					setManualRules((current) =>
						current.filter((candidate) => signalIdentity(candidate.from) !== sourceKey),
					);
				} else {
					setExcludedSources((current) => new Set(current).add(sourceKey));
				}
			},
			onTargetChange: (mappingSource: SignalID, target: SignalID, preserveQuality: boolean) => {
				setDraftChanged(true);
				setTargetOverrides((current) =>
					new Map(current).set(signalIdentity(mappingSource), {preserveQuality, to: target}),
				);
			},
			plannerInput,
			source,
			sourceLabel,
			sourceOptions,
		},
		matchCount,
		onIconReplacementsChange: (replacements: IconReplacement[]) => {
			setDraftChanged(true);
			setIconReplacements(replacements);
		},
		onScopeChange: (nextScope: UpgradePlannerScope) => {
			setDraftChanged(true);
			setScope(nextScope);
			setExcludedSources(new Set());
		},
		openPlanner: () => {
			setDiscardConfirmationOpen(false);
			setPlannerOpen(true);
		},
		plannerOpen,
		replacements: {
			iconMappingCount: iconReplacements.length,
			iconReplacementCount,
			metadataFind,
			metadataReplace,
			metadataReplacementCount,
			onIconReplacementsOpen: () => {
				setIconReplacementOpen(true);
			},
			onMetadataFindChange: (value: string) => {
				setDraftChanged(true);
				setMetadataFind(value);
			},
			onMetadataReplaceChange: (value: string) => {
				setDraftChanged(true);
				setMetadataReplace(value);
			},
			onTextReplacementEnabledChange: (enabled: boolean) => {
				setDraftChanged(true);
				setTextReplacementEnabled(enabled);
			},
			textReplacementEnabled,
		},
		requestClosePlanner: () => {
			if (draftChanged) {
				setDiscardConfirmationOpen(true);
			} else {
				setPlannerOpen(false);
			}
		},
		savePlanner,
		saveDisabled: rootBlueprint === undefined || resolvedRules.error !== undefined,
		savedPlannerChoice: savedSession?.choice,
		scope,
		sourceOptions,
	};
}
