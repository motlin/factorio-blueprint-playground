import {useId} from 'react';

import {FactorioIcon} from '../../../core/icons/FactorioIcon';

interface BlueprintEditorToolbarProps {
	onOpenUpgradePlannerSelector: () => void;
	selectorDialogId: string;
	selectorOpen: boolean;
}

export function BlueprintEditorToolbar({
	onOpenUpgradePlannerSelector,
	selectorDialogId,
	selectorOpen,
}: BlueprintEditorToolbarProps) {
	const tooltipId = useId();

	return (
		<div className="blueprint-editor-toolbar" role="toolbar" aria-label="Blueprint editor actions">
			<div className="factorio-toolbar-control">
				<button
					type="button"
					className="factorio-toolbar-button blueprint-editor-toolbar__button blueprint-editor-toolbar__button--upgrade"
					aria-label="Upgrade items and entities in the blueprint"
					aria-describedby={tooltipId}
					aria-controls={selectorDialogId}
					aria-expanded={selectorOpen}
					aria-haspopup="dialog"
					onClick={() => {
						onOpenUpgradePlannerSelector();
					}}
				>
					<FactorioIcon icon={{type: 'item', name: 'upgrade-planner'}} size="large" />
				</button>
				<span id={tooltipId} className="factorio-toolbar-tooltip" role="tooltip">
					Upgrade items and entities in the blueprint.
				</span>
			</div>
		</div>
	);
}
