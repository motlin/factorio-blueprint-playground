import {useId, useMemo} from 'react';

import gameUiSpec from '../../../../generated/game-ui-spec.json';
import type {BlueprintString, SignalID} from '../../../../parsing/types';
import {
	blueprintComponentRemovalKey,
	type BlueprintComponentIdentity,
	type BlueprintComponentRemovalKey,
} from '../../../../transform/componentRemoval';
import {FactorioIcon} from '../../../core/icons/FactorioIcon';
import {
	FactorioInventorySlot,
	FactorioScrollFrame,
	FactorioTooltip,
	FactorioTooltipPlacement,
} from '../../../ui/FactorioUi';
import {aggregateBlueprintComponents, blueprintComponentName} from './blueprintComponents';

const slotsPerRow = gameUiSpec.styles.signalsTableColumnCount;

interface BlueprintComponentsGridProps {
	blueprint: BlueprintString;
	onComponentRemovedChange: (component: BlueprintComponentIdentity, removed: boolean) => void;
	removedComponents: ReadonlySet<BlueprintComponentRemovalKey>;
}

export function BlueprintComponentsGrid({
	blueprint,
	onComponentRemovedChange,
	removedComponents,
}: BlueprintComponentsGridProps) {
	const headingId = useId();
	const emptyDescriptionId = useId();
	const components = useMemo(() => aggregateBlueprintComponents(blueprint), [blueprint]);
	const emptySlotCount =
		components.length === 0 ? slotsPerRow : (slotsPerRow - (components.length % slotsPerRow)) % slotsPerRow;

	return (
		<section
			className="transform-workflow__section blueprint-components"
			aria-labelledby={headingId}
			data-factorio-source="BlueprintSettingsGui::makeComponentsFrame"
			data-factorio-style="bordered_frame"
		>
			<h4 id={headingId} data-factorio-style="caption_label">
				Components
			</h4>
			{components.length === 0 ? (
				<p id={emptyDescriptionId} className="transform-visually-hidden">
					No components in this blueprint.
				</p>
			) : null}
			<FactorioScrollFrame
				className="blueprint-components__scroll"
				aria-label="Blueprint components"
				aria-describedby={components.length === 0 ? emptyDescriptionId : undefined}
				data-factorio-source="BlueprintSettingsGui::makeComponentsFrame"
			>
				<ul className="blueprint-components__grid" aria-label="Blueprint component slots">
					{components.map((component, index) => {
						const identity: BlueprintComponentIdentity = {
							name: component.name,
							quality: component.quality,
							type: component.type,
						};
						const removed = removedComponents.has(blueprintComponentRemovalKey(identity));
						const icon: SignalID = {
							name: component.name,
							quality: component.quality,
							type: component.type,
						};
						const name = blueprintComponentName(component);
						const tooltipId = `${headingId}-component-${index.toString()}-tooltip`;
						return (
							<li
								key={JSON.stringify(icon)}
								className={`blueprint-components__slot${
									removed ? ' blueprint-components__slot--removed' : ''
								}`}
							>
								<FactorioInventorySlot
									className="blueprint-components__slot-button"
									aria-describedby={tooltipId}
									aria-keyshortcuts={removed ? 'Enter' : 'Delete'}
									aria-label={
										removed
											? `${name}, removed. Left-click or press Enter to restore.`
											: `${name}, ${component.count.toLocaleString()}. Right-click or press Delete to remove.`
									}
									data-component-slot-state={removed ? 'removed' : 'included'}
									data-factorio-source="BlueprintSettingsGui::updateTotal"
									data-factorio-slot-style={removed ? 'red_slot_button' : 'slot_button'}
									onClick={() => {
										if (removed) {
											onComponentRemovedChange(identity, false);
										}
									}}
									onContextMenu={(event) => {
										event.preventDefault();
										if (!removed) {
											onComponentRemovedChange(identity, true);
										}
									}}
									onKeyDown={(event) => {
										if (!removed && (event.key === 'Delete' || event.key === 'Backspace')) {
											event.preventDefault();
											onComponentRemovedChange(identity, true);
										} else if (removed && (event.key === 'Enter' || event.key === ' ')) {
											event.preventDefault();
											onComponentRemovedChange(identity, false);
										}
									}}
								>
									<FactorioIcon icon={icon} size="large" />
									<span className="blueprint-components__count" aria-hidden="true">
										{removed ? '0' : component.count.toLocaleString()}
									</span>
									<FactorioTooltip
										id={tooltipId}
										className="blueprint-components__tooltip"
										heading={name}
										placement={FactorioTooltipPlacement.Above}
									>
										<span>{`${component.type}:${component.name}`}</span>
										{component.quality === undefined ? null : (
											<span>Quality: {component.quality}</span>
										)}
										<span>
											{removed
												? 'Left-click to add all components of this type back.'
												: 'Right-click to remove all components of this type.'}
										</span>
									</FactorioTooltip>
								</FactorioInventorySlot>
							</li>
						);
					})}
					{Array.from({length: emptySlotCount}, (_, index) => (
						<li
							key={`empty-${index.toString()}`}
							className="factorio-inventory-slot blueprint-components__slot blueprint-components__slot--empty"
							aria-hidden="true"
						/>
					))}
				</ul>
			</FactorioScrollFrame>
		</section>
	);
}
