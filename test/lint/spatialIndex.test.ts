import {describe, expect, test} from 'vite-plus/test';

import {SpatialIndex} from '../../src/lint/spatialIndex';
import type {Entity} from '../../src/parsing/types';

const aliceEntity: Entity = {entity_number: 100, name: 'inserter', position: {x: 0.5, y: -1.5}};
const bobEntity: Entity = {entity_number: 200, name: 'transport-belt', position: {x: 0.5, y: -1.5}};

describe('SpatialIndex', () => {
	test('returns no entities from an empty index', () => {
		expect(new SpatialIndex([]).entitiesAt(0, 0)).toStrictEqual([]);
	});

	test('returns an entity at its exact position', () => {
		expect(new SpatialIndex([aliceEntity]).entitiesAt(0.5, -1.5)).toStrictEqual([aliceEntity]);
	});

	test('preserves co-located entities in source order', () => {
		expect(new SpatialIndex([aliceEntity, bobEntity]).entitiesAt(0.5, -1.5)).toStrictEqual([
			aliceEntity,
			bobEntity,
		]);
	});
});
