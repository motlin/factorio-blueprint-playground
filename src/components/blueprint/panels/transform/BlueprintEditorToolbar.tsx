import {useId} from 'react';

import type {UpgradeDirection} from '../../../../transform/upgradePlanner';
import {FactorioIcon} from '../../../core/icons/FactorioIcon';
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
		<div className="blueprint-editor-toolbar" role="toolbar" aria-label="Blueprint editor actions">
			<div className="factorio-toolbar-control">
				<div className="blueprint-editor-toolbar__upgrade">
					<button
						type="button"
						className="factorio-toolbar-button blueprint-editor-toolbar__button blueprint-editor-toolbar__button--upgrade"
						aria-label={
							placedPlanner === undefined
								? 'Upgrade items and entities in the blueprint'
								: `Apply ${selectedPlannerLabel} as ${placedPlanner.direction}`
						}
						aria-describedby={tooltipId}
						aria-controls={selectedPlannerLabel === undefined ? selectorDialogId : undefined}
						aria-expanded={selectedPlannerLabel === undefined ? selectorOpen : undefined}
						aria-haspopup={selectedPlannerLabel === undefined ? 'dialog' : undefined}
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
						<FactorioIcon icon={{type: 'item', name: 'upgrade-planner'}} size="large" />
					</button>
					<button
						type="button"
						className="factorio-toolbar-button blueprint-editor-toolbar__planner-slot"
						aria-label={
							selectedPlannerLabel === undefined
								? 'Choose upgrade planner for toolbar slot'
								: `Change placed upgrade planner, currently ${selectedPlannerLabel}`
						}
						aria-controls={selectorDialogId}
						aria-describedby={dropError === undefined ? undefined : dropErrorId}
						aria-expanded={selectorOpen}
						aria-haspopup="dialog"
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
								<FactorioIcon icon={{type: 'item', name: 'upgrade-planner'}} size="small" />
								<span className="blueprint-editor-toolbar__planner-direction" aria-hidden="true">
									{placedPlanner.direction === 'upgrade' ? '↑' : '↓'}
								</span>
							</>
						)}
					</button>
					{placedPlanner === undefined ? null : (
						<button
							type="button"
							className="blueprint-editor-toolbar__planner-clear"
							aria-label={`Remove ${selectedPlannerLabel} from toolbar slot`}
							onClick={onClearPlacedPlanner}
						>
							×
						</button>
					)}
				</div>
				<span id={tooltipId} className="factorio-toolbar-tooltip" role="tooltip">
					{placedPlanner === undefined
						? 'Upgrade items and entities in the blueprint.'
						: `Apply ${selectedPlannerLabel}. Shift+Enter or right-click applies the opposite direction.`}
				</span>
				<p
					id={dropErrorId}
					className="blueprint-editor-toolbar__drop-error"
					role={dropError === undefined ? undefined : 'alert'}
				>
					{dropError}
				</p>
			</div>
			{parameterizationAvailable ? (
				<div className="factorio-toolbar-control">
					<button
						type="button"
						className="factorio-toolbar-button blueprint-editor-toolbar__button blueprint-editor-toolbar__button--parameterization"
						aria-label="Parametrise or reconfigure the blueprint"
						aria-controls={parameterizationDialogId}
						aria-describedby={parameterizationTooltipId}
						aria-expanded={parameterizationOpen}
						aria-haspopup="dialog"
						onClick={() => {
							onOpenParameterization();
						}}
					>
						<FactorioIcon icon={{type: 'item', name: 'parameter-'}} size="large" />
					</button>
					<span id={parameterizationTooltipId} className="factorio-toolbar-tooltip" role="tooltip">
						Parametrise/reconfigure the blueprint.
					</span>
				</div>
			) : null}
		</div>
	);
}
