import {useId, useState} from 'react';

import type {UpgradeDirection} from '../../../../transform/upgradePlanner';
import {FactorioIcon} from '../../../core/icons/FactorioIcon';
import {FactorioButton, FactorioInventorySlot, FactorioTooltip, FactorioTooltipPlacement} from '../../../ui/FactorioUi';
import type {UpgradePlannerChoice} from './UpgradePlannerSelectorItem';

export interface PlacedUpgradePlanner {
	choice: UpgradePlannerChoice;
}

const upgradeBlueprintTooltip = 'Upgrade items and entities in the blueprint.';

interface BlueprintEditorToolbarProps {
	dropError: string | undefined;
	onApplyPlacedPlanner: (direction: UpgradeDirection) => void;
	onClearPlacedPlanner: () => void;
	onDropPlanner: (serializedPlanner: string) => void;
	onOpenParameterization: () => void;
	onOpenUpgradePlannerSelector: () => void;
	parameterizationAvailable: boolean;
	parameterizationDialogId: string;
	parameterizationOpen: boolean;
	placedPlanner: PlacedUpgradePlanner | undefined;
	selectorDialogId: string;
	selectorOpen: boolean;
}

/**
 * Launcher contract from Factorio 2.1.12 BlueprintSettingsGui:
 *
 * - The Upgrade Planner control is a launcher when empty. Choosing from the
 *   selector applies immediately in the chosen direction. Dropping a planner
 *   creates a website cursor proxy; the green control applies upgrade on
 *   primary activation and downgrade on secondary activation.
 * - Parametrisation opens the BE-5 local child editor for blueprints. The child
 *   confirms back into the editor draft; it does not save the loaded root.
 * - The source subheader order is label, reassign, copy, upgrade, parametrise,
 *   export, then delete. Unsupported game actions are omitted instead of
 *   rendered as inert lookalikes. The website-only held-planner proxy follows
 *   the game-action group behind a visible separator. Its secondary activation
 *   and Delete/Backspace equivalent clear the held planner.
 *
 * `UpgradePlannerSelectorDialog`, `UpgradePlannerSelectorItem`, and
 * `BlueprintParameterizationDialog` implement the launcher children.
 */
