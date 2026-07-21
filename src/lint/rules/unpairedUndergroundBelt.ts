import {isCardinal} from '../direction';
import {UNDERGROUND_BELT_SPAN} from '../data/undergrounds';
import type {Entity} from '../../parsing/types';
import type {LintContext, LintFinding, LintRule} from '../types';
import {findPartner} from './findPartner';

function isKnownUndergroundBelt(name: string): name is keyof typeof UNDERGROUND_BELT_SPAN {
	return Object.hasOwn(UNDERGROUND_BELT_SPAN, name);
}

function undergroundSpan(name: string): number | undefined {
	return isKnownUndergroundBelt(name) ? UNDERGROUND_BELT_SPAN[name] : undefined;
}

function findOutput(context: LintContext, input: Entity, span: number): Entity | undefined {
	const direction = context.direction(input);
	return findPartner(
		context,
		input,
		span,
		(candidate) => candidate.type === 'output' && context.direction(candidate) === direction,
	);
}

function finding(rule: LintRule, entity: Entity, expectedType: 'input' | 'output'): LintFinding {
	return {
		ruleId: rule.id,
		severity: rule.severity,
		message: `Underground belt "${entity.name}" at (${entity.position.x}, ${entity.position.y}) has no paired ${expectedType}.`,
		entityNumbers: [entity.entity_number],
	};
}

export const unpairedUndergroundBeltRule: LintRule = {
	id: 'unpaired-underground-belt',
	severity: 'warning',
	run(context) {
		const pairedInputs = new Set<number>();
		const pairedOutputs = new Set<number>();

		for (const entity of context.entities) {
			const span = undergroundSpan(entity.name);
			if (span === undefined || entity.type !== 'input') continue;
			const direction = context.direction(entity);
			if (!isCardinal(direction)) continue;
			const output = findOutput(context, entity, span);
			if (output) {
				pairedInputs.add(entity.entity_number);
				pairedOutputs.add(output.entity_number);
			}
		}

		return context.entities.flatMap((entity) => {
			if (undergroundSpan(entity.name) === undefined || !isCardinal(context.direction(entity))) return [];
			if (entity.type === 'input' && !pairedInputs.has(entity.entity_number)) {
				return [finding(this, entity, 'output')];
			}
			if (entity.type === 'output' && !pairedOutputs.has(entity.entity_number)) {
				return [finding(this, entity, 'input')];
			}
			return [];
		});
	},
};
