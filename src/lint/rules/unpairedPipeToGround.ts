import type {Entity} from '../../parsing/types';
import {PIPE_TO_GROUND_SPAN} from '../data/undergrounds';
import {isCardinal, opposite} from '../direction';
import type {LintFinding, LintRule} from '../types';
import {findPartner} from './findPartner';

function isKnownPipeToGround(name: string): name is keyof typeof PIPE_TO_GROUND_SPAN {
	return Object.hasOwn(PIPE_TO_GROUND_SPAN, name);
}

function pipeSpan(name: string): number | undefined {
	return isKnownPipeToGround(name) ? PIPE_TO_GROUND_SPAN[name] : undefined;
}

function finding(rule: LintRule, entity: Entity): LintFinding {
	return {
		ruleId: rule.id,
		severity: rule.severity,
		message: `Pipe-to-ground at (${entity.position.x}, ${entity.position.y}) has no paired pipe-to-ground.`,
		entityNumbers: [entity.entity_number],
	};
}

export const unpairedPipeToGroundRule: LintRule = {
	id: 'unpaired-pipe-to-ground',
	severity: 'warning',
	run(context) {
		const pairedEntities = new Set<number>();

		for (const entity of context.entities) {
			const span = pipeSpan(entity.name);
			if (span === undefined) continue;
			const direction = context.direction(entity);
			if (!isCardinal(direction)) continue;
			const partner = findPartner(
				context,
				entity,
				span,
				(candidate) => context.direction(candidate) === opposite(direction),
			);
			if (partner) {
				pairedEntities.add(entity.entity_number);
				pairedEntities.add(partner.entity_number);
			}
		}

		return context.entities.flatMap((entity) => {
			if (
				pipeSpan(entity.name) === undefined ||
				!isCardinal(context.direction(entity)) ||
				pairedEntities.has(entity.entity_number)
			) {
				return [];
			}
			return [finding(this, entity)];
		});
	},
};
