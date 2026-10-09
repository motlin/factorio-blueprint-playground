import type {Entity} from '../../parsing/types';
import {occupiedTileCenters} from '../data/footprints';
import type {LintContext} from '../types';

export interface CoverageSource {
	entity: Entity;
	halfWidth: number;
}

/**
 * Buckets sources into square cells at least as wide as the widest coverage area,
 * so a covering source is always in the queried tile's cell or one of its eight neighbors.
 */
export class CoverageIndex {
	readonly #cellSize: number;
	readonly #sourcesByCell = new Map<string, CoverageSource[]>();

	constructor(sources: CoverageSource[]) {
		this.#cellSize = sources.reduce((size, source) => Math.max(size, Math.ceil(source.halfWidth)), 1);
		for (const source of sources) {
			const key = this.#cellKey(this.#cell(source.entity.position.x), this.#cell(source.entity.position.y));
			const sourcesInCell = this.#sourcesByCell.get(key);
			if (sourcesInCell) {
				sourcesInCell.push(source);
			} else {
				this.#sourcesByCell.set(key, [source]);
			}
		}
	}

	covers(x: number, y: number): boolean {
		const cellX = this.#cell(x);
		const cellY = this.#cell(y);
		for (let dx = -1; dx <= 1; dx += 1) {
			for (let dy = -1; dy <= 1; dy += 1) {
				const sources = this.#sourcesByCell.get(this.#cellKey(cellX + dx, cellY + dy)) ?? [];
				if (
					sources.some(
						(source) =>
							Math.abs(x - source.entity.position.x) <= source.halfWidth &&
							Math.abs(y - source.entity.position.y) <= source.halfWidth,
					)
				) {
					return true;
				}
			}
		}
		return false;
	}

	#cell(coordinate: number): number {
		return Math.floor(coordinate / this.#cellSize);
	}

	#cellKey(cellX: number, cellY: number): string {
		return `${cellX},${cellY}`;
	}
}

export function isEntityCovered(context: LintContext, entity: Entity, coverage: CoverageIndex): boolean {
	const positions = occupiedTileCenters(entity, context.direction(entity));
	if (positions.length === 0) return true;

	return positions.some((position) => coverage.covers(position.x, position.y));
}
