import type {Entity} from '../../parsing/types';
import {POWERED_ENTITY_NAMES, POWER_POLE_SUPPLY_HALF_WIDTH} from '../data/power';
import {isCardinal} from '../direction';
import type {LintFinding, LintRule} from '../types';
import type {CoverageSource} from './coverage';
import {isEntityCovered} from './coverage';

function isPowerPole(name: string): name is keyof typeof POWER_POLE_SUPPLY_HALF_WIDTH {
	return Object.hasOwn(POWER_POLE_SUPPLY_HALF_WIDTH, name);
}

function isPoweredEntity(name: string): boolean {
	return Object.hasOwn(POWERED_ENTITY_NAMES, name);
}

function finding(rule: LintRule, entity: Entity): LintFinding {
	return {
		ruleId: rule.id,
		severity: rule.severity,
		message: `Powered entity "${entity.name}" at (${entity.position.x}, ${entity.position.y}) is outside every power pole supply area.`,
		entityNumbers: [entity.entity_number],
	};
}

export const powerPoleCoverageRule: LintRule = {
	id: 'power-pole-coverage',
	severity: 'warning',
	run(context) {
		const poles: CoverageSource[] = context.entities.flatMap((entity) =>
			isPowerPole(entity.name) && isCardinal(context.direction(entity))
				? [{entity, halfWidth: POWER_POLE_SUPPLY_HALF_WIDTH[entity.name]}]
				: [],
		);

		return context.entities.flatMap((entity) => {
			if (
				!isPoweredEntity(entity.name) ||
				!isCardinal(context.direction(entity)) ||
				isEntityCovered(context, entity, poles)
			) {
				return [];
			}
			return [finding(this, entity)];
		});
	},
};
