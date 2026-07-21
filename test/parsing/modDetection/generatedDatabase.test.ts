import {describe, expect, it} from 'vite-plus/test';

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

function detect(fixture: unknown) {
	return classify(extractNames(fixture as BlueprintString), database);
}

describe('generated mod database', () => {
	it('classifies representative blueprint fixtures', () => {
		expect({
			vanilla: detect(vanillaFixture),
			spaceAge: detect(spaceAgeFixture),
			krastorio: detect(krastorioFixture),
			unknownMod: detect(unknownModFixture),
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
						source: 'Krastorio 2',
						label: 'Krastorio 2',
						confidence: 'low',
						matchCount: 4,
						exampleNames: [
							'kr-advanced-assembling-machine',
							'kr-huge-storage-tank',
							'kr-imersite-crystal',
							'kr-imersite-gear-wheel',
						],
					},
				],
				unknownNames: [
					{name: 'kr-advanced-assembling-machine', prefixHint: 'Krastorio 2'},
					{name: 'kr-huge-storage-tank', prefixHint: 'Krastorio 2'},
					{name: 'kr-imersite-crystal', prefixHint: 'Krastorio 2'},
					{name: 'kr-imersite-gear-wheel', prefixHint: 'Krastorio 2'},
				],
				warnings: [],
			},
			unknownMod: {
				verdicts: [
					{
						source: 'Space Exploration',
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
		});
	});
});
