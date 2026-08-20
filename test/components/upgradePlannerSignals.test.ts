import {describe, expect, test} from 'vite-plus/test';

import {
	canonicalPickerOptions,
	chatIconPickerOptions,
	isUpgradeSourceOption,
	isUpgradeTargetSelectionAllowed,
	replaceUpgradeTarget,
	signalPrototypeIdentity,
	upgradeSourceOptions,
	upgradeTargetOptions,
} from '../../src/components/blueprint/panels/transform/upgradePlannerSignals';

function optionNames(options: readonly {name: string}[]): string[] {
	return options.map(({name}) => name);
}

describe('upgradePlannerSignals', () => {
	test('dedupes caller options on type, name, and quality before source-order sorting', () => {
		const options = canonicalPickerOptions([
			{type: 'recipe', name: 'transport-belt'},
			{type: 'entity', name: 'fast-transport-belt'},
			{type: 'item', name: 'transport-belt'},
			{type: 'item', name: 'transport-belt', quality: 'legendary'},
			{type: 'item', name: 'transport-belt'},
		]);

		expect(options.map(({name, quality, type}) => ({name, quality, type}))).toStrictEqual([
			{type: 'item', name: 'transport-belt', quality: undefined},
			{type: 'item', name: 'transport-belt', quality: 'legendary'},
			{type: 'entity', name: 'fast-transport-belt', quality: undefined},
			{type: 'recipe', name: 'transport-belt', quality: undefined},
		]);
	});

	test('treats an omitted quality and an explicit normal quality as the same option', () => {
		const options = canonicalPickerOptions([
			{type: 'item', name: 'iron-plate'},
			{type: 'item', name: 'iron-plate', quality: 'normal'},
		]);

		expect(options.map(({name, quality, type}) => ({name, quality, type}))).toStrictEqual([
			{type: 'item', name: 'iron-plate', quality: undefined},
		]);
	});

	test('builds the game chat-icon catalog without duplicate item, entity, recipe, or unsupported signals', () => {
		const options = chatIconPickerOptions([
			{type: 'entity', name: 'transport-belt'},
			{type: 'entity', name: 'straight-rail'},
			{type: 'technology', name: 'automation'},
		]);

		expect(
			options
				.filter(({name}) =>
					[
						'transport-belt',
						'straight-rail',
						'automation',
						'normal',
						'uncommon',
						'rare',
						'epic',
						'legendary',
					].includes(name),
				)
				.map(({name, type}) => ({name, type})),
		).toStrictEqual([
			{type: 'item', name: 'transport-belt'},
			{type: 'quality', name: 'normal'},
			{type: 'quality', name: 'uncommon'},
			{type: 'quality', name: 'rare'},
			{type: 'quality', name: 'epic'},
			{type: 'quality', name: 'legendary'},
			{type: 'entity', name: 'straight-rail'},
		]);
	});

	test('builds source options from generated entity groups and module prototypes', () => {
		const options = upgradeSourceOptions();
		const identities = new Set(options.map(signalPrototypeIdentity));

		expect({
			assemblers: ['assembling-machine-1', 'assembling-machine-2', 'assembling-machine-3'].map((name) =>
				identities.has(`entity:${name}`),
			),
			belts: ['transport-belt', 'fast-transport-belt', 'express-transport-belt', 'turbo-transport-belt'].map(
				(name) => identities.has(`entity:${name}`),
			),
			modules: ['speed-module', 'productivity-module-3', 'quality-module-2', 'empty-module-slot'].map((name) =>
				identities.has(`item:${name}`),
			),
			invalidItem: identities.has('item:iron-plate'),
			sourceValidity: [
				{type: 'entity' as const, name: 'assembling-machine-1'},
				{type: 'item' as const, name: 'speed-module'},
				{type: 'item' as const, name: 'empty-module-slot'},
				{type: 'item' as const, name: 'iron-plate'},
			].map(isUpgradeSourceOption),
		}).toStrictEqual({
			assemblers: [true, true, true],
			belts: [true, true, true, true],
			modules: [true, true, true, true],
			invalidItem: false,
			sourceValidity: [true, true, true, false],
		});
	});

	test('keeps an imported source visible without adding it to generated eligibility', () => {
		const importedSource = {type: 'entity' as const, name: 'modded-assembling-machine'};

		expect({
			lastOption: upgradeSourceOptions(importedSource).at(-1),
			valid: isUpgradeSourceOption(importedSource),
		}).toStrictEqual({
			lastOption: importedSource,
			valid: false,
		});
	});

	test('constrains belts and assemblers to the selected generated upgrade group', () => {
		expect({
			assemblers: optionNames(upgradeTargetOptions({type: 'entity', name: 'assembling-machine-2'})),
			belts: optionNames(upgradeTargetOptions({type: 'entity', name: 'fast-transport-belt'})),
			undergrounds: optionNames(upgradeTargetOptions({type: 'entity', name: 'express-underground-belt'})),
		}).toStrictEqual({
			assemblers: ['assembling-machine-1', 'assembling-machine-2', 'assembling-machine-3'],
			belts: ['transport-belt', 'fast-transport-belt', 'express-transport-belt', 'turbo-transport-belt'],
			undergrounds: [
				'underground-belt',
				'fast-underground-belt',
				'express-underground-belt',
				'turbo-underground-belt',
			],
		});
	});

	test('allows every generated module target and the empty-slot sentinel', () => {
		expect(optionNames(upgradeTargetOptions({type: 'item', name: 'speed-module'}))).toStrictEqual([
			'speed-module',
			'speed-module-2',
			'speed-module-3',
			'efficiency-module',
			'efficiency-module-2',
			'efficiency-module-3',
			'productivity-module',
			'productivity-module-2',
			'productivity-module-3',
			'quality-module',
			'quality-module-2',
			'quality-module-3',
			'empty-module-slot',
		]);
	});

	test('allows quality-only mappings and rejects cross-family targets after source changes', () => {
		const rareAssembler = {
			type: 'entity' as const,
			name: 'assembling-machine-1',
			quality: 'rare' as const,
			comparator: '>' as const,
		};

		expect({
			qualityOnly: isUpgradeTargetSelectionAllowed(rareAssembler, {
				type: 'entity',
				name: 'assembling-machine-1',
				quality: 'legendary',
			}),
			assemblerToBelt: isUpgradeTargetSelectionAllowed(rareAssembler, {
				type: 'entity',
				name: 'transport-belt',
			}),
			beltBeforeSourceChange: isUpgradeTargetSelectionAllowed(
				{type: 'entity', name: 'transport-belt'},
				{type: 'entity', name: 'express-transport-belt'},
			),
			beltAfterSourceChange: isUpgradeTargetSelectionAllowed(
				{type: 'entity', name: 'assembling-machine-1'},
				{type: 'entity', name: 'express-transport-belt'},
			),
		}).toStrictEqual({
			qualityOnly: true,
			assemblerToBelt: false,
			beltBeforeSourceChange: true,
			beltAfterSourceChange: false,
		});
	});

	test('retains opaque settings only across compatibility that static data can prove', () => {
		const limitedModule = {type: 'item' as const, name: 'speed-module', module_limit: 2};
		const configuredAssembler = {
			type: 'entity' as const,
			name: 'assembling-machine-3',
			module_slots: [{name: 'productivity-module'}, {}, {}, {}],
		};

		expect({
			moduleChange: replaceUpgradeTarget(limitedModule, {
				type: 'item',
				name: 'quality-module',
				quality: 'rare',
			}),
			qualityChange: replaceUpgradeTarget(configuredAssembler, {
				type: 'entity',
				name: 'assembling-machine-3',
				quality: 'legendary',
			}),
			entityChange: replaceUpgradeTarget(configuredAssembler, {
				type: 'entity',
				name: 'assembling-machine-2',
			}),
		}).toStrictEqual({
			moduleChange: {type: 'item', name: 'quality-module', quality: 'rare', module_limit: 2},
			qualityChange: {
				type: 'entity',
				name: 'assembling-machine-3',
				quality: 'legendary',
				module_slots: [{name: 'productivity-module'}, {}, {}, {}],
			},
			entityChange: {type: 'entity', name: 'assembling-machine-2'},
		});
	});
});
