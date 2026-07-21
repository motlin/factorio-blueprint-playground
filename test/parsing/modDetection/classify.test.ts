import {describe, expect, it} from 'vite-plus/test';

import {classify} from '../../../src/parsing/modDetection/classify';
import type {ExtractedNames, ModDatabase} from '../../../src/parsing/modDetection/types';

const database: ModDatabase = {
	generatedAt: '2000-01-01',
	factoriolabCommit: '0000000000000000000000000000000000000000',
	license: 'Test data',
	sources: [
		{id: 'base', label: 'Factorio 2.0'},
		{id: 'space-age', label: 'Space Age', dlc: true},
		{id: 'quality', label: 'Quality', dlc: true},
		{id: 'elevated-rails', label: 'Elevated Rails', dlc: true},
		{id: 'kr2', label: 'Krastorio 2'},
		{id: 'sxp', label: 'Space Exploration Postprocess'},
		{id: 'se', label: 'Space Exploration'},
	],
	names: {
		'transport-belt': 1,
		'base-and-kr': 17,
		foundry: 2,
		'quality-module-3': 4,
		'rail-ramp': 8,
		'kr-exclusive': 16,
		'kr-exclusive-a': 16,
		'kr-exclusive-b': 16,
		'kr-exclusive-c': 16,
		'sxp-exclusive': 32,
		'ambiguous-a': 48,
		'ambiguous-b': 48,
	},
	prefixes: {
		's-': 'Short Prefix',
		'se-': 'Space Exploration',
		'kr-': 'Krastorio 2',
	},
};

function extracted(
	names: string[],
	options: {
		hasNonNormalQuality?: boolean;
		hasPlanetSignals?: boolean;
		hasSpaceLocationSignals?: boolean;
		version?: string;
	} = {},
): ExtractedNames {
	return {
		names: new Map(
			names.map((name) => [
				name,
				{
					kinds: new Set(['any'] as const),
					count: 1,
				},
			]),
		),
		flags: {
			hasNonNormalQuality: options.hasNonNormalQuality ?? false,
			hasPlanetSignals: options.hasPlanetSignals ?? false,
			hasSpaceLocationSignals: options.hasSpaceLocationSignals ?? false,
		},
		version: options.version ?? '2.0.0.0',
	};
}

describe('classify', () => {
	it('classifies base names and lets the base bit win over mod bits', () => {
		expect(classify(extracted(['transport-belt', 'base-and-kr']), database)).toStrictEqual({
			verdicts: [
				{
					source: 'base',
					label: 'Factorio 2.0',
					confidence: 'high',
					matchCount: 2,
					exampleNames: ['base-and-kr', 'transport-belt'],
				},
			],
			unknownNames: [],
			warnings: [],
		});
	});

	it('splits DLC evidence and promotes definitive flags to high confidence', () => {
		expect(
			classify(
				extracted(['foundry', 'quality-module-3', 'rail-ramp'], {
					hasNonNormalQuality: true,
					hasPlanetSignals: true,
				}),
				database,
			),
		).toStrictEqual({
			verdicts: [
				{
					source: 'space-age',
					label: 'Space Age',
					confidence: 'high',
					matchCount: 1,
					exampleNames: ['foundry'],
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
		});
	});

	it('uses greedy set cover and exclusive evidence to resolve multi-mod names', () => {
		expect(classify(extracted(['ambiguous-a', 'kr-exclusive', 'ambiguous-b']), database)).toStrictEqual({
			verdicts: [
				{
					source: 'kr2',
					label: 'Krastorio 2',
					confidence: 'medium',
					matchCount: 3,
					exampleNames: ['ambiguous-a', 'ambiguous-b', 'kr-exclusive'],
				},
			],
			unknownNames: [],
			warnings: [],
		});
	});

	it('assigns high confidence after three exclusive matches', () => {
		expect(classify(extracted(['kr-exclusive-c', 'kr-exclusive-a', 'kr-exclusive-b']), database)).toStrictEqual({
			verdicts: [
				{
					source: 'kr2',
					label: 'Krastorio 2',
					confidence: 'high',
					matchCount: 3,
					exampleNames: ['kr-exclusive-a', 'kr-exclusive-b', 'kr-exclusive-c'],
				},
			],
			unknownNames: [],
			warnings: [],
		});
	});

	it('uses the longest unknown-name prefix and keeps unhinted names unknown', () => {
		expect(classify(extracted(['se-test-machine', 'made-up-machine']), database)).toStrictEqual({
			verdicts: [
				{
					source: 'se',
					label: 'Space Exploration',
					confidence: 'low',
					matchCount: 1,
					exampleNames: ['se-test-machine'],
				},
			],
			unknownNames: [
				{name: 'made-up-machine', prefixHint: undefined},
				{name: 'se-test-machine', prefixHint: 'Space Exploration'},
			],
			warnings: [],
		});
	});

	it('reports unknown names when no source or prefix matches', () => {
		expect(classify(extracted(['made-up-machine']), database)).toStrictEqual({
			verdicts: [],
			unknownNames: [{name: 'made-up-machine', prefixHint: undefined}],
			warnings: [],
		});
	});

	it('warns when pre-2.0 blueprint versions contain DLC evidence', () => {
		expect(classify(extracted(['foundry'], {version: '1.1.110.0'}), database)).toStrictEqual({
			verdicts: [
				{
					source: 'space-age',
					label: 'Space Age',
					confidence: 'medium',
					matchCount: 1,
					exampleNames: ['foundry'],
				},
			],
			unknownNames: [],
			warnings: ['Blueprint version 1.1.110.0 predates Factorio 2.0, but Space Age evidence is present.'],
		});
	});
});
