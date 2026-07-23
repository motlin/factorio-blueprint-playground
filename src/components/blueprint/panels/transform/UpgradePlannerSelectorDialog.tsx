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

function serializedPlanner(planner: UpgradePlanner): string {
	const normalizedPlanner = parseUpgradePlanner(JSON.stringify({upgrade_planner: planner}));
	return serializeBlueprint({upgrade_planner: normalizedPlanner});
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
		const planner = parseUpgradePlanner(blueprint.metadata.data);
		const serialized = serializedPlanner(planner);
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
