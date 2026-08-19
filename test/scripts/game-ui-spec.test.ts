/// <reference types="vite-plus/client" />

import {describe, expect, it} from 'vite-plus/test';

import sourceLockJson from '../../scripts/game-ui-spec/source-lock.json';
import {parseGameUiSourceLock, parseGameUiSpec} from '../../scripts/game-ui-spec/schema';
import {readPinnedGameUiSources, type GameUiSourceRepository} from '../../scripts/game-ui-spec/source-repository';
import {extractLiteralLuaPrototypes, serializeGameUiSpec} from '../../scripts/game-ui-spec/transform';
import specificationJson from '../../src/generated/game-ui-spec.json';
import specificationText from '../../src/generated/game-ui-spec.json?raw';

const sourceLock = parseGameUiSourceLock(sourceLockJson);
const specification = parseGameUiSpec(specificationJson);

describe('generated game UI specification', () => {
	it('validates the schema and exact pinned provenance', () => {
		expect({
			schemaVersion: specification.schemaVersion,
			sourceVersion: specification.sourceVersion,
			provenance: specification.provenance,
		}).toStrictEqual({
			schemaVersion: 1,
			sourceVersion: '2.1.12',
			provenance: {
				repository: sourceLock.repository,
				tag: sourceLock.tag,
				commit: sourceLock.commit,
				locale: 'en',
				sources: sourceLock.sources,
				priorArt: {
					repository: 'teoxoy/factorio-blueprint-editor',
					commit: '2bfc95e662cad19e2de89e72016181ca96fdbea6',
					license: 'MIT',
					copyright: 'Copyright (c) 2020 Tanasoaia Teodor Andrei',
					sources: [
						{
							path: 'packages/editor/src/UI/InventoryDialog.ts',
							blob: 'a723eccca0ec00f07576d68cf4a4f3d30895e9af',
						},
						{
							path: 'packages/editor/src/UI/controls/Button.ts',
							blob: 'd4c4d06bcb29f6a5dc0e2941986d961563d6816d',
						},
						{
							path: 'packages/editor/src/UI/controls/Dialog.ts',
							blob: 'd9b4a6f8f5819f45dedac80ed7569c452db24820',
						},
						{
							path: 'packages/editor/src/UI/controls/Panel.ts',
							blob: 'b61a3482f13def5a24987cfd7f3f92000284c2ed',
						},
						{
							path: 'packages/editor/src/UI/controls/functions.ts',
							blob: 'f90851e00c6cd674a013fb357e932218e29fb3fd',
						},
						{
							path: 'packages/editor/src/UI/style.ts',
							blob: 'e64f65935b3dec845524bd995d1778955bc8a452',
						},
						{
							path: 'packages/exporter/src/export-data/data-final-fixes.lua',
							blob: '48ee748a865b3c2113986a1a97134cbf63b3f540',
						},
					],
				},
			},
		});
	});

	it('serializes the generated artifact deterministically', () => {
		expect([
			serializeGameUiSpec(specification),
			serializeGameUiSpec(parseGameUiSpec(structuredClone(specification))),
		]).toStrictEqual([specificationText, specificationText]);
	});

	it('contains representative Factorio 2.1.12 UI facts', () => {
		expect({
			qualities: specification.qualities,
			qualityComparators: specification.qualityComparators,
			labels: specification.labels,
			signalTypeOrder: specification.signals.typeOrder,
			categoryOrder: specification.signals.categories.map(({name}) => name),
			categoryLayouts: specification.signals.categories
				.filter(({name}) => name === 'logistics' || name === 'space')
				.map(({name, subgroups}) => ({name, subgroups})),
			subgroupStartsNewRow: specification.signals.subgroupStartsNewRow,
			assemblingMachineGroup: specification.upgrades.groups.find(({name}) => name === 'assembling-machine'),
			transportBeltUpgrades: specification.upgrades.next.filter(({prototypeType}) =>
				['splitter', 'transport-belt', 'underground-belt'].includes(prototypeType),
			),
			upgradeGroupCount: specification.upgrades.groups.length,
			nextUpgradeCount: specification.upgrades.next.length,
			utilityConstants: specification.utilityConstants,
			styles: specification.styles,
		}).toStrictEqual({
			qualities: [
				{
					name: 'normal',
					label: 'Normal',
					level: 0,
					order: 'a',
					icon: '__base__/graphics/icons/quality-normal.png',
					hidden: false,
					next: 'uncommon',
				},
				{
					name: 'uncommon',
					label: 'Uncommon',
					level: 1,
					order: 'b',
					icon: '__quality__/graphics/icons/quality-uncommon.png',
					hidden: false,
					next: 'rare',
				},
				{
					name: 'rare',
					label: 'Rare',
					level: 2,
					order: 'c',
					icon: '__quality__/graphics/icons/quality-rare.png',
					hidden: false,
					next: 'epic',
				},
				{
					name: 'epic',
					label: 'Epic',
					level: 3,
					order: 'd',
					icon: '__quality__/graphics/icons/quality-epic.png',
					hidden: false,
					next: 'legendary',
				},
				{
					name: 'legendary',
					label: 'Legendary',
					level: 5,
					order: 'e',
					icon: '__quality__/graphics/icons/quality-legendary.png',
					hidden: false,
				},
			],
			qualityComparators: ['>', '<', '=', '≥', '≤', '≠'],
			labels: {
				anyQuality: 'Any quality',
				qualitySelectionTooltip: 'Quality: __1__',
			},
			signalTypeOrder: ['item', 'entity', 'fluid', 'virtual', 'recipe', 'space-location', 'quality'],
			categoryOrder: [
				'logistics',
				'production',
				'intermediate-products',
				'space',
				'combat',
				'fluids',
				'signals',
				'enemies',
				'tiles',
				'environment',
				'effects',
				'other',
			],
			categoryLayouts: [
				{
					name: 'logistics',
					subgroups: [
						{name: 'storage', order: 'a'},
						{name: 'belt', order: 'b'},
						{name: 'inserter', order: 'c'},
						{name: 'energy-pipe-distribution', order: 'd'},
						{name: 'train-transport', order: 'e'},
						{name: 'transport', order: 'f'},
						{name: 'logistic-network', order: 'g'},
						{name: 'circuit-network', order: 'h'},
						{name: 'terrain', order: 'i'},
					],
				},
				{
					name: 'space',
					subgroups: [
						{name: 'space-interactors', order: 'a'},
						{name: 'space-platform', order: 'a'},
						{name: 'space-rocket', order: 'b'},
						{name: 'space-environment', order: 'f'},
						{name: 'space-material', order: 'g'},
						{name: 'space-crushing', order: 'h'},
						{name: 'space-processing', order: 'i'},
						{name: 'planets', order: 'j'},
						{name: 'planet-connections', order: 'k'},
					],
				},
			],
			subgroupStartsNewRow: true,
			assemblingMachineGroup: {
				name: 'assembling-machine',
				members: [
					{prototypeType: 'assembling-machine', name: 'assembling-machine-1'},
					{prototypeType: 'assembling-machine', name: 'assembling-machine-2'},
					{prototypeType: 'assembling-machine', name: 'assembling-machine-3'},
				],
			},
			transportBeltUpgrades: [
				{prototypeType: 'splitter', from: 'splitter', to: 'fast-splitter'},
				{prototypeType: 'splitter', from: 'fast-splitter', to: 'express-splitter'},
				{prototypeType: 'splitter', from: 'express-splitter', to: 'turbo-splitter'},
				{prototypeType: 'transport-belt', from: 'transport-belt', to: 'fast-transport-belt'},
				{prototypeType: 'transport-belt', from: 'fast-transport-belt', to: 'express-transport-belt'},
				{prototypeType: 'transport-belt', from: 'express-transport-belt', to: 'turbo-transport-belt'},
				{prototypeType: 'underground-belt', from: 'underground-belt', to: 'fast-underground-belt'},
				{
					prototypeType: 'underground-belt',
					from: 'fast-underground-belt',
					to: 'express-underground-belt',
				},
				{
					prototypeType: 'underground-belt',
					from: 'express-underground-belt',
					to: 'turbo-underground-belt',
				},
			],
			upgradeGroupCount: 59,
			nextUpgradeCount: 14,
			utilityConstants: {
				selectGroupRowCount: 6,
				selectSlotRowCount: 10,
				qualitySelectorDropdownThreshold: 6,
			},
			styles: {
				slotSize: 40,
				filterGroupTabWidth: 71,
				filterGroupTabHeight: 72,
				filterSlotHorizontalSpacing: 0,
				filterSlotVerticalSpacing: 0,
				signalsTableColumnCount: 10,
				signalsTableMinimumWidth: 400,
				bindings: {
					slotButton: 'slot_button',
					filterSlotTable: 'filter_slot_table',
					deepSlotsScrollPane: 'deep_slots_scroll_pane',
				},
			},
		});
	});
});

