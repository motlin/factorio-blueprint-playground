import {useMemo, useState} from 'react';

import gameData from '../../../../generated/game-data.json';
import {extractNames} from '../../../../parsing/modDetection/nameExtractor';
import {serializeBlueprint} from '../../../../parsing/blueprintParser';
import type {BlueprintString, SignalID, UpgradePlanner, UpgradeSourceSignal} from '../../../../parsing/types';
import type {LibraryRecord, LibraryRecordContent} from '../../../../storage/db';
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
import type {PositionedUpgradeCandidate} from './UpgradeMappingGrid';
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
	slotIndexes: ReadonlyMap<string, number>;
}

interface UpgradeTargetOverride {
	preserveQuality: boolean;
	to: SignalID;
}

interface UpgradePlannerDraftApplication {
	iconReplacements: IconReplacement[];
	metadataSubstitution: MetadataSubstitution;
	rules: UpgradeRule[];
	scope: UpgradePlannerScope;
	textReplacementEnabled: boolean;
}

function resolveRules(
	source: string,
	plannerInput: string,
	selectedPlanner: UpgradePlanner | undefined,
): ResolvedRules {
	try {
		if (source === 'custom') {
			return {error: undefined, rules: [], slotIndexes: new Map()};
		}
		if (source === 'suggested') {
			const rules = builtInUpgradeRules('upgrade');
			return {
				error: undefined,
				rules,
				slotIndexes: new Map(rules.map((rule, index) => [signalIdentity(rule.from), index])),
			};
		}
		if (source === 'pasted') {
			return resolvePlannerRules(parseUpgradePlanner(plannerInput));
		}
		if (source.startsWith('book:') || source.startsWith('library:')) {
			if (selectedPlanner === undefined) {
				throw new Error('The loaded upgrade planner is unavailable.');
			}
			return resolvePlannerRules(selectedPlanner);
		}
		throw new Error(`Unsupported upgrade planner source: ${source}`);
	} catch (error) {
		return {
			error: error instanceof Error ? error.message : String(error),
			rules: [],
			slotIndexes: new Map(),
		};
	}
}

