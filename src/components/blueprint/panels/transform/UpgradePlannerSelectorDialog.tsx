import {useLiveQuery} from 'dexie-react-hooks';
import {useEffect, useId, useMemo, useRef, useState} from 'react';
import {createPortal} from 'react-dom';

import {serializeBlueprint} from '../../../../parsing/blueprintParser';
import type {BlueprintString, UpgradePlanner} from '../../../../parsing/types';
import {findUpgradePlanners, parseUpgradePlanner, type UpgradeDirection} from '../../../../transform/upgradePlanner';
import {db, type DatabaseBlueprint} from '../../../../storage/db';
import {useDialogFocus} from './useDialogFocus';
import {UpgradePlannerSelectorItem, type UpgradePlannerChoice} from './UpgradePlannerSelectorItem';

export type {UpgradePlannerChoice} from './UpgradePlannerSelectorItem';

interface UpgradePlannerSelectorDialogProps {
	dialogId: string;
	includeEditingChoices: boolean;
	onChoose: (choice: UpgradePlannerChoice, direction: UpgradeDirection) => void;
	onClose: () => void;
	rootBlueprint: BlueprintString;
	selectedSource: string;
	sessionChoice?: UpgradePlannerChoice;
}

const serializedPlannerCache = new WeakMap<UpgradePlanner, string>();
const historyPlannerCache = new WeakMap<DatabaseBlueprint, {planner: UpgradePlanner; serialized: string}>();

function serializedPlanner(planner: UpgradePlanner): string {
	const cachedPlanner = serializedPlannerCache.get(planner);
	if (cachedPlanner !== undefined) {
		return cachedPlanner;
	}
	const normalizedPlanner = parseUpgradePlanner(JSON.stringify({upgrade_planner: planner}));
	const serialized = serializeBlueprint({upgrade_planner: normalizedPlanner});
	serializedPlannerCache.set(planner, serialized);
	return serialized;
}

function historyPlanner(blueprint: DatabaseBlueprint) {
	const cachedPlanner = historyPlannerCache.get(blueprint);
	if (cachedPlanner !== undefined) {
		return cachedPlanner;
	}
	const planner = parseUpgradePlanner(blueprint.metadata.data);
	const parsedPlanner = {planner, serialized: serializedPlanner(planner)};
	historyPlannerCache.set(blueprint, parsedPlanner);
	return parsedPlanner;
}

function historyPlannerLabel(blueprint: DatabaseBlueprint, planner: UpgradePlanner): string {
	return planner.label ?? blueprint.gameData.label ?? planner.settings.description ?? 'Recent upgrade planner';
}

function createUpgradePlannerChoices(
	rootBlueprint: BlueprintString,
	historyBlueprints: readonly DatabaseBlueprint[],
	includeEditingChoices: boolean,
	sessionChoice: UpgradePlannerChoice | undefined,
): UpgradePlannerChoice[] {
	const choices: UpgradePlannerChoice[] = [{label: 'Default Upgrade', source: 'suggested'}];
	const serializedPlanners = new Set<string>();

	if (sessionChoice !== undefined) {
		choices.push(sessionChoice);
	}

	for (const source of findUpgradePlanners(rootBlueprint)) {
		const serialized = serializedPlanner(source.planner);
		if (!serializedPlanners.has(serialized)) {
			serializedPlanners.add(serialized);
			choices.push({label: source.label, planner: source.planner, source: `book:${source.path}`});
		}
	}

	for (const blueprint of historyBlueprints) {
		const {planner, serialized} = historyPlanner(blueprint);
		if (!serializedPlanners.has(serialized)) {
			serializedPlanners.add(serialized);
			choices.push({
				label: historyPlannerLabel(blueprint, planner),
				planner,
				source: `history:${blueprint.metadata.sha}`,
			});
		}
	}

	if (includeEditingChoices) {
		choices.push({label: 'Empty planner', source: 'custom'}, {label: 'Paste upgrade planner…', source: 'pasted'});
	}

	return choices;
}

