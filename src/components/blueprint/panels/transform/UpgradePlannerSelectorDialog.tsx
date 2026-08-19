import {useLiveQuery} from 'dexie-react-hooks';
import {useEffect, useId, useMemo, useRef, useState} from 'react';
import {createPortal} from 'react-dom';

import {serializeBlueprint} from '../../../../parsing/blueprintParser';
import type {BlueprintString, UpgradePlanner} from '../../../../parsing/types';
import {findUpgradePlanners, parseUpgradePlanner, type UpgradeDirection} from '../../../../transform/upgradePlanner';
import {db, type LibraryRecord} from '../../../../storage/db';
import {BlueprintRecordViews} from '../../../library/BlueprintRecordViews';
import type {BlueprintRecordModel} from '../../../library/blueprintRecordModel';
import {FactorioButton, FactorioButtonKind} from '../../../ui/FactorioUi';
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
const libraryPlannerCache = new WeakMap<LibraryRecord, UpgradePlanner>();

interface UpgradePlannerSelectorRecord extends BlueprintRecordModel {
	choice: UpgradePlannerChoice;
}

const DEFAULT_UPGRADE_CHOICE: UpgradePlannerChoice = {
	label: 'Default Upgrade',
	source: 'suggested',
};
const DEFAULT_UPGRADE_RECORD: UpgradePlannerSelectorRecord = {
	id: DEFAULT_UPGRADE_CHOICE.source,
	choice: DEFAULT_UPGRADE_CHOICE,
	gameData: {
		type: 'upgrade_planner',
		label: DEFAULT_UPGRADE_CHOICE.label,
		description: "Applies Factorio's automatic upgrade relationships.",
		icons: [],
	},
};
const DEFAULT_UPGRADE_RECORDS = [DEFAULT_UPGRADE_RECORD];

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

function libraryPlanner(record: LibraryRecord): UpgradePlanner {
	const cachedPlanner = libraryPlannerCache.get(record);
	if (cachedPlanner !== undefined) {
		return cachedPlanner;
	}
	const planner = parseUpgradePlanner(record.data);
	libraryPlannerCache.set(record, planner);
	return planner;
}

function libraryPlannerLabel(record: LibraryRecord, planner: UpgradePlanner): string {
	return record.gameData.label ?? planner.label ?? 'Untitled upgrade planner';
}

function plannerIcons(planner: UpgradePlanner) {
	return [...(planner.settings.icons ?? [])]
		.sort((left, right) => left.index - right.index)
		.map((icon) => icon.signal);
}

function applicationPlannerRecords(
	libraryRecords: readonly LibraryRecord[],
	sessionChoice: UpgradePlannerChoice | undefined,
): UpgradePlannerSelectorRecord[] {
	const records = libraryRecords.map<UpgradePlannerSelectorRecord>((record) => {
		const planner = libraryPlanner(record);
		const choice: UpgradePlannerChoice = {
			label: libraryPlannerLabel(record, planner),
			planner,
			source: `library:${record.id}`,
		};
		return {
			id: choice.source,
			choice,
			gameData: {
				...record.gameData,
				label: choice.label,
				description: record.gameData.description ?? planner.settings.description,
				icons: record.gameData.icons.length === 0 ? plannerIcons(planner) : record.gameData.icons,
			},
		};
	});

	if (sessionChoice !== undefined && !records.some((record) => record.choice.source === sessionChoice.source)) {
		records.push({
			id: sessionChoice.source,
			choice: sessionChoice,
			gameData: {
				type: 'upgrade_planner',
				label: sessionChoice.label,
				description: sessionChoice.planner?.settings.description,
				icons: sessionChoice.planner === undefined ? [] : plannerIcons(sessionChoice.planner),
			},
		});
	}

	return records;
}

