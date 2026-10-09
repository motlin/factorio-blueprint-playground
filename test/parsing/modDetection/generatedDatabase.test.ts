import {describe, expect, it} from 'vite-plus/test';

import sourceLockJson from '../../../scripts/mod-db/source-lock.json';
import {parseSourceLock} from '../../../scripts/mod-db/sources';
import databaseJson from '../../../src/generated/mod-db.json';
import {classify} from '../../../src/parsing/modDetection/classify';
import {extractNames} from '../../../src/parsing/modDetection/nameExtractor';
import type {ModDatabase} from '../../../src/parsing/modDetection/types';
import type {BlueprintString} from '../../../src/parsing/types';
import krastorioFixture from '../../fixtures/blueprints/json/krastorio.json';
import spaceAgeFixture from '../../fixtures/blueprints/json/space-age.json';
import unknownModFixture from '../../fixtures/blueprints/json/unknown-mod.json';
import vanillaFixture from '../../fixtures/blueprints/json/vanilla-2.0.json';

const database = databaseJson as ModDatabase;
const sourceLock = parseSourceLock(sourceLockJson);

const editorBlueprint: BlueprintString = {
	blueprint: {
		item: 'blueprint',
		version: 562_949_958_139_904,
		entities: [
			{entity_number: 100, name: 'infinity-chest', position: {x: 0, y: 0}},
			{entity_number: 200, name: 'turbo-loader', position: {x: 1, y: 0}},
		],
	},
};

function sourceIds(name: string): string[] {
	return database.sources
		.filter((_source, index) => ((database.names[name] ?? 0) & (1 << index)) !== 0)
		.map(({id}) => id);
}

function detect(fixture: unknown) {
	return classify(extractNames(fixture as BlueprintString), database);
}