export function BlueprintEditorToolbar({
	dropError,
	onApplyPlacedPlanner,
	onClearPlacedPlanner,
	onDropPlanner,
	onOpenParameterization,
	onOpenUpgradePlannerSelector,
	parameterizationAvailable,
	parameterizationDialogId,
	parameterizationOpen,
	placedPlanner,
	selectorDialogId,
	selectorOpen,
}: BlueprintEditorToolbarProps) {
	const tooltipId = useId();
	const parameterizationTooltipId = useId();
	const dropErrorId = useId();
	const heldPlannerTooltipId = useId();
	const [plannerDropReady, setPlannerDropReady] = useState(false);
	const selectedPlannerLabel = placedPlanner?.choice.label;
	const placedUpgradeBlueprintTooltip =
		selectedPlannerLabel === undefined
			? upgradeBlueprintTooltip
			: `Use ${selectedPlannerLabel}. Left-click to upgrade; right-click or press Shift+Enter to downgrade.`;
	const heldPlannerTooltip =
		selectedPlannerLabel === undefined
			? 'Choose or drop an upgrade planner to hold for the Upgrade button.'
			: `${selectedPlannerLabel} is held for the Upgrade button. Left-click to replace it. Right-click or press Delete to clear it.`;
	const activateUpgradePlanner = (direction: UpgradeDirection) => {
		if (placedPlanner === undefined) {
			onOpenUpgradePlannerSelector();
		} else {
			onApplyPlacedPlanner(direction);
		}
	};

	return (
		<div
			className="blueprint-editor-toolbar"
			role="toolbar"
			aria-label="Blueprint editor actions"
			data-factorio-source="BlueprintSettingsGui::subheader"
			data-factorio-action-order="title,reassign,copy,upgrade,parametrise,export,delete"
		>
			<div
				className="blueprint-editor-toolbar__game-actions"
				role="group"
				aria-label="Factorio blueprint actions"
			>
				<div
					className="factorio-toolbar-control"
					data-factorio-action="upgrade"
					data-factorio-action-order="3"
					data-factorio-mouse-buttons="left,right"
					data-factorio-source="BlueprintSettingsGui::makeUpgradeButton"
				>
					<FactorioButton
						className="blueprint-editor-toolbar__button blueprint-editor-toolbar__button--upgrade"
						aria-label="Upgrade items and entities in the blueprint"
						aria-describedby={tooltipId}
						aria-keyshortcuts="Shift+Enter"
						aria-controls={selectedPlannerLabel === undefined ? selectorDialogId : undefined}
						aria-expanded={selectedPlannerLabel === undefined ? selectorOpen : undefined}
						aria-haspopup={selectedPlannerLabel === undefined ? 'dialog' : undefined}
						data-factorio-widget-style="tool_button_green"
						data-factorio-source="PlayerInputSource::processClickOnUpgradeSlot"
						title={placedUpgradeBlueprintTooltip}
						onClick={() => {
							activateUpgradePlanner('upgrade');
						}}
						onContextMenu={(event) => {
							event.preventDefault();
							activateUpgradePlanner('downgrade');
						}}
						onKeyDown={(event) => {
							if (event.key === 'Enter' && event.shiftKey) {
								event.preventDefault();
								activateUpgradePlanner('downgrade');
							}
						}}
					>
						<FactorioIcon decorative icon={{type: 'item', name: 'upgrade-planner'}} size="small" />
					</FactorioButton>
					<FactorioTooltip
						id={tooltipId}
						className="factorio-toolbar-tooltip"
						placement={FactorioTooltipPlacement.Below}
					>
						{placedUpgradeBlueprintTooltip}
					</FactorioTooltip>
				</div>
				{parameterizationAvailable ? (
					<div
						className="factorio-toolbar-control"
						data-factorio-action="parametrise"
						data-factorio-action-order="4"
						data-factorio-source="BlueprintSettingsGui::makeParametriseSlot"
					>
						<FactorioButton
							className="blueprint-editor-toolbar__button blueprint-editor-toolbar__button--parameterization"
							aria-label="Parametrise or reconfigure the blueprint"
							aria-controls={parameterizationDialogId}
							aria-describedby={parameterizationTooltipId}
							aria-expanded={parameterizationOpen}
							aria-haspopup="dialog"
							title="Parametrise or reconfigure the blueprint"
							onClick={() => {
								onOpenParameterization();
							}}
						>
							<FactorioIcon
								decorative
								icon={{type: 'virtual-signal', name: 'signal-item-parameter'}}
								size="large"
							/>
						</FactorioButton>
						<FactorioTooltip
							id={parameterizationTooltipId}
							className="factorio-toolbar-tooltip"
							placement={FactorioTooltipPlacement.Below}
						>
							Parametrise/reconfigure the blueprint.
						</FactorioTooltip>
					</div>
				) : null}
			</div>
			<div
				className="blueprint-editor-toolbar__website-actions"
				role="group"
				aria-label="Website planner slot"
				data-website-extension="dropped-upgrade-planner-slot"
			>
				<FactorioInventorySlot
					className="blueprint-editor-toolbar__planner-slot"
					aria-label={
						selectedPlannerLabel === undefined
							? 'Choose or drop an upgrade planner to hold'
							: `Held upgrade planner ${selectedPlannerLabel}; click to replace`
					}
					aria-controls={selectorDialogId}
					aria-describedby={
						dropError === undefined ? heldPlannerTooltipId : `${heldPlannerTooltipId} ${dropErrorId}`
					}
					aria-expanded={selectorOpen}
					aria-haspopup="dialog"
					aria-keyshortcuts={selectedPlannerLabel === undefined ? undefined : 'Delete Backspace'}
					selected={placedPlanner !== undefined}
					data-drop-state={plannerDropReady ? 'ready' : 'idle'}
					data-planner-state={selectedPlannerLabel === undefined ? 'empty' : 'held'}
					data-factorio-source="PlayerInputSource::processClickOnUpgradeSlot"
					title={heldPlannerTooltip}
					onClick={() => {
						onOpenUpgradePlannerSelector();
					}}
					onContextMenu={(event) => {
						if (placedPlanner === undefined) {
							return;
						}
						event.preventDefault();
						onClearPlacedPlanner();
					}}
					onDragEnter={(event) => {
						if (event.dataTransfer.types.includes('text/plain')) {
							event.preventDefault();
							setPlannerDropReady(true);
						}
					}}
					onDragLeave={(event) => {
						if (
							!(event.relatedTarget instanceof Node) ||
							!event.currentTarget.contains(event.relatedTarget)
						) {
							setPlannerDropReady(false);
						}
					}}
					onDragOver={(event) => {
						if (event.dataTransfer.types.includes('text/plain')) {
							event.preventDefault();
							event.dataTransfer.dropEffect = 'copy';
							setPlannerDropReady(true);
						}
					}}
					onDrop={(event) => {
						event.preventDefault();
						setPlannerDropReady(false);
						onDropPlanner(event.dataTransfer.getData('text/plain'));
					}}
					onKeyDown={(event) => {
						if (placedPlanner !== undefined && (event.key === 'Delete' || event.key === 'Backspace')) {
							event.preventDefault();
							onClearPlacedPlanner();
						}
					}}
				>
					{placedPlanner === undefined ? (
						<span className="blueprint-editor-toolbar__planner-empty" aria-hidden="true">
							+
						</span>
					) : (
						<FactorioIcon decorative icon={{type: 'item', name: 'upgrade-planner'}} size="large" />
					)}
				</FactorioInventorySlot>
				<span id={heldPlannerTooltipId} className="transform-visually-hidden">
					{heldPlannerTooltip}
				</span>
				<p
					id={dropErrorId}
					className="blueprint-editor-toolbar__drop-error"
					role={dropError === undefined ? undefined : 'alert'}
				>
					{dropError}
				</p>
			</div>
		</div>
	);
}
