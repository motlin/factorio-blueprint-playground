import {describe, expect, it} from 'vite-plus/test';

import sourceLockJson from '../../../scripts/mod-db/source-lock.json';
import {parseSourceLock} from '../../../scripts/mod-db/sources';
import gameDataJson from '../../../src/generated/game-data.json';
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

function detect(fixture: unknown) {
	return classify(extractNames(fixture as BlueprintString), database);
}

describe('generated mod database', () => {
	it('records the pinned source revisions deterministically', () => {
		expect({
			generatedAt: database.generatedAt,
			factoriolabCommit: database.factoriolabCommit,
			factorioDataVersion: database.factorioDataVersion,
			gameDataFactorioVersion: gameDataJson.factorioDataVersion,
			nextUpgradeCount: gameDataJson.nextUpgrades.length,
		}).toStrictEqual({
			generatedAt: sourceLock.factorioLab.committedAt.slice(0, 10),
			factoriolabCommit: sourceLock.factorioLab.commit,
			factorioDataVersion: sourceLock.factorioData.version,
			gameDataFactorioVersion: sourceLock.factorioData.version,
			nextUpgradeCount: 14,
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
				].map((name) => [name, database.names[name]]),
			),
		).toStrictEqual({
			'bottomless-chest': 65_536,
			'burner-generator': 65_536,
			'electric-energy-interface': 65_536,
			'express-loader': 65_536,
			'fast-loader': 65_536,
			'heat-interface': 65_536,
			'infinity-cargo-wagon': 65_536,
			'infinity-chest': 65_536,
			'infinity-pipe': 65_536,
			'lane-splitter': 65_536,
			'linked-belt': 65_536,
			'linked-chest': 65_536,
			loader: 65_536,
			'one-way-valve': 65_536,
			'overflow-valve': 65_536,
			'proxy-container': 65_536,
			'simple-entity-with-force': 65_536,
			'simple-entity-with-owner': 65_536,
			'space-platform-hub': 131_072,
			'top-up-valve': 65_536,
			'turbo-loader': 131_072,
		});
	});
});