describe('game UI source contract', () => {
	it('rejects a stale source blob before reading it', () => {
		const fakeObjectId = '0000000000000000000000000000000000000000';
		const repository: GameUiSourceRepository = {
			resolveCommit: () => sourceLock.commit,
			resolveBlob: () => fakeObjectId,
			readBlob: () => {
				throw new Error('Stale blobs must not be read.');
			},
		};

		expect(() => readPinnedGameUiSources(sourceLock, repository)).toThrow(
			`Factorio source ${sourceLock.sources[0].path} resolved to ${fakeObjectId}, expected pinned blob ${sourceLock.sources[0].blob}.`,
		);
	});

	it('extracts only literal prototype facts from fabricated Lua', () => {
		const source = `
			data:extend({
				{
					type = "quality",
					name = "test-quality",
					order = "a",
					level = 100,
					icon = "__test__/quality.png",
					hidden = false,
					next = "next-test-quality"
				},
				{
					type = computed_type,
					name = "ignored-dynamic-prototype"
				}
			})
		`;

		expect(extractLiteralLuaPrototypes(source)).toStrictEqual([
			{
				type: 'quality',
				name: 'test-quality',
				order: 'a',
				icon: '__test__/quality.png',
				group: undefined,
				level: 100,
				hidden: false,
				next: 'next-test-quality',
				nextUpgrade: undefined,
				fastReplaceableGroup: undefined,
			},
		]);
	});
});
