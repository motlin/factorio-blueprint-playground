import {describe, expect, it} from 'vitest';

import {deserializeBlueprint, serializeBlueprint} from '../../src/parsing/blueprintParser';
import {BlueprintString} from '../../src/parsing/types';

describe('Export Verification - Core Logic', () => {
	it('round-trip preserves edited blueprint data exactly', () => {
		const editedBlueprint: BlueprintString = {
			blueprint: {
				label: 'Edited Label',
				description: 'Edited Description',
				icons: [],
				entities: [],
				item: 'blueprint',
				version: 0,
			},
		};

		const serialized = serializeBlueprint(editedBlueprint);
		const deserialized = deserializeBlueprint(serialized);

		expect(deserialized).toEqual(editedBlueprint);
	});

	it('round-trip preserves edited nested blueprint within book exactly', () => {
		const editedBookBlueprint: BlueprintString = {
			blueprint_book: {
				label: 'Original Book',
				description: 'Original Book Description',
				icons: [],
				blueprints: [
					{
						index: 0,
						blueprint: {
							label: 'Edited Nested Label',
							description: 'Edited Nested Description',
							icons: [],
							entities: [],
							item: 'blueprint',
							version: 0,
						},
					},
				],
				item: 'blueprint-book',
				version: 0,
			},
		};

		const serialized = serializeBlueprint(editedBookBlueprint);
		const deserialized = deserializeBlueprint(serialized);

		expect(deserialized).toEqual(editedBookBlueprint);
	});

	it('round-trip preserves special characters in labels exactly', () => {
		const blueprintWithSpecialChars: BlueprintString = {
			blueprint: {
				label: 'Test & Export: "Special" Characters!',
				description: 'Description with\nnewlines and\ttabs',
				icons: [],
				entities: [],
				item: 'blueprint',
				version: 0,
			},
		};

		const serialized = serializeBlueprint(blueprintWithSpecialChars);
		const deserialized = deserializeBlueprint(serialized);

		expect(deserialized).toEqual(blueprintWithSpecialChars);
	});
});
