import type {Entity} from '../../parsing/types';
import {INSERTER_REACH, INSERTER_TARGET_NAMES, isKnownEntityName} from '../data/footprints';
import type {TilePosition} from '../data/footprints';
import {isCardinal, unitVector} from '../direction';
import type {LintContext, LintFinding, LintRule} from '../types';

function isKnownInserter(name: string): name is keyof typeof INSERTER_REACH {
	return Object.hasOwn(INSERTER_REACH, name);
}

function isKnownTarget(name: string): boolean {
	return Object.hasOwn(INSERTER_TARGET_NAMES, name);
}

function hasTarget(context: LintContext, position: TilePosition): boolean {
	if (context.index.entitiesOccupying(position.x, position.y).some((entity) => isKnownTarget(entity.name))) {
		return true;
	}

	return context.index.entitiesAt(position.x, position.y).some((entity) => !isKnownEntityName(entity.name));
}

function finding(rule: LintRule, entity: Entity, missingTargets: string[]): LintFinding {
	return {
		ruleId: rule.id,
		severity: rule.severity,
		message: `Inserter "${entity.name}" at (${entity.position.x}, ${entity.position.y}) has no ${missingTargets.join(' or ')} target.`,
		entityNumbers: [entity.entity_number],
	};
}

export const inserterFacingNothingRule: LintRule = {
	id: 'inserter-facing-nothing',
	severity: 'warning',
	run(context) {
		return context.entities.flatMap((entity) => {
			if (!isKnownInserter(entity.name)) return [];
			const direction = context.direction(entity);
			if (!isCardinal(direction)) return [];
			const vector = unitVector(direction);
			const reach = INSERTER_REACH[entity.name];
			const pickup = {
				x: entity.position.x - vector.dx * reach,
				y: entity.position.y - vector.dy * reach,
			};
			const drop = {
				x: entity.position.x + vector.dx * reach,
				y: entity.position.y + vector.dy * reach,
			};
			const missingTargets: string[] = [];
			if (!hasTarget(context, pickup)) missingTargets.push('pickup');
			if (!hasTarget(context, drop)) missingTargets.push('drop');

			return missingTargets.length === 0 ? [] : [finding(this, entity, missingTargets)];
		});
	},
};
