import {expect, test} from 'vite-plus/test';

import type {BlueprintString} from '../../src/parsing/types';
import {
	analyzeIconReplacements,
	analyzeMetadataIcons,
	applyIconReplacements,
} from '../../src/transform/metadataSubstitution';

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
