import {describe, expect, test} from 'vite-plus/test';

import {
	isUpgradeSourceOption,
	upgradeTargetOptions,
} from '../../src/components/blueprint/panels/transform/upgradePlannerSignals';

describe('upgradePlannerSignals', () => {
	test('limits manual sources to entities and modules and generates the complete module family', () => {
		expect({
			sourceValidity: [
				{type: 'entity' as const, name: 'assembling-machine-1'},
				{type: 'item' as const, name: 'speed-module'},
				{type: 'item' as const, name: 'iron-plate'},
			].map(isUpgradeSourceOption),
			targets: upgradeTargetOptions({type: 'item', name: 'speed-module'}, {type: 'item', name: 'speed-module'}),
		}).toStrictEqual({
			sourceValidity: [true, true, false],
			targets: [
				{type: 'item', name: 'speed-module'},
				{type: 'item', name: 'speed-module-2'},
				{type: 'item', name: 'speed-module-3'},
			],
		});
	});
});
