import {useMemo, useRef, useState} from 'react';

import gameData from '../../../../generated/game-data.json';
import {serializeBlueprint} from '../../../../parsing/blueprintParser';
import type {
	BlueprintString,
	SignalID,
	UpgradeMapping,
	UpgradePlanner,
	UpgradeSourceSignal,
} from '../../../../parsing/types';
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
	type UpgradeDirection,
	type UpgradeRule,
} from '../../../../transform/upgradePlanner';
import type {UpgradePlannerChoice} from './UpgradePlannerSelectorDialog';
import type {PositionedUpgradeMapping} from './UpgradeMappingGrid';
import {
	isUpgradeSourceOption,
	isUpgradeTargetSelectionAllowed,
	normalizedSignalType,
	pickerSignals,
	signalIdentity,
} from './upgradePlannerSignals';

type UpgradePlannerScope = 'selection' | 'root';

interface UseUpgradePlannerDraftOptions {
	blueprint?: BlueprintString;
	rootBlueprint?: BlueprintString;
	selectedPath: string;
}

interface UpgradeMappingDraft {
	from?: UpgradeSourceSignal;
	mappingId: string;
	preserveQuality: boolean;
	slotIndex: number;
	to?: SignalID;
}

interface UpgradePlannerDraftApplication {
	iconReplacements: IconReplacement[];
	metadataSubstitution: MetadataSubstitution;
	rules: UpgradeRule[];
	scope: UpgradePlannerScope;
	textReplacementEnabled: boolean;
}

function upgradeSourceOptions(): SignalID[] {
	const options = new Map<string, SignalID>();
	for (const {from, to} of gameData.nextUpgrades) {
		options.set(`entity:${from}`, {type: 'entity', name: from});
		options.set(`entity:${to}`, {type: 'entity', name: to});
	}
	for (const signal of pickerSignals.filter(isUpgradeSourceOption)) {
		options.set(`${normalizedSignalType(signal)}:${signal.name}`, signal);
	}
	return [...options.values()].sort(
		(left, right) =>
			normalizedSignalType(left).localeCompare(normalizedSignalType(right)) ||
			left.name.localeCompare(right.name),
	);
}

function completeRules(mappings: readonly UpgradeMappingDraft[], source: string): UpgradeRule[] {
	const explicitRules = mappings.flatMap(({from, preserveQuality, to}) =>
		from === undefined || to === undefined ? [] : [{from: {...from}, preserveQuality, to: {...to}}],
	);
	return source === 'suggested' && mappings.length === 0 ? builtInUpgradeRules('upgrade') : explicitRules;
}

function reverseUpgradeRule(rule: UpgradeRule): UpgradeRule {
	const {comparator: _comparator, ...target} = rule.from;
	return {
		from: rule.to,
		preserveQuality: rule.preserveQuality,
		to: target,
	};
}

