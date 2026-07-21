import type {Entity} from '../parsing/types';

function positionKey(x: number, y: number): string {
	return `${x},${y}`;
}

export class SpatialIndex {
	readonly #entitiesByPosition = new Map<string, Entity[]>();

	constructor(entities: Entity[]) {
		for (const entity of entities) {
			const key = positionKey(entity.position.x, entity.position.y);
			const entitiesAtPosition = this.#entitiesByPosition.get(key);
			if (entitiesAtPosition) {
				entitiesAtPosition.push(entity);
			} else {
				this.#entitiesByPosition.set(key, [entity]);
			}
		}
	}

	entitiesAt(x: number, y: number): Entity[] {
		return this.#entitiesByPosition.get(positionKey(x, y)) ?? [];
	}
}
