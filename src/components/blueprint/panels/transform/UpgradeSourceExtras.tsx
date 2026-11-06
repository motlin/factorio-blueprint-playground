import type {SignalID} from '../../../../parsing/types';
import {SignalSlot} from './UpgradeMappingRow';
import {signalName} from './upgradePlannerSignals';

interface UpgradeSourceExtrasProps {
	entityFilter: SignalID | undefined;
	onChooseEntityFilter: () => void;
	onClearEntityFilter: () => void;
}

/**
 * UpgradeFilterSelectListGui module-settings extras: an Entity filter slot that
 * scopes a module source to one module-using entity. Empty means all eligible
 * entities.
 */
export function UpgradeSourceExtras({
	entityFilter,
	onChooseEntityFilter,
	onClearEntityFilter,
}: UpgradeSourceExtrasProps) {
	const description = 'Limits the module replacement to one machine type. Empty applies to every machine.';
	return (
		<section
			className="upgrade-destination-extras"
			aria-label="Module settings"
			data-factorio-source="UpgradeFilterSelectListGui"
		>
			<h3 className="upgrade-destination-extras__heading">Module settings</h3>
			<div className="upgrade-destination-extras__row">
				<span className="upgrade-destination-extras__label" title={description}>
					Entity filter
				</span>
				<SignalSlot
					label={
						entityFilter === undefined
							? 'Choose entity filter'
							: `Edit entity filter, currently ${signalName(entityFilter)}`
					}
					signal={entityFilter}
					onChoose={onChooseEntityFilter}
					onClear={entityFilter === undefined ? undefined : onClearEntityFilter}
				/>
			</div>
		</section>
	);
}
