import {describe, expect, test} from 'vite-plus/test';

import {handleLintRequest} from '../../src/lint/lintProtocol';
import type {BlueprintString} from '../../src/parsing/types';

const VERSION_2_0 = 562949958139904;

const emptyBlueprint: BlueprintString = {blueprint: {item: 'blueprint', version: VERSION_2_0}};
const emptyFinding = {
	ruleId: 'empty-blueprint',
	severity: 'info',
	message: 'Blueprint contains no entities or tiles.',
	entityNumbers: [],
	path: '',
	blueprintLabel: undefined,
	entity: undefined,
};

describe('handleLintRequest', () => {
	test('answers with the findings for the requested blueprint', () => {
		expect(handleLintRequest({id: 7, blueprint: emptyBlueprint})).toStrictEqual({id: 7, result: [emptyFinding]});
	});

	test('lints every blueprint in a book and says where each finding is', () => {
		const book: BlueprintString = {
			blueprint_book: {
				item: 'blueprint-book',
				version: VERSION_2_0,
				blueprints: [
					{
						index: 0,
						blueprint: {
							item: 'blueprint',
							label: 'Inserters',
							version: VERSION_2_0,
							entities: [
								{
									entity_number: 1,
									name: 'inserter',
									position: {x: 0.5, y: 0.5},
									direction: 4,
									quality: 'rare',
								},
								{entity_number: 2, name: 'wooden-chest', position: {x: -50.5, y: -50.5}},
								{entity_number: 3, name: 'wooden-chest', position: {x: 50.5, y: 50.5}},
							],
						},
					},
					{
						index: 1,
						blueprint_book: {
							item: 'blueprint-book',
							version: VERSION_2_0,
							blueprints: [
								{index: 0, blueprint: {item: 'blueprint', label: 'Empty', version: VERSION_2_0}},
							],
						},
					},
				],
			},
		};

		expect(handleLintRequest({id: 1, blueprint: book})).toStrictEqual({
			id: 1,
			result: [
				{
					ruleId: 'inserter-facing-nothing',
					severity: 'warning',
					message: 'Inserter "inserter" at (0.5, 0.5) has no pickup or drop target.',
					entityNumbers: [1],
					path: '1',
					blueprintLabel: 'Inserters',
					entity: {name: 'inserter', quality: 'rare', position: {x: 0.5, y: 0.5}},
				},
				{...emptyFinding, path: '2.1', blueprintLabel: 'Empty'},
			],
		});
	});
});
