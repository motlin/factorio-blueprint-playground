import type {Entity} from '../../parsing/types';
import {isKnownEntityName} from '../data/footprints';
import {ROBOPORT_CONSTRUCTION_HALF_WIDTH} from '../data/power';
import {isCardinal} from '../direction';
import type {LintFinding, LintRule} from '../types';
import type {CoverageSource} from './coverage';
import {isEntityCovered} from './coverage';

function isRoboport(name: string): name is keyof typeof ROBOPORT_CONSTRUCTION_HALF_WIDTH {
	return Object.hasOwn(ROBOPORT_CONSTRUCTION_HALF_WIDTH, name);
}

function finding(rule: LintRule, entity: Entity): LintFinding {
	return {
		ruleId: rule.id,
		severity: rule.severity,
		message: `Entity "${entity.name}" at (${entity.position.x}, ${entity.position.y}) is outside every roboport construction area.`,
		entityNumbers: [entity.entity_number],
	};
}

export const roboportCoverageRule: LintRule = {
	id: 'roboport-coverage',
	severity: 'warning',
	run(context) {
		const roboports: CoverageSource[] = context.entities.flatMap((entity) =>
			isRoboport(entity.name) && isCardinal(context.direction(entity))
				? [{entity, halfWidth: ROBOPORT_CONSTRUCTION_HALF_WIDTH[entity.name]}]
				: [],
		);
		if (roboports.length === 0) return [];

		return context.entities.flatMap((entity) => {
			if (
				!isKnownEntityName(entity.name) ||
				!isCardinal(context.direction(entity)) ||
				isEntityCovered(context, entity, roboports)
			) {
				return [];
			}
			return [finding(this, entity)];
		});
	},
};