describe('generated mod database', () => {
	it('records the pinned source revisions deterministically', () => {
		expect({
			generatedAt: database.generatedAt,
			factoriolabCommit: database.factoriolabCommit,
			factorioDataVersion: database.factorioDataVersion,
		}).toStrictEqual({
			generatedAt: sourceLock.factorioLab.committedAt.slice(0, 10),
			factoriolabCommit: sourceLock.factorioLab.commit,
			factorioDataVersion: sourceLock.factorioData.version,
		});
	});

	it('classifies representative blueprint fixtures', () => {
		expect({
			vanilla: detect(vanillaFixture),
			spaceAge: detect(spaceAgeFixture),
			krastorio: detect(krastorioFixture),
			unknownMod: detect(unknownModFixture),
			editor: detect(editorBlueprint),
		}).toStrictEqual({
			vanilla: {
				verdicts: [
					{
						source: 'base',
						label: 'Factorio 2.0 / 2.1',
						confidence: 'high',
						matchCount: 7,
						exampleNames: ['decider-combinator', 'signal-A', 'signal-each', 'signal-green', 'stone-path'],
					},
				],
				unknownNames: [],
				warnings: [],
			},
			spaceAge: {
				verdicts: [
					{
						source: 'space-age',
						label: 'Space Age',
						confidence: 'high',
						matchCount: 2,
						exampleNames: ['foundry', 'vulcanus'],
					},
					{
						source: 'quality',
						label: 'Quality',
						confidence: 'high',
						matchCount: 1,
						exampleNames: ['quality-module-3'],
					},
					{
						source: 'elevated-rails',
						label: 'Elevated Rails',
						confidence: 'medium',
						matchCount: 1,
						exampleNames: ['rail-ramp'],
					},
				],
				unknownNames: [],
				warnings: [],
			},
			krastorio: {
				verdicts: [
					{
						source: 'kr2',
						label: 'Krastorio 2',
						confidence: 'medium',
						matchCount: 3,
						exampleNames: ['kr-advanced-assembling-machine', 'kr-huge-storage-tank', 'kr-imersite-crystal'],
					},
				],
				unknownNames: [{name: 'kr-imersite-gear-wheel', prefixHint: 'Krastorio 2'}],
				warnings: [],
			},
			unknownMod: {
				verdicts: [
					{
						source: 'sxp',
						label: 'Space Exploration',
						confidence: 'low',
						matchCount: 1,
						exampleNames: ['se-imaginary-recipe'],
					},
				],
				unknownNames: [
					{name: 'fictional-loader', prefixHint: undefined},
					{name: 'invented-assembler', prefixHint: undefined},
					{name: 'made-up-crystal', prefixHint: undefined},
					{name: 'se-imaginary-recipe', prefixHint: 'Space Exploration'},
				],
				warnings: [],
			},
			editor: {
				verdicts: [
					{
						source: 'map-editor',
						label: 'Map editor',
						confidence: 'high',
						matchCount: 1,
						exampleNames: ['infinity-chest'],
					},
					{
						source: 'space-age-map-editor',
						label: 'Space Age map editor',
						confidence: 'high',
						matchCount: 1,
						exampleNames: ['turbo-loader'],
					},
				],
				unknownNames: [],
				warnings: [],
			},
		});
	});

	it('assigns hidden placeable prototypes to map editor sources', () => {
		expect(
			Object.fromEntries(
				[
					'bottomless-chest',
					'burner-generator',
					'electric-energy-interface',
					'express-loader',
					'fast-loader',
					'heat-interface',
					'infinity-cargo-wagon',
					'infinity-chest',
					'infinity-pipe',
					'lane-splitter',
					'linked-belt',
					'linked-chest',
					'loader',
					'one-way-valve',
					'overflow-valve',
					'proxy-container',
					'simple-entity-with-force',
					'simple-entity-with-owner',
					'top-up-valve',
					'space-platform-hub',
					'turbo-loader',
				].map((name) => [name, sourceIds(name)]),
			),
		).toStrictEqual({
			'bottomless-chest': ['map-editor'],
			'burner-generator': ['map-editor'],
			'electric-energy-interface': ['map-editor'],
			'express-loader': ['map-editor'],
			'fast-loader': ['map-editor'],
			'heat-interface': ['map-editor'],
			'infinity-cargo-wagon': ['map-editor'],
			'infinity-chest': ['map-editor'],
			'infinity-pipe': ['map-editor'],
			'lane-splitter': ['map-editor'],
			'linked-belt': ['map-editor'],
			'linked-chest': ['map-editor'],
			loader: ['map-editor'],
			'one-way-valve': ['map-editor'],
			'overflow-valve': ['map-editor'],
			'proxy-container': ['map-editor'],
			'simple-entity-with-force': ['map-editor'],
			'simple-entity-with-owner': ['map-editor'],
			'space-platform-hub': ['space-age-map-editor'],
			'top-up-valve': ['map-editor'],
			'turbo-loader': ['space-age-map-editor'],
		});
	});

	it('classifies vanilla Factorio 1.1 and 0.16 names as base game evidence, not mods', () => {
		const blueprint: BlueprintString = {
			blueprint: {
				item: 'blueprint',
				version: 281_479_275_675_648,
				icons: [{signal: {type: 'item', name: 'science-pack-1'}, index: 1}],
				entities: [
					{entity_number: 1, name: 'filter-inserter', position: {x: 0, y: 0}},
					{entity_number: 2, name: 'logistic-chest-requester', position: {x: 1, y: 0}},
					{
						entity_number: 3,
						name: 'assembling-machine-3',
						position: {x: 3, y: 0},
						recipe: 'rocket-control-unit',
					},
				],
			},
		};

		expect(detect(blueprint)).toStrictEqual({
			verdicts: [
				{
					source: 'base-1.1',
					label: 'Factorio 1.1 and earlier',
					confidence: 'high',
					matchCount: 5,
					exampleNames: [
						'assembling-machine-3',
						'filter-inserter',
						'logistic-chest-requester',
						'rocket-control-unit',
						'science-pack-1',
					],
				},
			],
			unknownNames: [],
			warnings: [],
		});
	});

	it('attributes hidden and generated vanilla prototypes to the game, not mods', () => {
		expect(
			Object.fromEntries(
				[
					'blueprint',
					'cliff',
					'deconstruction-planner',
					'deepwater',
					'entity-ghost',
					'entity-unknown',
					'fulgoran-ruin-colossal',
					'fusion-plasma',
					'huge-promethium-asteroid',
					'iron-ore-melting',
					'medium-demolisher',
					'parameter-0',
					'signal-any-quality',
					'tile-ghost',
					'tree-01',
				].map((name) => [name, sourceIds(name)]),
			),
		).toStrictEqual({
			blueprint: ['base', 'base-1.1'],
			cliff: ['base'],
			'deconstruction-planner': ['base', 'base-1.1'],
			deepwater: ['base'],
			'entity-ghost': ['base'],
			'entity-unknown': ['base'],
			'fulgoran-ruin-colossal': ['space-age'],
			'fusion-plasma': ['space-age'],
			'huge-promethium-asteroid': ['space-age'],
			'iron-ore-melting': ['space-age'],
			'medium-demolisher': ['space-age'],
			'parameter-0': ['base'],
			'signal-any-quality': ['quality'],
			'tile-ghost': ['base'],
			'tree-01': ['base'],
		});
	});
});
