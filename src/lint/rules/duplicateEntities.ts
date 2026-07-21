import type {Entity} from '../../parsing/types';
import type {LintFinding, LintRule} from '../types';

function duplicateKey(entity: Entity): string {
	return JSON.stringify([entity.name, entity.position.x, entity.position.y]);
}

export const duplicateEntitiesRule: LintRule = {
	id: 'duplicate-entities',
	severity: 'error',
	run(context) {
		const entitiesByNameAndPosition = new Map<string, Entity[]>();
		for (const entity of context.entities) {
			const key = duplicateKey(entity);
			const duplicates = entitiesByNameAndPosition.get(key);
			if (duplicates) {
				duplicates.push(entity);
			} else {
				entitiesByNameAndPosition.set(key, [entity]);
			}
		}

		return [...entitiesByNameAndPosition.values()].flatMap((entities): LintFinding[] => {
			if (entities.length < 2) return [];
			const first = entities[0];
			return [
				{
					ruleId: this.id,
					severity: this.severity,
					message: `${entities.length} "${first.name}" entities share position (${first.position.x}, ${first.position.y}).`,
					entityNumbers: entities.map((entity) => entity.entity_number),
				},
			];
		});
	},
};
