import {describe, expect, test} from 'vite-plus/test';

import {TIER_FAMILIES, TIER_LOOKUP} from '../../src/transform/tierMap';

describe('tier map', () => {
	test('defines the supported entity families in ascending tier order', () => {
		expect(TIER_FAMILIES).toStrictEqual([
			{
				category: 'transport-belt',
				tiers: [
					{name: 'transport-belt'},
					{name: 'fast-transport-belt'},
					{name: 'express-transport-belt'},
					{name: 'turbo-transport-belt', spaceAge: true},
				],
			},
			{
				category: 'underground-belt',
				tiers: [
					{name: 'underground-belt'},
					{name: 'fast-underground-belt'},
					{name: 'express-underground-belt'},
					{name: 'turbo-underground-belt', spaceAge: true},
				],
			},
			{
				category: 'splitter',
				tiers: [
					{name: 'splitter'},
					{name: 'fast-splitter'},
					{name: 'express-splitter'},
					{name: 'turbo-splitter', spaceAge: true},
				],
			},
			{
				category: 'assembling-machine',
				tiers: [{name: 'assembling-machine-1'}, {name: 'assembling-machine-2'}, {name: 'assembling-machine-3'}],
			},
			{
				category: 'inserter',
				tiers: [
					{name: 'inserter'},
					{name: 'fast-inserter'},
					{name: 'bulk-inserter'},
					{name: 'stack-inserter', spaceAge: true},
				],
			},
		]);
	});

	test('looks up every entity name without duplicates', () => {
		expect([...TIER_LOOKUP]).toStrictEqual([
			['transport-belt', {familyIndex: 0, tierIndex: 0}],
			['fast-transport-belt', {familyIndex: 0, tierIndex: 1}],
			['express-transport-belt', {familyIndex: 0, tierIndex: 2}],
			['turbo-transport-belt', {familyIndex: 0, tierIndex: 3}],
			['underground-belt', {familyIndex: 1, tierIndex: 0}],
			['fast-underground-belt', {familyIndex: 1, tierIndex: 1}],
			['express-underground-belt', {familyIndex: 1, tierIndex: 2}],
			['turbo-underground-belt', {familyIndex: 1, tierIndex: 3}],
			['splitter', {familyIndex: 2, tierIndex: 0}],
			['fast-splitter', {familyIndex: 2, tierIndex: 1}],
			['express-splitter', {familyIndex: 2, tierIndex: 2}],
			['turbo-splitter', {familyIndex: 2, tierIndex: 3}],
			['assembling-machine-1', {familyIndex: 3, tierIndex: 0}],
			['assembling-machine-2', {familyIndex: 3, tierIndex: 1}],
			['assembling-machine-3', {familyIndex: 3, tierIndex: 2}],
			['inserter', {familyIndex: 4, tierIndex: 0}],
			['fast-inserter', {familyIndex: 4, tierIndex: 1}],
			['bulk-inserter', {familyIndex: 4, tierIndex: 2}],
			['stack-inserter', {familyIndex: 4, tierIndex: 3}],
		]);
	});
});
