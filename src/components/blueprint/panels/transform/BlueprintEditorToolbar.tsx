import {useId} from 'react';

import type {UpgradeDirection} from '../../../../transform/upgradePlanner';
import {FactorioIcon} from '../../../core/icons/FactorioIcon';
import {
	FactorioButton,
	FactorioButtonKind,
	FactorioInventorySlot,
	FactorioTooltip,
	FactorioTooltipPlacement,
} from '../../../ui/FactorioUi';
import type {UpgradePlannerChoice} from './UpgradePlannerSelectorItem';

export interface PlacedUpgradePlanner {
	choice: UpgradePlannerChoice;
	direction: UpgradeDirection;
}

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
 *   fills its tool slot; primary activation applies upgrade direction and
 *   secondary activation applies downgrade direction.
 * - Parametrisation opens the BE-5 local child editor for blueprints. The child
 *   confirms back into the editor draft; it does not save the loaded root.
 * - The source subheader order is label, reassign, copy, upgrade, parametrise,
 *   export, then delete. Unsupported game actions are omitted instead of
 *   rendered as inert lookalikes. The website-only dropped-planner slot follows
 *   the game-action group behind a visible separator.
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
	const selectedPlannerLabel = placedPlanner?.choice.label;

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
					data-factorio-source="BlueprintSettingsGui::makeUpgradeButton"
				>
					<FactorioButton
						className="blueprint-editor-toolbar__button blueprint-editor-toolbar__button--upgrade"
						aria-label={
							placedPlanner === undefined
								? 'Upgrade items and entities in the blueprint'
								: `Apply ${selectedPlannerLabel} as ${placedPlanner.direction}`
						}
						aria-describedby={tooltipId}
						aria-keyshortcuts={placedPlanner === undefined ? undefined : 'Shift+Enter'}
						aria-controls={selectedPlannerLabel === undefined ? selectorDialogId : undefined}
						aria-expanded={selectedPlannerLabel === undefined ? selectorOpen : undefined}
						aria-haspopup={selectedPlannerLabel === undefined ? 'dialog' : undefined}
						title={
							placedPlanner === undefined
								? 'Upgrade items and entities in the blueprint'
								: `Apply ${selectedPlannerLabel} as ${placedPlanner.direction}`
						}
						onClick={() => {
							if (placedPlanner === undefined) {
								onOpenUpgradePlannerSelector();
							} else {
								onApplyPlacedPlanner(placedPlanner.direction);
							}
						}}
						onContextMenu={(event) => {
							if (placedPlanner !== undefined) {
								event.preventDefault();
								onApplyPlacedPlanner(placedPlanner.direction === 'upgrade' ? 'downgrade' : 'upgrade');
							}
						}}
						onKeyDown={(event) => {
							if (placedPlanner !== undefined && event.key === 'Enter' && event.shiftKey) {
								event.preventDefault();
								onApplyPlacedPlanner(placedPlanner.direction === 'upgrade' ? 'downgrade' : 'upgrade');
							}
						}}
					>
						<FactorioIcon decorative icon={{type: 'item', name: 'upgrade-planner'}} size="large" />
					</FactorioButton>
					<FactorioTooltip
						id={tooltipId}
						className="factorio-toolbar-tooltip"
						placement={FactorioTooltipPlacement.Below}
					>
						{placedPlanner === undefined
							? 'Upgrade items and entities in the blueprint.'
							: `Apply ${selectedPlannerLabel}. Shift+Enter or right-click applies the opposite direction.`}
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
							? 'Choose upgrade planner for toolbar slot'
							: `Change placed upgrade planner, currently ${selectedPlannerLabel}`
					}
					aria-controls={selectorDialogId}
					aria-describedby={dropError === undefined ? undefined : dropErrorId}
					aria-expanded={selectorOpen}
					aria-haspopup="dialog"
					title={
						selectedPlannerLabel === undefined
							? 'Choose upgrade planner for toolbar slot'
							: `Change placed upgrade planner, currently ${selectedPlannerLabel}`
					}
					onClick={onOpenUpgradePlannerSelector}
					onDragOver={(event) => {
						if (event.dataTransfer.types.includes('text/plain')) {
							event.preventDefault();
							event.dataTransfer.dropEffect = 'copy';
						}
					}}
					onDrop={(event) => {
						event.preventDefault();
						onDropPlanner(event.dataTransfer.getData('text/plain'));
					}}
				>
					{placedPlanner === undefined ? (
						<span aria-hidden="true">+</span>
					) : (
						<>
							<FactorioIcon decorative icon={{type: 'item', name: 'upgrade-planner'}} size="small" />
							<span className="blueprint-editor-toolbar__planner-direction" aria-hidden="true">
								{placedPlanner.direction === 'upgrade' ? '↑' : '↓'}
							</span>
						</>
					)}
				</FactorioInventorySlot>
				{placedPlanner === undefined ? null : (
					<FactorioButton
						kind={FactorioButtonKind.Delete}
						className="blueprint-editor-toolbar__planner-clear"
						aria-label={`Remove ${selectedPlannerLabel} from toolbar slot`}
						title={`Remove ${selectedPlannerLabel} from toolbar slot`}
						onClick={onClearPlacedPlanner}
					/>
				)}
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
