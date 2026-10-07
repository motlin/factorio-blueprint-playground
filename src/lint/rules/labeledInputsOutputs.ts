import type {Entity} from '../../parsing/types';
import type {LintContext, LintRule} from '../types';

// Labels sit beside the belts and pipes that cross the blueprint's edge.
const EDGE_MARGIN = 2;

function signalNames(entity: Entity): string[] {
	const behavior = entity.control_behavior;
	const sectionNames = (behavior?.sections?.sections ?? []).flatMap((section) =>
		(section.filters ?? []).flatMap((filter) => (filter.name === undefined ? [] : [filter.name])),
	);
	const legacyNames = (behavior?.filters ?? []).flatMap((filter) =>
		filter.signal.name === undefined ? [] : [filter.signal.name],
	);
	return [...new Set([...sectionNames, ...legacyNames])];
}

function wiredEntityNumbers(context: LintContext): Set<number> {
	const wired = new Set<number>();
	for (const [first, , second] of context.blueprint.wires ?? []) {
		wired.add(first);
		wired.add(second);
	}
	for (const entity of context.entities) {
		if (entity.connections !== undefined && Object.keys(entity.connections).length > 0)
			wired.add(entity.entity_number);
	}
	return wired;
}

function isNearEdge(context: LintContext, entity: Entity): boolean {
	const {minX, maxX, minY, maxY} = context.bounds;
	const {x, y} = entity.position;
	return x - minX <= EDGE_MARGIN || maxX - x <= EDGE_MARGIN || y - minY <= EDGE_MARGIN || maxY - y <= EDGE_MARGIN;
}

// A constant combinator showing one signal with no wires does nothing but name what goes in or out there.
export const labeledInputsOutputsRule: LintRule = {
	id: 'labeled-inputs-outputs',
	severity: 'good',
	run(context) {
		const wired = wiredEntityNumbers(context);
		const labels = context.entities.flatMap((entity) => {
			if (
				entity.name !== 'constant-combinator' ||
				wired.has(entity.entity_number) ||
				!isNearEdge(context, entity)
			) {
				return [];
			}
			const names = signalNames(entity);
			return names.length === 1 ? [{entity, name: names[0]}] : [];
		});
		if (labels.length === 0) return [];

		return [
			{
				ruleId: this.id,
				severity: this.severity,
				message: `Labels its inputs and outputs: ${[...new Set(labels.map(({name}) => name))].join(', ')}.`,
				entityNumbers: labels.map(({entity}) => entity.entity_number),
			},
		];
	},
};
