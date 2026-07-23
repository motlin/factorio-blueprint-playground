import {useId, useMemo} from 'react';

import type {BlueprintString, SignalID} from '../../../../parsing/types';
import {
	blueprintComponentRemovalKey,
	type BlueprintComponentIdentity,
	type BlueprintComponentRemovalKey,
} from '../../../../transform/componentRemoval';
import {FactorioIcon} from '../../../core/icons/FactorioIcon';
import {aggregateBlueprintComponents, blueprintComponentName} from './blueprintComponents';

const slotsPerRow = 10;

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
	const components = useMemo(() => aggregateBlueprintComponents(blueprint), [blueprint]);
	const emptySlotCount =
		components.length === 0 ? 0 : (slotsPerRow - (components.length % slotsPerRow)) % slotsPerRow;

	return (
		<section className="transform-workflow__section blueprint-components" aria-labelledby={headingId}>
			<h4 id={headingId}>Components</h4>
			{components.length === 0 ? (
				<p className="blueprint-components__empty">No components in this blueprint.</p>
			) : (
				<ul className="blueprint-components__grid" aria-label="Blueprint components">
					{components.map((component) => {
						const identity: BlueprintComponentIdentity = {
							name: component.name,
							type: component.type,
						};
						const removed = removedComponents.has(blueprintComponentRemovalKey(identity));
						const icon: SignalID = {
							name: component.name,
							quality: component.quality,
							type: component.type,
						};
						const name = blueprintComponentName(component);
						const quality = component.quality === undefined ? '' : `\nQuality: ${component.quality}`;
						return (
							<li
								key={JSON.stringify(icon)}
								className={`blueprint-components__slot${
									removed ? ' blueprint-components__slot--removed' : ''
								}`}
							>
								<button
									type="button"
									className="blueprint-components__slot-button"
									aria-label={
										removed
											? `${name}, removed. Left-click or press Enter to restore.`
											: `${name}, ${component.count.toLocaleString()}. Right-click or press Delete to remove.`
									}
									title={`${name}\n${component.type}:${component.name}${quality}\n${
										removed ? 'Left-click to restore.' : 'Right-click to remove.'
									}`}
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
								</button>
							</li>
						);
					})}
					{Array.from({length: emptySlotCount}, (_, index) => (
						<li
							key={`empty-${index.toString()}`}
							className="blueprint-components__slot blueprint-components__slot--empty"
							aria-hidden="true"
						/>
					))}
				</ul>
			)}
		</section>
	);
}
