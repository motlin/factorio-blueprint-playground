import {useLiveQuery} from 'dexie-react-hooks';
import {useEffect, useId, useMemo, useRef, useState} from 'react';

import {serializeBlueprint} from '../../../../parsing/blueprintParser';
import type {BlueprintString, UpgradePlanner} from '../../../../parsing/types';
import {findUpgradePlanners, parseUpgradePlanner, type UpgradeDirection} from '../../../../transform/upgradePlanner';
import {db, type DatabaseBlueprint} from '../../../../storage/db';
import {FactorioIcon} from '../../../core/icons/FactorioIcon';

export interface UpgradePlannerChoice {
	label: string;
	planner?: UpgradePlanner;
	source: string;
}

interface UpgradePlannerSelectorDialogProps {
	dialogId: string;
	includeEditingChoices: boolean;
	onChoose: (choice: UpgradePlannerChoice, direction: UpgradeDirection) => void;
	onClose: () => void;
	rootBlueprint: BlueprintString;
	selectedSource: string;
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
): UpgradePlannerChoice[] {
	const choices: UpgradePlannerChoice[] = [{label: 'Default Upgrade', source: 'suggested'}];
	const serializedPlanners = new Set<string>();

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
}: UpgradePlannerSelectorDialogProps) {
	const headingId = useId();
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
		() => createUpgradePlannerChoices(rootBlueprint, historyBlueprints, includeEditingChoices),
		[rootBlueprint, historyBlueprints, includeEditingChoices],
	);
	const [activeIndex, setActiveIndex] = useState(() =>
		Math.max(
			0,
			choices.findIndex((choice) => choice.source === selectedSource),
		),
	);

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

	return (
		<div className="transform-dialog-backdrop upgrade-planner-selector__backdrop">
			<section
				id={dialogId}
				className="transform-dialog upgrade-planner-selector"
				role="dialog"
				aria-modal="true"
				aria-labelledby={headingId}
				onKeyDown={(event) => {
					if (event.key === 'Escape') {
						event.stopPropagation();
						onClose();
					}
				}}
			>
				<header className="transform-dialog__header upgrade-planner-selector__header">
					<h3 id={headingId}>Select the upgrade planner to apply</h3>
					<button
						type="button"
						className="transform-dialog__close"
						aria-label="Close upgrade planner selector"
						onClick={onClose}
					>
						×
					</button>
				</header>
				<p className="upgrade-planner-selector__hint">
					<span>Click</span> to apply as upgrade. <span>Right-click</span> to apply as downgrade.
				</p>
				<div className="upgrade-planner-selector__grid" role="grid" aria-label="Upgrade planners">
					{choices.map((choice, index) => (
						<button
							key={choice.source}
							ref={(button) => {
								buttonReferences.current[index] = button;
							}}
							type="button"
							className="upgrade-planner-selector__tile"
							aria-label={choice.label}
							aria-pressed={choice.source === selectedSource}
							tabIndex={index === activeIndex ? 0 : -1}
							title={choice.label}
							onClick={() => {
								onChoose(choice, 'upgrade');
							}}
							onContextMenu={(event) => {
								event.preventDefault();
								onChoose(choice, 'downgrade');
							}}
							onFocus={() => {
								setActiveIndex(index);
							}}
							onKeyDown={(event) => {
								if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
									event.preventDefault();
									moveFocus(index + 1);
								} else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
									event.preventDefault();
									moveFocus(index - 1);
								} else if (event.key === 'Home') {
									event.preventDefault();
									moveFocus(0);
								} else if (event.key === 'End') {
									event.preventDefault();
									moveFocus(choices.length - 1);
								}
							}}
						>
							<span className="upgrade-planner-selector__icon" aria-hidden="true">
								<FactorioIcon icon={{type: 'item', name: 'upgrade-planner'}} size="large" />
							</span>
							<span>{choice.label}</span>
						</button>
					))}
				</div>
			</section>
		</div>
	);
}
