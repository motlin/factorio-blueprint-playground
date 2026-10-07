import type {Entity} from '../../parsing/types';
import {isKnownEntityName, VANILLA_RAIL_NAMES} from '../data/footprints';
import type {LintFinding, LintRule} from '../types';

// Mods such as Miniloader stack their own entities on purpose, so only vanilla entities are checked.
function isVanillaEntity(name: string): boolean {
	return isKnownEntityName(name) || VANILLA_RAIL_NAMES.has(name);
}

function duplicateKey(entity: Entity): string {
	return JSON.stringify([entity.name, entity.position.x, entity.position.y, entity.direction ?? 0]);
}

export const duplicateEntitiesRule: LintRule = {
	id: 'duplicate-entities',
	severity: 'error',
	run(context) {
		const entitiesByKey = new Map<string, Entity[]>();
		for (const entity of context.entities) {
			if (!isVanillaEntity(entity.name)) continue;
			const key = duplicateKey(entity);
			const duplicates = entitiesByKey.get(key);
			if (duplicates) {
				duplicates.push(entity);
			} else {
				entitiesByKey.set(key, [entity]);
			}
		}

		return [...entitiesByKey.values()].flatMap((entities): LintFinding[] => {
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
