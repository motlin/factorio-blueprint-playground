import type {Entity} from '../../parsing/types';
import {isCardinal, unitVector} from '../direction';
import type {LintContext} from '../types';

function isSameAxis(first: number, second: number): boolean {
	return first % 8 === second % 8;
}

export function findPartner(
	context: LintContext,
	entity: Entity,
	span: number,
	partnerPredicate: (candidate: Entity) => boolean,
): Entity | undefined {
	const direction = context.direction(entity);
	if (!isCardinal(direction)) return undefined;
	const vector = unitVector(direction);

	for (let distance = 1; distance <= span; distance++) {
		const candidates = context.index.entitiesAt(
			entity.position.x + vector.dx * distance,
			entity.position.y + vector.dy * distance,
		);
		for (const candidate of candidates) {
			if (candidate.name !== entity.name) continue;
			const candidateDirection = context.direction(candidate);
			if (!isCardinal(candidateDirection) || !isSameAxis(direction, candidateDirection)) continue;
			return partnerPredicate(candidate) ? candidate : undefined;
		}
	}

	return undefined;
}