function plannerFromMappings(
	mappings: readonly UpgradeMappingDraft[],
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
			mappers: [...mappings]
				.sort((left, right) => left.slotIndex - right.slotIndex)
				.map(({from, slotIndex, to}): UpgradeMapping => {
					const mapping: UpgradeMapping = {index: slotIndex + 1};
					if (from !== undefined) {
						mapping.from = {...from};
					}
					if (to !== undefined) {
						mapping.to = {...to};
					}
					return mapping;
				}),
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
 */
export function useUpgradePlannerDraft({blueprint, rootBlueprint, selectedPath}: UseUpgradePlannerDraftOptions) {
	const nextMappingIdentity = useRef(0);
	const mappingsFromPlanner = (
		planner: UpgradePlanner | undefined,
		includeDefaultMappings = false,
	): UpgradeMappingDraft[] => {
		const serializedMappings =
			planner === undefined && includeDefaultMappings
				? builtInUpgradeRules('upgrade').map(
						({from, to}, index): UpgradeMapping => ({from, index: index + 1, to}),
					)
				: (planner?.settings.mappers ?? []);
		return [...serializedMappings]
			.sort((left, right) => left.index - right.index)
			.map(({from, index, to}) => {
				nextMappingIdentity.current += 1;
				const mapping: UpgradeMappingDraft = {
					mappingId: `upgrade-mapping-${nextMappingIdentity.current.toString()}`,
					preserveQuality: includeDefaultMappings,
					slotIndex: Math.max(0, index - 1),
				};
				if (from !== undefined) {
					mapping.from = {...from};
				}
				if (to !== undefined && (from === undefined || isUpgradeTargetSelectionAllowed(from, to))) {
					mapping.to = {...to};
				}
				return mapping;
			});
	};
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
	const [plannerError, setPlannerError] = useState<string>();
	const [mappingDrafts, setMappingDrafts] = useState<UpgradeMappingDraft[]>(() =>
		mappingsFromPlanner(blueprint?.upgrade_planner, blueprint?.upgrade_planner === undefined),
	);
	const [scope, setScope] = useState<UpgradePlannerScope>(() =>
		blueprint?.upgrade_planner === undefined ? 'selection' : 'root',
	);
	const [iconReplacements, setIconReplacements] = useState<IconReplacement[]>([]);
	const [textReplacementEnabled, setTextReplacementEnabled] = useState(true);
	const [metadataFind, setMetadataFind] = useState('');
	const [metadataReplace, setMetadataReplace] = useState('');
	const [savedLibraryRecord, setSavedLibraryRecord] = useState<LibraryRecord>();

	const transformTarget = scope === 'root' ? rootBlueprint : blueprint;
	const mappingRuleError = useMemo(() => {
		const sources = new Set<string>();
		for (const mapping of mappingDrafts) {
			if (mapping.from === undefined || mapping.to === undefined) {
				continue;
			}
			const sourceKey = signalIdentity(mapping.from);
			if (sources.has(sourceKey)) {
				return `Upgrade planner defines more than one target for ${mapping.from.name}.`;
			}
			sources.add(sourceKey);
		}
		return undefined;
	}, [mappingDrafts]);
	const error = plannerError ?? mappingRuleError;
	const effectiveRules = useMemo(
		() => (error === undefined ? completeRules(mappingDrafts, source) : []),
		[error, mappingDrafts, source],
	);
	const reverseRules = useMemo(() => effectiveRules.map(reverseUpgradeRule), [effectiveRules]);
	const ruleCounts = useMemo(() => {
		if (!plannerOpen || transformTarget === undefined || effectiveRules.length === 0) {
			return new Map<string, number>();
		}
		const forwardMatches = analyzeUpgradeRules(transformTarget, effectiveRules);
		const reverseMatches = analyzeUpgradeRules(transformTarget, reverseRules);
		const forwardCounts = new Map(
			forwardMatches.map((candidate) => [signalIdentity(candidate.from), candidate.count]),
		);
		const reverseCounts = new Map(
			reverseMatches.map((candidate) => [signalIdentity(candidate.to), candidate.count]),
		);
		return new Map(
			effectiveRules.map((rule) => {
				const sourceKey = signalIdentity(rule.from);
				return [sourceKey, (forwardCounts.get(sourceKey) ?? 0) + (reverseCounts.get(sourceKey) ?? 0)];
			}),
		);
	}, [effectiveRules, plannerOpen, reverseRules, transformTarget]);
	const mappings = useMemo<PositionedUpgradeMapping[]>(
		() =>
			mappingDrafts.map((mapping) => ({
				...mapping,
				count: mapping.from === undefined ? 0 : (ruleCounts.get(signalIdentity(mapping.from)) ?? 0),
			})),
		[mappingDrafts, ruleCounts],
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
	const sourceOptions = useMemo(() => upgradeSourceOptions(), []);
	const matchCount =
		[...ruleCounts.values()].reduce((total, count) => total + count, 0) +
		iconReplacementCount +
		(textReplacementEnabled ? metadataReplacementCount : 0);
	const draftChanged = plannerDraftChanged || applicationDraftChanged;

	const resetDraft = () => {
		const initialPlanner = blueprint?.upgrade_planner;
		setSource(initialPlanner === undefined ? 'suggested' : `book:${selectedPath}`);
		setSourceLabel(
			initialPlanner?.label ?? (initialPlanner === undefined ? 'Default Upgrade' : 'Current upgrade planner'),
		);
		setSelectedPlanner(initialPlanner);
		setPlannerInput('');
		setPlannerError(undefined);
		setMappingDrafts(mappingsFromPlanner(initialPlanner, initialPlanner === undefined));
		setScope(initialPlanner === undefined ? 'selection' : 'root');
		setIconReplacements([]);
		setTextReplacementEnabled(true);
		setMetadataFind('');
		setMetadataReplace('');
		setPlannerDraftChanged(false);
		setApplicationDraftChanged(false);
		setSavedLibraryRecord(undefined);
	};
	const plannerForLibrary = (label: string): UpgradePlanner => {
		if (rootBlueprint === undefined || error !== undefined) {
			throw new Error('Cannot save an invalid upgrade planner.');
		}
		const normalizedLabel = label.trim();
		if (normalizedLabel === '') {
			throw new Error('A library planner name is required.');
		}
		return plannerFromMappings(mappingDrafts, normalizedLabel, selectedPlanner);
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
		rules: effectiveRules,
		scope,
		textReplacementEnabled,
	});
	const applyDraftPlanner = (targetRoot: BlueprintString, direction: UpgradeDirection): BlueprintString =>
		applySession(draftApplication(), targetRoot, selectedPath, direction);

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
			error,
			mappings,
			onClearEndpoint: (mappingId: string, endpoint: 'from' | 'to') => {
				setPlannerDraftChanged(true);
				setMappingDrafts((current) =>
					current.flatMap((mapping) => {
						if (mapping.mappingId !== mappingId) {
							return [mapping];
						}
						if (endpoint === 'from') {
							return mapping.to === undefined ? [] : [{...mapping, from: undefined}];
						}
						return mapping.from === undefined ? [] : [{...mapping, to: undefined}];
					}),
				);
			},
			onMove: (mappingId: string, targetSlotIndex: number) => {
				setPlannerDraftChanged(true);
				setMappingDrafts((current) => {
					const moved = current.find((mapping) => mapping.mappingId === mappingId);
					if (moved === undefined) {
						throw new Error(`Upgrade mapping ${mappingId} is unavailable.`);
					}
					const displaced = current.find((mapping) => mapping.slotIndex === targetSlotIndex);
					return current.map((mapping) => {
						if (mapping.mappingId === mappingId) {
							return {...mapping, slotIndex: targetSlotIndex};
						}
						return displaced?.mappingId === mapping.mappingId
							? {...mapping, slotIndex: moved.slotIndex}
							: mapping;
					});
				});
			},
			onPlannerInputChange: (value: string) => {
				setPlannerDraftChanged(true);
				setPlannerInput(value);
				try {
					const planner = parseUpgradePlanner(value);
					setSelectedPlanner(planner);
					setMappingDrafts(mappingsFromPlanner(planner));
					setPlannerError(undefined);
				} catch (parseError) {
					setSelectedPlanner(undefined);
					setMappingDrafts([]);
					setPlannerError(parseError instanceof Error ? parseError.message : String(parseError));
				}
			},
			onPlannerLoad: (choice: UpgradePlannerChoice) => {
				setPlannerDraftChanged(true);
				setSavedLibraryRecord(undefined);
				setSource(choice.source);
				setSourceLabel(choice.label);
				setSelectedPlanner(choice.planner);
				setPlannerInput('');
				setMappingDrafts(mappingsFromPlanner(choice.planner, choice.source === 'suggested'));
				setPlannerError(choice.source === 'pasted' ? 'Paste an upgrade planner string or JSON.' : undefined);
			},
			onSourceChange: (mappingId: string | undefined, slotIndex: number, nextSource: UpgradeSourceSignal) => {
				setPlannerDraftChanged(true);
				setMappingDrafts((current) => {
					if (mappingId === undefined) {
						nextMappingIdentity.current += 1;
						return [
							...current,
							{
								from: {...nextSource},
								mappingId: `upgrade-mapping-${nextMappingIdentity.current.toString()}`,
								preserveQuality: false,
								slotIndex,
							},
						];
					}
					return current.map((mapping) => {
						if (mapping.mappingId !== mappingId) {
							return mapping;
						}
						const nextMapping = {...mapping, from: {...nextSource}, preserveQuality: false};
						if (
							nextMapping.to !== undefined &&
							!isUpgradeTargetSelectionAllowed(nextSource, nextMapping.to)
						) {
							delete nextMapping.to;
						}
						return nextMapping;
					});
				});
			},
			onTargetChange: (mappingId: string | undefined, slotIndex: number, nextTarget: SignalID) => {
				setPlannerDraftChanged(true);
				setMappingDrafts((current) => {
					if (mappingId === undefined) {
						nextMappingIdentity.current += 1;
						return [
							...current,
							{
								mappingId: `upgrade-mapping-${nextMappingIdentity.current.toString()}`,
								preserveQuality: false,
								slotIndex,
								to: {...nextTarget},
							},
						];
					}
					return current.map((mapping) =>
						mapping.mappingId === mappingId
							? {...mapping, preserveQuality: false, to: {...nextTarget}}
							: mapping,
					);
				});
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
			setPlannerError(undefined);
			setMappingDrafts(mappingsFromPlanner(planner));
			setPlannerDraftChanged(false);
			setSavedLibraryRecord(record);
		},
		saveDisabled: rootBlueprint === undefined || error !== undefined,
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
