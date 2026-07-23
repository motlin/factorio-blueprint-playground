import {expect, test} from 'vite-plus/test';

import type {BlueprintString} from '../../src/parsing/types';
import {
	analyzeIconReplacements,
	analyzeMetadataSubstitution,
	analyzeMetadataIcons,
	applyIconReplacements,
	applyMetadataSubstitution,
} from '../../src/transform/metadataSubstitution';

const plannerMetadataBook: BlueprintString = {
	blueprint_book: {
		item: 'blueprint-book',
		label: "Alice's Red book",
		description: 'red RED Red',
		version: 0,
		icons: [{index: 1, signal: {type: 'virtual', name: 'signal-red'}}],
		blueprints: [
			{
				index: 100,
				blueprint: {
					item: 'blueprint',
					label: '[virtual-signal=signal-red] Red balancer',
					description: 'No match',
					version: 0,
					icons: [{index: 1, signal: {type: 'virtual', name: 'signal-green'}}],
				},
			},
			{
				index: 200,
				upgrade_planner: {
					item: 'upgrade-planner',
					label: 'Red planner',
					version: 0,
					settings: {
						description: 'Replace red',
						icons: [{index: 1, signal: {type: 'virtual', name: 'signal-red'}}],
						mappers: [],
					},
				},
			},
			{
				index: 300,
				deconstruction_planner: {
					item: 'deconstruction-planner',
					version: 0,
					settings: {
						description: 'RED only',
						icons: [{index: 1, signal: {type: 'virtual', name: 'signal-red'}}],
					},
				},
			},
		],
	},
};

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

test('preserves case in blueprint and planner titles, descriptions, and rich signal labels', () => {
	const substitution = {find: 'red', replace: 'blue'};

	expect({
		count: analyzeMetadataSubstitution(plannerMetadataBook, substitution),
		result: applyMetadataSubstitution(plannerMetadataBook, substitution),
	}).toStrictEqual({
		count: 9,
		result: {
			blueprint_book: {
				item: 'blueprint-book',
				label: "Alice's Blue book",
				description: 'blue BLUE Blue',
				version: 0,
				icons: [{index: 1, signal: {type: 'virtual', name: 'signal-red'}}],
				blueprints: [
					{
						index: 100,
						blueprint: {
							item: 'blueprint',
							label: '[virtual-signal=signal-blue] Blue balancer',
							description: 'No match',
							version: 0,
							icons: [{index: 1, signal: {type: 'virtual', name: 'signal-green'}}],
						},
					},
					{
						index: 200,
						upgrade_planner: {
							item: 'upgrade-planner',
							label: 'Blue planner',
							version: 0,
							settings: {
								description: 'Replace blue',
								icons: [{index: 1, signal: {type: 'virtual', name: 'signal-red'}}],
								mappers: [],
							},
						},
					},
					{
						index: 300,
						deconstruction_planner: {
							item: 'deconstruction-planner',
							version: 0,
							settings: {
								description: 'BLUE only',
								icons: [{index: 1, signal: {type: 'virtual', name: 'signal-red'}}],
							},
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
