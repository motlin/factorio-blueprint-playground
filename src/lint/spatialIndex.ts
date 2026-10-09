import type {Entity} from '../parsing/types';
import {isKnownEntityName, occupiedTileCenters} from './data/footprints';
import type {Direction16} from './direction';

function positionKey(x: number, y: number): string {
	return `${x},${y}`;
}

export class SpatialIndex {
	readonly #entitiesByPosition = new Map<string, Entity[]>();
	readonly #entitiesByOccupiedTile = new Map<string, Entity[]>();

	constructor(entities: Entity[], direction: (entity: Entity) => Direction16) {
		for (const entity of entities) {
			const key = positionKey(entity.position.x, entity.position.y);
			const entitiesAtPosition = this.#entitiesByPosition.get(key);
			if (entitiesAtPosition) {
				entitiesAtPosition.push(entity);
			} else {
				this.#entitiesByPosition.set(key, [entity]);
			}

			if (!isKnownEntityName(entity.name)) continue;
			for (const position of occupiedTileCenters(entity, direction(entity))) {
				const occupiedKey = positionKey(position.x, position.y);
				const occupyingEntities = this.#entitiesByOccupiedTile.get(occupiedKey);
				if (occupyingEntities) {
					occupyingEntities.push(entity);
				} else {
					this.#entitiesByOccupiedTile.set(occupiedKey, [entity]);
				}
			}
		}
	}

	entitiesAt(x: number, y: number): Entity[] {
		return this.#entitiesByPosition.get(positionKey(x, y)) ?? [];
	}

	entitiesOccupying(x: number, y: number): Entity[] {
		return this.#entitiesByOccupiedTile.get(positionKey(x, y)) ?? [];
	}
}
