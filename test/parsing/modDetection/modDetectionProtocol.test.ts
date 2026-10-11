import {describe, expect, test} from 'vite-plus/test';

import {handleModDetectionRequest} from '../../../src/parsing/modDetection/modDetectionProtocol';
import type {ModDatabase} from '../../../src/parsing/modDetection/types';
import type {BlueprintString} from '../../../src/parsing/types';

const database: ModDatabase = {
	generatedAt: '2000-01-01',
	factoriolabCommit: '0000000000000000000000000000000000000000',
	factorioDataVersion: '0.0.0',
	license: 'Test data',
	sources: [
		{id: 'base', label: 'Factorio 2.0'},
		{id: 'space-age', label: 'Space Age', dlc: true},
	],
	names: {'transport-belt': 1, foundry: 2},
	prefixes: {'se-': 'Space Exploration'},
};

const VERSION_2_0 = 562949958139904;

describe('handleModDetectionRequest', () => {
	test('answers with the detection result for the requested blueprint', () => {
		const blueprint: BlueprintString = {
			blueprint: {
				item: 'blueprint',
				version: VERSION_2_0,
				entities: [
					{entity_number: 1, name: 'transport-belt', position: {x: 0, y: 0}},
					{entity_number: 2, name: 'foundry', position: {x: 2, y: 0}},
					{entity_number: 3, name: 'invented-assembler', position: {x: 6, y: 0}},
				],
			},
		};

		expect(handleModDetectionRequest({id: 4, blueprint}, database)).toStrictEqual({
			id: 4,
			result: {
				verdicts: [
					{
						source: 'base',
						label: 'Factorio 2.0',
						confidence: 'high',
						matchCount: 1,
						exampleNames: ['transport-belt'],
					},
					{
						source: 'space-age',
						label: 'Space Age',
						confidence: 'medium',
						matchCount: 1,
						exampleNames: ['foundry'],
					},
				],
				unknownNames: [{name: 'invented-assembler', prefixHint: undefined}],
				warnings: [],
			},
		});
	});
});
