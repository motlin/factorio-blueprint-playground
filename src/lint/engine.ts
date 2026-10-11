import type {Blueprint, BlueprintString} from '../parsing/types';
import {normalizeDirection, versionMajor} from './direction';
import {rules} from './rules';
import {SpatialIndex} from './spatialIndex';
import type {LintContext, LintFinding} from './types';

export function buildLintContext(blueprint: Blueprint): LintContext {
	const entities = blueprint.entities ?? [];
	const major = versionMajor(blueprint.version);
	const direction = (entity: (typeof entities)[number]) => normalizeDirection(entity.direction, major);

	const bounds = {minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity};
	for (const {position} of entities) {
		bounds.minX = Math.min(bounds.minX, position.x);
		bounds.maxX = Math.max(bounds.maxX, position.x);
		bounds.minY = Math.min(bounds.minY, position.y);
		bounds.maxY = Math.max(bounds.maxY, position.y);
	}

	return {
		blueprint,
		entities,
		bounds,
		entityByNumber: new Map(entities.map((entity) => [entity.entity_number, entity])),
		index: new SpatialIndex(entities, direction),
		direction,
	};
}

export function lintBlueprint(blueprintString: BlueprintString): LintFinding[] {
	const blueprint = blueprintString.blueprint;
	if (!blueprint) return [];

	const context = buildLintContext(blueprint);
	return rules.flatMap((rule) => rule.run(context));
}
