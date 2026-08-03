import {maxModuleSlots} from './upgradePlannerSignals';

interface UpgradeDestinationExtrasProps {
	moduleLimit: number | undefined;
	onModuleLimitChange: (moduleLimit: number | undefined) => void;
}

/**
 * UpgradeDestinationSelectListGui module-settings extras: a Module limit
 * checkbox plus a bounded value input shown for module destinations only. The
 * game pairs the value with a notched slider; the web uses one bounded number
 * field.
 */
export function UpgradeDestinationExtras({moduleLimit, onModuleLimitChange}: UpgradeDestinationExtrasProps) {
	const limitEnabled = moduleLimit !== undefined && moduleLimit > 0;
	const description =
		'Limits how many of the chosen modules are inserted into each machine when the upgrade is applied.';
	return (
		<section
			className="upgrade-destination-extras"
			aria-label="Module settings"
			data-factorio-source="UpgradeDestinationSelectListGui"
		>
			<h3 className="upgrade-destination-extras__heading">Module settings</h3>
			<div className="upgrade-destination-extras__row">
				<label className="checkbox-label upgrade-destination-extras__option" title={description}>
					<input
						type="checkbox"
						aria-description={description}
						checked={limitEnabled}
						data-factorio-style="checkbox"
						onChange={(event) => {
							onModuleLimitChange(event.currentTarget.checked ? maxModuleSlots : undefined);
						}}
					/>
					<span className="checkbox upgrade-destination-extras__checkbox" aria-hidden="true" />
					<span className="upgrade-destination-extras__label">Module limit</span>
				</label>
				<input
					type="number"
					className="upgrade-destination-extras__value"
					aria-label="Module limit value"
					disabled={!limitEnabled}
					min={1}
					max={maxModuleSlots}
					value={limitEnabled ? moduleLimit : maxModuleSlots}
					onChange={(event) => {
						const parsed = Number(event.currentTarget.value);
						if (Number.isInteger(parsed)) {
							onModuleLimitChange(Math.min(Math.max(parsed, 1), maxModuleSlots));
						}
					}}
				/>
			</div>
		</section>
	);
}
