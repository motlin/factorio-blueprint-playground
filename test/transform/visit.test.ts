import {describe, expect, test, vi} from 'vite-plus/test';

import {deserializeBlueprint} from '../../src/parsing/blueprintParser';
import type {Blueprint, BlueprintString} from '../../src/parsing/types';
import {mapBlueprints} from '../../src/transform/visit';
import {readFixtureFile} from '../fixtures/utils';

function deepFreeze(value: unknown): void {
	if (value !== null && typeof value === 'object') {
		Object.freeze(value);
		for (const nestedValue of Object.values(value)) {
			deepFreeze(nestedValue);
		}
	}
}

describe('mapBlueprints', () => {
	test('returns an empty blueprint string unchanged', () => {
		const emptyBlueprint: BlueprintString = {};
		const visitor = vi.fn<(blueprint: Blueprint) => Blueprint>();

		expect(mapBlueprints(emptyBlueprint, visitor)).toBe(emptyBlueprint);
		expect(visitor).not.toHaveBeenCalled();
	});

	test('maps a single blueprint without mutating its deeply frozen input', () => {
		const input: BlueprintString = {
			blueprint: {
				item: 'blueprint',
				label: 'Alice',
				version: 0,
			},
		};
		deepFreeze(input);

		const result = mapBlueprints(input, (blueprint) => ({...blueprint, label: 'Bob'}));

		expect(result).toStrictEqual({
			blueprint: {
				item: 'blueprint',
				label: 'Bob',
				version: 0,
			},
		});
		expect(input).toStrictEqual({
			blueprint: {
				item: 'blueprint',
				label: 'Alice',
				version: 0,
			},
		});
	});

	test('recurses through nested books and leaves planners unchanged', () => {
		const input = deserializeBlueprint(readFixtureFile('txt/nested-book.txt'));
		deepFreeze(input);

		const result = mapBlueprints(input, (blueprint) => ({...blueprint, label: `Mapped ${blueprint.label}`}));

		expect(result).toStrictEqual({
			blueprint_book: {
				item: 'blueprint-book',
				label: 'Nested test book',
				version: 0,
				active_index: 0,
				blueprints: [
					{
						index: 0,
						blueprint: {
							item: 'blueprint',
							label: "Mapped Alice's belts",
							version: 0,
							entities: [
								{
									entity_number: 1,
									name: 'transport-belt',
									position: {x: 0, y: 0},
								},
							],
						},
					},
					{
						index: 1,
						blueprint_book: {
							item: 'blueprint-book',
							label: 'Inner test book',
							version: 0,
							active_index: 0,
							blueprints: [
								{
									index: 0,
									blueprint: {
										item: 'blueprint',
										label: "Mapped Bob's inserter",
										version: 0,
										entities: [
											{
												entity_number: 1,
												name: 'fast-inserter',
												position: {x: 1, y: 1},
											},
										],
									},
								},
								{
									index: 1,
									upgrade_planner: {
										item: 'upgrade-planner',
										label: 'Unchanged planner',
										version: 0,
										settings: {mappers: []},
									},
								},
							],
						},
					},
				],
			},
		});
	});

	test('returns a root planner by reference', () => {
		const planner: BlueprintString = {
			upgrade_planner: {
				item: 'upgrade-planner',
				version: 0,
				settings: {mappers: []},
			},
		};
		const visitor = vi.fn<(blueprint: Blueprint) => Blueprint>();

		expect(mapBlueprints(planner, visitor)).toBe(planner);
		expect(visitor).not.toHaveBeenCalled();
	});
});
