import type {Blueprint, BlueprintString} from '../parsing/types';
import {normalizeDirection, versionMajor} from './direction';
import {rules} from './rules';
import {SpatialIndex} from './spatialIndex';
import type {LintContext, LintFinding} from './types';

export function buildLintContext(blueprint: Blueprint): LintContext {
	const entities = blueprint.entities ?? [];
	const major = versionMajor(blueprint.version);

	return {
		blueprint,
		entities,
		entityByNumber: new Map(entities.map((entity) => [entity.entity_number, entity])),
		index: new SpatialIndex(entities),
		direction: (entity) => normalizeDirection(entity.direction, major),
	};
}

export function lintBlueprint(blueprintString: BlueprintString): LintFinding[] {
	const blueprint = blueprintString.blueprint;
	if (!blueprint) return [];

	const context = buildLintContext(blueprint);
	return rules.flatMap((rule) => rule.run(context));
}
