import {expect, test} from 'vite-plus/test';

import type {BlueprintString} from '../../src/parsing/types';
import {
	analyzeIconReplacements,
	analyzeMetadataSubstitution,
	analyzeMetadataIcons,
	applyIconReplacements,
	applyMetadataSubstitution,
} from '../../src/transform/metadataSubstitution';

test('preserves Red, red, and RED capitalization throughout nested book metadata', () => {
	const input: BlueprintString = {
		blueprint_book: {
			item: 'blueprint-book',
			label: 'Red red RED',
			description: 'No match',
			version: 0,
			blueprints: [
				{
					index: 100,
					blueprint_book: {
						item: 'blueprint-book',
						label: 'RED group',
						description: 'red Red',
						version: 0,
						blueprints: [
							{
								index: 200,
								blueprint: {
									item: 'blueprint',
									label: 'Red machine',
									description: 'red / RED',
									version: 0,
								},
							},
						],
					},
				},
			],
		},
	};
	const substitution = {find: 'red', replace: 'blue'};

	expect({
		count: analyzeMetadataSubstitution(input, substitution),
		result: applyMetadataSubstitution(input, substitution),
	}).toStrictEqual({
		count: 9,
		result: {
			blueprint_book: {
				item: 'blueprint-book',
				label: 'Blue blue BLUE',
				description: 'No match',
				version: 0,
				blueprints: [
					{
						index: 100,
						blueprint_book: {
							item: 'blueprint-book',
							label: 'BLUE group',
							description: 'blue Blue',
							version: 0,
							blueprints: [
								{
									index: 200,
									blueprint: {
										item: 'blueprint',
										label: 'Blue machine',
										description: 'blue / BLUE',
										version: 0,
									},
								},
							],
						},
					},
				],
			},
		},
	});
});

test('replaces virtual signal icons throughout nested blueprint books', () => {
	const input: BlueprintString = {
		blueprint_book: {
			item: 'blueprint-book',
			version: 0,
			icons: [{index: 1, signal: {type: 'virtual', name: 'signal-red'}}],
			blueprints: [
				{
					index: 100,
					blueprint_book: {
						item: 'blueprint-book',
						version: 0,
						icons: [{index: 1, signal: {type: 'virtual', name: 'signal-red'}}],
						blueprints: [
							{
								index: 200,
								blueprint: {
									item: 'blueprint',
									version: 0,
									icons: [
										{index: 1, signal: {type: 'virtual', name: 'signal-green'}},
										{index: 2, signal: {type: 'virtual', name: 'signal-red'}},
									],
								},
							},
						],
					},
				},
			],
		},
	};
	const replacements = [
		{from: {type: 'virtual' as const, name: 'signal-red'}, to: {type: 'virtual' as const, name: 'signal-blue'}},
	];

	expect({
		candidates: analyzeMetadataIcons(input),
		count: analyzeIconReplacements(input, replacements),
		result: applyIconReplacements(input, replacements),
	}).toStrictEqual({
		candidates: [
			{count: 3, signal: {type: 'virtual', name: 'signal-red'}},
			{count: 1, signal: {type: 'virtual', name: 'signal-green'}},
		],
		count: 3,
		result: {
			blueprint_book: {
				item: 'blueprint-book',
				version: 0,
				icons: [{index: 1, signal: {type: 'virtual', name: 'signal-blue'}}],
				blueprints: [
					{
						index: 100,
						blueprint_book: {
							item: 'blueprint-book',
							version: 0,
							icons: [{index: 1, signal: {type: 'virtual', name: 'signal-blue'}}],
							blueprints: [
								{
									index: 200,
									blueprint: {
										item: 'blueprint',
										version: 0,
										icons: [
											{index: 1, signal: {type: 'virtual', name: 'signal-green'}},
											{index: 2, signal: {type: 'virtual', name: 'signal-blue'}},
										],
									},
								},
							],
						},
					},
				],
			},
		},
	});
});
