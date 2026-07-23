import {useId, useMemo} from 'react';

import type {BlueprintString, SignalID} from '../../../../parsing/types';
import {FactorioIcon} from '../../../core/icons/FactorioIcon';
import {aggregateBlueprintComponents, blueprintComponentName} from './blueprintComponents';

const slotsPerRow = 10;

interface BlueprintComponentsGridProps {
	blueprint: BlueprintString;
}

export function BlueprintComponentsGrid({blueprint}: BlueprintComponentsGridProps) {
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
								className="blueprint-components__slot"
								aria-label={`${name}, ${component.count.toLocaleString()}`}
								tabIndex={0}
								title={`${name}\n${component.type}:${component.name}${quality}`}
							>
								<FactorioIcon icon={icon} size="large" />
								<span className="blueprint-components__count" aria-hidden="true">
									{component.count.toLocaleString()}
								</span>
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
