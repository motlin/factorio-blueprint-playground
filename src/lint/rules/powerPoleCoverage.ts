import type {Entity} from '../../parsing/types';
import {POWERED_ENTITY_NAMES, POWER_POLE_SUPPLY_HALF_WIDTH} from '../data/power';
import {isCardinal} from '../direction';
import type {LintFinding, LintRule} from '../types';
import type {CoverageSource} from './coverage';
import {CoverageIndex, isEntityCovered} from './coverage';

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

const NEAR_COMPLETE_COVERAGE = 0.9;

export const powerPoleCoverageRule: LintRule = {
	id: 'power-pole-coverage',
	severity: 'warning',
	run(context) {
		const poles: CoverageSource[] = context.entities.flatMap((entity) =>
			isPowerPole(entity.name) && isCardinal(context.direction(entity))
				? [{entity, halfWidth: POWER_POLE_SUPPLY_HALF_WIDTH[entity.name]}]
				: [],
		);

		// Without poles, power comes from wherever the blueprint is placed.
		if (poles.length === 0) return [];
		const coverage = new CoverageIndex(poles);

		const uncovered = context.entities.filter(
			(entity) =>
				isPoweredEntity(entity.name) &&
				isCardinal(context.direction(entity)) &&
				!isEntityCovered(context, entity, coverage),
		);
		const powered = context.entities.filter(
			(entity) => isPoweredEntity(entity.name) && isCardinal(context.direction(entity)),
		).length;
		// Many designs carry only some of their poles; only a near-complete network makes a miss look like a mistake.
		if (uncovered.length > powered * (1 - NEAR_COMPLETE_COVERAGE)) return [];

		// A neighboring copy of a tileable design can power entities this close to the edge.
		const reach = poles.reduce((widest, pole) => Math.max(widest, pole.halfWidth), 0);
		const {minX, maxX, minY, maxY} = context.bounds;
		return uncovered.flatMap((entity) => {
			const {x, y} = entity.position;
			const nearEdge = x - minX <= reach || maxX - x <= reach || y - minY <= reach || maxY - y <= reach;
			return nearEdge ? [] : [finding(this, entity)];
		});
	},
};
