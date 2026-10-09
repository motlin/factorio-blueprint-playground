import type {Blueprint, Entity} from '../parsing/types';
import type {Direction16} from './direction';
import type {SpatialIndex} from './spatialIndex';

// 'good' marks practices worth praising, such as labeled inputs and outputs.
export type LintSeverity = 'error' | 'warning' | 'info' | 'good';

export interface LintFinding {
	ruleId: string;
	severity: LintSeverity;
	message: string;
	entityNumbers: number[];
}

export interface LintRule {
	id: string;
	severity: LintSeverity;
	run(context: LintContext): LintFinding[];
}

export interface LintContext {
	blueprint: Blueprint;
	entities: Entity[];
	// Extremes of entity positions; edges of the blueprint as it would be placed.
	bounds: {minX: number; maxX: number; minY: number; maxY: number};
	entityByNumber: Map<number, Entity>;
	index: SpatialIndex;
	direction(entity: Entity): Direction16;
}
