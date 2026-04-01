import {describe, expect, it} from 'vite-plus/test';

import {BlueprintWrapper} from '../../src/parsing/BlueprintWrapper';
import type {BlueprintString} from '../../src/parsing/types';

describe('BlueprintWrapper', () => {
	it('clones and updates blueprint metadata', () => {
		const blueprint: BlueprintString = {
			blueprint: {
				description: 'Original description',
				item: 'blueprint',
				label: 'Original label',
				version: 0,
			},
		};
		const wrapper = new BlueprintWrapper(blueprint);

		expect([wrapper.updateLabel('Updated label'), wrapper.updateDescription('Updated description')]).toStrictEqual([
			true,
			true,
		]);
		expect(wrapper.getRawBlueprint()).toStrictEqual({
			blueprint: {
				description: 'Updated description',
				item: 'blueprint',
				label: 'Updated label',
				version: 0,
			},
		});
		expect(blueprint).toStrictEqual({
			blueprint: {
				description: 'Original description',
				item: 'blueprint',
				label: 'Original label',
				version: 0,
			},
		});
	});

	it('updates planner descriptions in settings', () => {
		const wrapper = new BlueprintWrapper({
			upgrade_planner: {
				item: 'upgrade-planner',
				settings: {
					description: 'Original description',
					mappers: [],
				},
				version: 0,
			},
		});

		expect(wrapper.updateDescription('Updated description')).toBe(true);
		expect(wrapper.getRawBlueprint()).toStrictEqual({
			upgrade_planner: {
				item: 'upgrade-planner',
				settings: {
					description: 'Updated description',
					mappers: [],
				},
				version: 0,
			},
		});
	});
});