function resolvePlannerRules(planner: UpgradePlanner): ResolvedRules {
	const rules = rulesFromUpgradePlanner(planner, 'upgrade');
	const completeMappings = [...planner.settings.mappers]
		.filter((mapping) => mapping.from !== undefined && mapping.to !== undefined)
		.sort((left, right) => left.index - right.index);
	return {
		error: undefined,
		rules,
		slotIndexes: new Map(
			rules.map((rule, index) => [
				signalIdentity(rule.from),
				Math.max(0, (completeMappings[index]?.index ?? index + 1) - 1),
			]),
		),
	};
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

function plannerFromRules(
	rules: readonly {rule: UpgradeRule; slotIndex: number}[],
	label: string,
	template: UpgradePlanner | undefined,
): UpgradePlanner {
	return {
		...structuredClone(template),
		item: 'upgrade-planner',
		label,
		version: template?.version ?? 0,
		settings: {
			...structuredClone(template?.settings),
			mappers: rules.map(({rule, slotIndex}) => ({
				from: {...rule.from},
				index: slotIndex + 1,
				to: plannerTarget(rule),
			})),
		},
	};
}

function applySession(
	session: UpgradePlannerDraftApplication,
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

/**
 * Authoritative Upgrade Planner draft contract:
 *
 * - Draft state is an ordered array of mapper records with stable indexes and
 *   independently optional From and To values. It preserves incomplete pairs,
 *   internal holes, source quality conditions and module filters, destination
 *   exact quality, module limits, and module-slot plans. Derived candidates,
 *   exclusions, overrides, match counts, and visible rows are projections only.
 * - A confirmed picker value replaces its endpoint in the draft immediately.
 *   Clearing replaces only that endpoint; swapping replaces the two complete
 *   indexed records. Loading or pasting a planner installs its indexed mapper
 *   records as the new draft. UI-local optimistic values are reconciled from this
 *   state after every mutation.
 * - Changing From recomputes To eligibility. A compatible To and its compatible
 *   options may survive; an incompatible To must be cleared before the updated
 *   record becomes authoritative. The same rule applies to imported or restored
 *   state that bypasses a picker.
 * - Saving creates or updates an explicit Blueprint Library record supplied by
 *   the parent. Applying is an independent operation against the current
 *   blueprint scope: upgrade interprets From to To and downgrade reverses the
 *   displayed draft. Website-only book-wide replacements remain application
 *   state and are never serialized into the Factorio planner record. Zero
 *   application matches must not delete records.
 *
 * The current layered rule/exclusion/override session is transitional. It should
 * converge on the direct record draft above before mapper widgets rely on it.
 */
export function useUpgradePlannerDraft({blueprint, rootBlueprint, selectedPath}: UseUpgradePlannerDraftOptions) {
	const [plannerOpen, setPlannerOpen] = useState(false);
	const [plannerDraftChanged, setPlannerDraftChanged] = useState(false);
	const [applicationDraftChanged, setApplicationDraftChanged] = useState(false);
	const [iconReplacementOpen, setIconReplacementOpen] = useState(false);
	const [discardConfirmationOpen, setDiscardConfirmationOpen] = useState(false);
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
	const [savedLibraryRecord, setSavedLibraryRecord] = useState<LibraryRecord>();

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
		const positionedManualRules = manualRules
			.map((rule) => ({position: manualRulePositions.get(signalIdentity(rule.from)), rule}))
			.filter((entry): entry is {position: number; rule: UpgradeRule} => entry.position !== undefined)
			.sort((left, right) => left.position - right.position);
		const replacedPositions = new Set(positionedManualRules.map(({position}) => position));
		const positionedResolvedRules = resolvedRules.rules
			.map((rule, index) => ({
				position: resolvedRules.slotIndexes.get(signalIdentity(rule.from)) ?? index,
				rule,
			}))
			.filter(
				({position, rule}) =>
					!replacedPositions.has(position) && !manualSourceKeys.has(signalIdentity(rule.from)),
			);
		const combinedRules = [...positionedResolvedRules, ...positionedManualRules]
			.sort((left, right) => left.position - right.position)
			.map(({rule}) => rule);
		combinedRules.push(...manualRules.filter((rule) => !manualRulePositions.has(signalIdentity(rule.from))));
		return combinedRules.map((rule) => {
			const override = targetOverrides.get(signalIdentity(rule.from));
			return override === undefined ? rule : {...rule, ...override};
		});
	}, [
		manualRulePositions,
		manualRules,
		manualSourceKeys,
		resolvedRules.rules,
		resolvedRules.slotIndexes,
		targetOverrides,
	]);
	const reverseRules = useMemo(() => effectiveRules.map(reverseUpgradeRule), [effectiveRules]);
	const candidates = useMemo<PositionedUpgradeCandidate[]>(() => {
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
			return effectiveRules.flatMap((rule, index) => {
				const sourceKey = signalIdentity(rule.from);
				const count = (forwardCounts.get(sourceKey) ?? 0) + (reverseCounts.get(sourceKey) ?? 0);
				return count === 0 && !manualSourceKeys.has(sourceKey)
					? []
					: [
							{
								...rule,
								count,
								slotIndex:
									manualRulePositions.get(sourceKey) ??
									resolvedRules.slotIndexes.get(sourceKey) ??
									index,
							},
						];
			});
		}
		return effectiveRules.map((rule, index) => {
			const sourceKey = signalIdentity(rule.from);
			return {
				...rule,
				count: (forwardCounts.get(sourceKey) ?? 0) + (reverseCounts.get(sourceKey) ?? 0),
				slotIndex: manualRulePositions.get(sourceKey) ?? resolvedRules.slotIndexes.get(sourceKey) ?? index,
			};
		});
	}, [
		effectiveRules,
		manualRulePositions,
		manualSourceKeys,
		plannerOpen,
		resolvedRules.slotIndexes,
		reverseRules,
		source,
		transformTarget,
	]);
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
	const draftChanged = plannerDraftChanged || applicationDraftChanged;

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
		setPlannerDraftChanged(false);
		setApplicationDraftChanged(false);
		setSavedLibraryRecord(undefined);
	};
	const positionedDraftRules = () =>
		selectedCandidates.map(({from, preserveQuality, slotIndex, to}) => ({
			rule: {
				from: {...from},
				preserveQuality,
				to: {...to},
			},
			slotIndex,
		}));
	const plannerTemplate = () => {
		if (source === 'pasted') {
			return parseUpgradePlanner(plannerInput);
		}
		return selectedPlanner;
	};
	const plannerForLibrary = (label: string): UpgradePlanner => {
		if (rootBlueprint === undefined || resolvedRules.error !== undefined) {
			throw new Error('Cannot save an invalid upgrade planner.');
		}
		const normalizedLabel = label.trim();
		if (normalizedLabel === '') {
			throw new Error('A library planner name is required.');
		}
		return plannerFromRules(positionedDraftRules(), normalizedLabel, plannerTemplate());
	};
	const libraryRecordContent = (label: string): LibraryRecordContent => {
		const planner = plannerForLibrary(label);
		return {
			data: serializeBlueprint({upgrade_planner: planner}),
			gameData: {
				type: 'upgrade_planner',
				label: planner.label,
				description: planner.settings.description,
				gameVersion: planner.version.toString(),
				icons: (planner.settings.icons ?? []).map(({signal}) => ({...signal})),
			},
		};
	};
	const draftApplication = (): UpgradePlannerDraftApplication => ({
		iconReplacements: iconReplacements.map((replacement) => ({
			from: {...replacement.from},
			to: {...replacement.to},
		})),
		metadataSubstitution: {...metadataSubstitution},
		rules: positionedDraftRules().map(({rule}) => rule),
		scope,
		textReplacementEnabled,
	});
	const applyDraftPlanner = (targetRoot: BlueprintString, direction: UpgradeDirection): BlueprintString =>
		applySession(draftApplication(), targetRoot, selectedPath, direction);
	const changeManualRule = (previousSource: UpgradeSourceSignal, rule: UpgradeRule) => {
		setPlannerDraftChanged(true);
		const previousKey = signalIdentity(previousSource);
		const nextKey = signalIdentity(rule.from);
		const previousPosition =
			manualRulePositions.get(previousKey) ??
			resolvedRules.slotIndexes.get(previousKey) ??
			effectiveRules.findIndex((candidate) => signalIdentity(candidate.from) === previousKey);
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
		applyDraftPlanner,
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
			onAddManualRule: (rule: UpgradeRule, slotIndex: number) => {
				setPlannerDraftChanged(true);
				setManualRulePositions((current) => new Map(current).set(signalIdentity(rule.from), slotIndex));
				setManualRules((current) => [
					...current.filter((candidate) => signalIdentity(candidate.from) !== signalIdentity(rule.from)),
					rule,
				]);
			},
			onChangeManualRule: changeManualRule,
			onPlannerInputChange: (value: string) => {
				setPlannerDraftChanged(true);
				setPlannerInput(value);
				setExcludedSources(new Set());
				setTargetOverrides(new Map());
				setManualRules([]);
				setManualRulePositions(new Map());
			},
			onPlannerLoad: (choice: UpgradePlannerChoice) => {
				setPlannerDraftChanged(true);
				setSavedLibraryRecord(undefined);
				setSource(choice.source);
				setSourceLabel(choice.label);
				setSelectedPlanner(choice.planner);
				setExcludedSources(new Set());
				setTargetOverrides(new Map());
				setManualRules([]);
				setManualRulePositions(new Map());
			},
			onRemoveRule: (mappingSource: UpgradeSourceSignal, manual: boolean) => {
				setPlannerDraftChanged(true);
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
			onTargetChange: (mappingSource: SignalID, target: SignalID) => {
				setPlannerDraftChanged(true);
				setTargetOverrides((current) =>
					new Map(current).set(signalIdentity(mappingSource), {preserveQuality: false, to: target}),
				);
			},
			plannerInput,
			source,
			sourceLabel,
			sourceOptions,
		},
		matchCount,
		onIconReplacementsChange: (replacements: IconReplacement[]) => {
			setApplicationDraftChanged(true);
			setIconReplacements(replacements);
		},
		onScopeChange: (nextScope: UpgradePlannerScope) => {
			setApplicationDraftChanged(true);
			setScope(nextScope);
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
				setApplicationDraftChanged(true);
				setMetadataFind(value);
			},
			onMetadataReplaceChange: (value: string) => {
				setApplicationDraftChanged(true);
				setMetadataReplace(value);
			},
			onTextReplacementEnabledChange: (enabled: boolean) => {
				setApplicationDraftChanged(true);
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
		libraryRecordContent,
		libraryRecordId: source.startsWith('library:') ? source.slice('library:'.length) : undefined,
		onLibraryRecordSaved: (record: LibraryRecord) => {
			const planner = parseUpgradePlanner(record.data);
			setSource(`library:${record.id}`);
			setSourceLabel(record.gameData.label ?? planner.label ?? 'Saved upgrade planner');
			setSelectedPlanner(planner);
			setPlannerInput('');
			setExcludedSources(new Set());
			setTargetOverrides(new Map());
			setManualRules([]);
			setManualRulePositions(new Map());
			setPlannerDraftChanged(false);
			setSavedLibraryRecord(record);
		},
		saveDisabled: rootBlueprint === undefined || resolvedRules.error !== undefined,
		savedLibraryRecord,
		savedPlannerChoice:
			savedLibraryRecord === undefined
				? undefined
				: {
						label: savedLibraryRecord.gameData.label ?? 'Saved upgrade planner',
						planner: parseUpgradePlanner(savedLibraryRecord.data),
						source: `library:${savedLibraryRecord.id}`,
					},
		scope,
		sourceOptions,
	};
}
