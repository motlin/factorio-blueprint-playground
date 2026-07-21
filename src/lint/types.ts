import type {Blueprint, Entity} from '../parsing/types';
import type {Direction16} from './direction';
import type {SpatialIndex} from './spatialIndex';

export type LintSeverity = 'error' | 'warning' | 'info';

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
	entityByNumber: Map<number, Entity>;
	index: SpatialIndex;
	direction(entity: Entity): Direction16;
}