/**
 * Factorio 2.1.12 `SelectUpgradePlannerGui` source contract:
 *
 * - The application selector presents, in order, Default Upgrade (only for an
 *   empty search), every Upgrade record found recursively across library shelves
 *   and books, then every Upgrade Planner item found recursively in controller
 *   inventories. Search matches the stored label or description for both record
 *   and inventory sources.
 * - Browser book planners (`book:*`) and IndexedDB planners (`history:*`) are the
 *   nested and shelf-root records of one private library. A session/dropped
 *   planner is the inventory-like transient source. `Default Upgrade` is the
 *   built-in no-record choice. URL provenance must not define whether an
 *   otherwise saved planner belongs to the library.
 * - Equal serialized contents do not make two records the same: shelf/book
 *   location is record identity. The current content-based de-duplication and
 *   absence of search/view controls are transitional projections.
 * - Application mode is BE-3: choosing Default Upgrade, a library planner, or an
 *   inventory planner dispatches upgrade/downgrade immediately and closes. It is
 *   not a save-confirmation dialog and must never make a saved planner wait for a
 *   second confirmation.
 * - Editing mode is a browser-specific "copy into draft" chooser. Empty/Paste
 *   choices and non-directional activation belong only to that separate mode;
 *   they are not sources or semantics of `SelectUpgradePlannerGui`.
 *
 * `BlueprintsList` supplies the same List/Grid/Slots preference as the library.
 * `UpgradePlannerSelectorItem` owns the directional click contract.
 */
export function UpgradePlannerSelectorDialog({
	dialogId,
	includeEditingChoices,
	onChoose,
	onClose,
	rootBlueprint,
	selectedSource,
	sessionChoice,
}: UpgradePlannerSelectorDialogProps) {
	const headingId = useId();
	const instructionsId = useId();
	const buttonReferences = useRef<Array<HTMLButtonElement | null>>([]);
	const historyBlueprints = useLiveQuery(
		async () =>
			await db.blueprints
				.orderBy('metadata.lastUpdatedOn')
				.reverse()
				.filter(
					(blueprint) =>
						blueprint.gameData.type === 'upgrade_planner' && blueprint.metadata.fetchMethod !== 'url',
				)
				.toArray(),
		[],
		[],
	);
	const choices = useMemo(
		() => createUpgradePlannerChoices(rootBlueprint, historyBlueprints, includeEditingChoices, sessionChoice),
		[rootBlueprint, historyBlueprints, includeEditingChoices, sessionChoice],
	);
	const [activeIndex, setActiveIndex] = useState(() =>
		Math.max(
			0,
			choices.findIndex((choice) => choice.source === selectedSource),
		),
	);
	const dialogReference = useDialogFocus<HTMLElement>({
		initialFocusSelector: '.upgrade-planner-selector__tile[tabindex="0"]',
		onClose,
	});

	useEffect(() => {
		setActiveIndex(
			Math.max(
				0,
				choices.findIndex((choice) => choice.source === selectedSource),
			),
		);
	}, [choices, selectedSource]);

	useEffect(() => {
		buttonReferences.current[activeIndex]?.focus();
	}, [activeIndex]);

	const moveFocus = (nextIndex: number) => {
		const wrappedIndex = (nextIndex + choices.length) % choices.length;
		setActiveIndex(wrappedIndex);
	};

	return createPortal(
		<div className="transform-dialog-backdrop upgrade-planner-selector__backdrop">
			<section
				ref={dialogReference}
				id={dialogId}
				className="transform-dialog upgrade-planner-selector"
				role="dialog"
				aria-modal="true"
				aria-labelledby={headingId}
			>
				<header className="transform-dialog__header upgrade-planner-selector__header">
					<h3 id={headingId}>
						{includeEditingChoices ? 'Load an upgrade planner' : 'Select the upgrade planner to apply'}
					</h3>
					<button
						type="button"
						className="transform-dialog__close"
						aria-label="Close upgrade planner selector"
						title="Close upgrade planner selector"
						onClick={onClose}
					>
						×
					</button>
				</header>
				<p id={instructionsId} className="upgrade-planner-selector__hint">
					{includeEditingChoices ? (
						<>Choose a planner to copy all of its mappings into the editable draft.</>
					) : (
						<>
							<span>Left-click</span> to apply as upgrade. <span>Right-click</span> to apply as downgrade.
							Enter applies as upgrade; Shift+Enter applies as downgrade.
						</>
					)}
				</p>
				<div className="upgrade-planner-selector__grid" role="grid" aria-label="Upgrade planners">
					{choices.map((choice, index) => (
						<UpgradePlannerSelectorItem
							key={choice.source}
							active={index === activeIndex}
							buttonRef={(button) => {
								buttonReferences.current[index] = button;
							}}
							choice={choice}
							choiceCount={choices.length}
							directional={!includeEditingChoices}
							index={index}
							instructionsId={instructionsId}
							onApply={(direction) => {
								onChoose(choice, direction);
							}}
							onFocus={() => {
								setActiveIndex(index);
							}}
							onMoveFocus={moveFocus}
							selected={choice.source === selectedSource}
						/>
					))}
				</div>
			</section>
		</div>,
		document.body,
	);
}
