import type {BlueprintString, Entity, Quality} from '../parsing/types';
import {lintBlueprint} from './engine';
import type {LintFinding} from './types';

export interface LocatedLintFinding extends LintFinding {
	// Selection path of the finding's blueprint, relative to the linted blueprint; '' is the blueprint itself.
	path: string;
	blueprintLabel: string | undefined;
	// The first flagged entity, so the page can show it without indexing every entity itself.
	entity: {name: string; quality: Quality; position: Entity['position']} | undefined;
}

export interface LintRequest {
	id: number;
	blueprint: BlueprintString;
}

export type LintResponse = {id: number; findings: LocatedLintFinding[]} | {id: number; error: string};

function* blueprintsWithPaths(blueprint: BlueprintString, path = ''): Generator<[BlueprintString, string]> {
	yield [blueprint, path];
	for (const [index, child] of (blueprint.blueprint_book?.blueprints ?? []).entries()) {
		yield* blueprintsWithPaths(child, path === '' ? `${index + 1}` : `${path}.${index + 1}`);
	}
}

export function lintBlueprintTree(blueprint: BlueprintString): LocatedLintFinding[] {
	return [...blueprintsWithPaths(blueprint)].flatMap(([node, path]) => {
		const findings = lintBlueprint(node);
		if (findings.length === 0) return [];
		const entityByNumber = new Map(node.blueprint?.entities?.map((entity) => [entity.entity_number, entity]));
		return findings.map((finding) => {
			const entity =
				finding.entityNumbers.length === 0 ? undefined : entityByNumber.get(finding.entityNumbers[0]);
			return {
				...finding,
				path,
				blueprintLabel: node.blueprint?.label,
				entity: entity && {name: entity.name, quality: entity.quality, position: entity.position},
			};
		});
	});
}

export function handleLintRequest({id, blueprint}: LintRequest): LintResponse {
	try {
		return {id, findings: lintBlueprintTree(blueprint)};
	} catch (error) {
		return {id, error: error instanceof Error ? error.message : String(error)};
	}
}
