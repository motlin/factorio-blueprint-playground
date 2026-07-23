import {useId} from 'react';

import {FactorioIcon} from '../../../core/icons/FactorioIcon';

interface BlueprintEditorToolbarProps {
	disabled: boolean;
	onOpenUpgradePlanner: () => void;
}

export function BlueprintEditorToolbar({disabled, onOpenUpgradePlanner}: BlueprintEditorToolbarProps) {
	const tooltipId = useId();
	const tooltip = disabled
		? 'Save or cancel your Blueprint Editor changes before opening the Upgrade Planner.'
		: 'Upgrade items and entities in the blueprint.';

	return (
		<div className="blueprint-editor-toolbar" role="toolbar" aria-label="Blueprint editor actions">
			<div className="factorio-toolbar-control">
				<button
					type="button"
					className="factorio-toolbar-button blueprint-editor-toolbar__button"
					aria-label="Upgrade items and entities in the blueprint"
					aria-describedby={tooltipId}
					disabled={disabled}
					onClick={() => {
						onOpenUpgradePlanner();
					}}
				>
					<FactorioIcon icon={{type: 'item', name: 'upgrade-planner'}} size="large" />
				</button>
				<span id={tooltipId} className="factorio-toolbar-tooltip" role="tooltip">
					{tooltip}
				</span>
			</div>
		</div>
	);
}