function createUpgradePlannerChoices(
	rootBlueprint: BlueprintString,
	libraryRecords: readonly LibraryRecord[],
	includeEditingChoices: boolean,
	sessionChoice: UpgradePlannerChoice | undefined,
): UpgradePlannerChoice[] {
	const choices: UpgradePlannerChoice[] = [DEFAULT_UPGRADE_CHOICE];
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

	for (const record of libraryRecords) {
		if (sessionChoice?.source === `library:${record.id}`) {
			continue;
		}
		const planner = libraryPlanner(record);
		choices.push({
			label: libraryPlannerLabel(record, planner),
			libraryRecord: record,
			planner,
			source: `library:${record.id}`,
		});
	}

	if (includeEditingChoices) {
		choices.push({label: 'Empty Planner', source: 'custom'}, {label: 'Paste upgrade planner…', source: 'pasted'});
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
 * - Browser book planners (`book:*`) and IndexedDB planners (`library:*`) are the
 *   nested and shelf-root records of one private library. A session/dropped
 *   planner is the inventory-like transient source. `Default Upgrade` is the
 *   built-in no-record choice. URL provenance must not define whether an
 *   otherwise saved planner belongs to the library.
 * - Equal serialized contents do not make two records the same: shelf/book
 *   location is record identity.
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
	const libraryRecords = useLiveQuery(
		async () => (await db.listLibraryTree()).filter((record) => record.gameData.type === 'upgrade_planner'),
		[],
		[],
	);
	const choices = useMemo(
		() =>
			includeEditingChoices
				? createUpgradePlannerChoices(rootBlueprint, libraryRecords, includeEditingChoices, sessionChoice)
				: [],
		[rootBlueprint, libraryRecords, includeEditingChoices, sessionChoice],
	);
	const applicationRecords = useMemo(
		() => applicationPlannerRecords(libraryRecords, sessionChoice),
		[libraryRecords, sessionChoice],
	);
	const [activeIndex, setActiveIndex] = useState(() =>
		Math.max(
			0,
			choices.findIndex((choice) => choice.source === selectedSource),
		),
	);
	const dialogReference = useDialogFocus<HTMLElement>({
		initialFocusSelector: includeEditingChoices
			? '.upgrade-planner-selector__tile[tabindex="0"]'
			: '.blueprint-record-item[tabindex="0"]',
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
				className="factorio-frame factorio-frame--shallow transform-dialog upgrade-planner-selector"
				role="dialog"
				aria-modal="true"
				aria-labelledby={headingId}
				aria-describedby={instructionsId}
			>
				<header className="factorio-title-bar transform-dialog__header upgrade-planner-selector__header">
					<h3 id={headingId}>
						{includeEditingChoices ? 'Load an upgrade planner' : 'Select the upgrade planner to apply'}
					</h3>
					<FactorioButton
						kind={FactorioButtonKind.Close}
						className="transform-dialog__close"
						aria-label="Close upgrade planner selector"
						title="Close upgrade planner selector"
						onClick={() => {
							onClose();
						}}
					/>
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
				{includeEditingChoices ? (
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
								index={index}
								instructionsId={instructionsId}
								onChoose={() => {
									onChoose(choice, 'upgrade');
								}}
								onFocus={() => {
									setActiveIndex(index);
								}}
								onMoveFocus={moveFocus}
								selected={choice.source === selectedSource}
							/>
						))}
					</div>
				) : (
					<div className="upgrade-planner-selector__records">
						<BlueprintRecordViews
							aria-label="Upgrade planners"
							initialActiveRecordId={selectedSource}
							onActivate={(record) => {
								onChoose(record.choice, 'upgrade');
								onClose();
							}}
							onAlternateActivate={(record) => {
								onChoose(record.choice, 'downgrade');
								onClose();
							}}
							records={applicationRecords}
							recordsWhenSearchEmpty={DEFAULT_UPGRADE_RECORDS}
							recordInstructionsId={instructionsId}
							searchLabel="Search upgrade planners"
							searchResultNoun="upgrade planners"
						/>
					</div>
				)}
			</section>
		</div>,
		document.body,
	);
}
