import type {Entity} from '../../parsing/types';
import {occupiedTileCenters} from '../data/footprints';
import type {LintContext} from '../types';

export interface CoverageSource {
	entity: Entity;
	halfWidth: number;
}

export function isEntityCovered(context: LintContext, entity: Entity, sources: CoverageSource[]): boolean {
	const positions = occupiedTileCenters(entity, context.direction(entity));
	if (positions.length === 0) return true;

	return positions.some((position) =>
		sources.some(
			(source) =>
				Math.abs(position.x - source.entity.position.x) <= source.halfWidth &&
				Math.abs(position.y - source.entity.position.y) <= source.halfWidth,
		),
	);
}
