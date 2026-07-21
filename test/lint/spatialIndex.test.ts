import {describe, expect, test} from 'vite-plus/test';

import {SpatialIndex} from '../../src/lint/spatialIndex';
import type {Direction16} from '../../src/lint/direction';
import type {Entity} from '../../src/parsing/types';

const aliceEntity: Entity = {entity_number: 100, name: 'inserter', position: {x: 0.5, y: -1.5}};
const bobEntity: Entity = {entity_number: 200, name: 'transport-belt', position: {x: 0.5, y: -1.5}};
const north = (): Direction16 => 0;

describe('SpatialIndex', () => {
	test('returns no entities from an empty index', () => {
		expect(new SpatialIndex([], north).entitiesAt(0, 0)).toStrictEqual([]);
	});

	test('returns an entity at its exact position', () => {
		expect(new SpatialIndex([aliceEntity], north).entitiesAt(0.5, -1.5)).toStrictEqual([aliceEntity]);
	});

	test('preserves co-located entities in source order', () => {
		expect(new SpatialIndex([aliceEntity, bobEntity], north).entitiesAt(0.5, -1.5)).toStrictEqual([
			aliceEntity,
			bobEntity,
		]);
	});

	test('indexes every occupied tile and swaps rectangular footprints when rotated', () => {
		const boiler: Entity = {entity_number: 300, name: 'boiler', position: {x: 10, y: 20}};
		const index = new SpatialIndex([boiler], (): Direction16 => 4);

		expect([
			index.entitiesOccupying(9.5, 19),
			index.entitiesOccupying(10.5, 19),
			index.entitiesOccupying(9.5, 20),
			index.entitiesOccupying(10.5, 20),
			index.entitiesOccupying(9.5, 21),
			index.entitiesOccupying(10.5, 21),
			index.entitiesOccupying(8.5, 20),
		]).toStrictEqual([[boiler], [boiler], [boiler], [boiler], [boiler], [boiler], []]);
	});

	test('keeps unknown modded entities out of footprint occupancy', () => {
		const moddedEntity: Entity = {entity_number: 400, name: 'alice-modded-machine', position: {x: 0.5, y: 0.5}};
		const index = new SpatialIndex([moddedEntity], north);

		expect({
			exact: index.entitiesAt(0.5, 0.5),
			occupied: index.entitiesOccupying(0.5, 0.5),
		}).toStrictEqual({exact: [moddedEntity], occupied: []});
	});
});
