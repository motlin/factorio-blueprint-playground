import {describe, expect, it} from 'vite-plus/test';

import baseDatasetJson from '../fixtures/factoriolab/2.0.json';
import nextBaseDatasetJson from '../fixtures/factoriolab/2.1.json';
import krastorioDatasetJson from '../fixtures/factoriolab/kr2.json';
import spaceAgeDatasetJson from '../fixtures/factoriolab/spa.json';
import {
	extractHiddenPlaceResults,
	extractPickerSignals,
	extractPrototypeNames,
	extractEntityModuleSlots,
	extractPrototypeUpgrades,
	extractUpgradeModuleItems,
	extractVisiblePlaceResults,
	parseFactorioLabDataset,
	transformDatasets,
} from '../../scripts/mod-db/transform';

describe('transformDatasets', () => {
	it('unions base datasets, subtracts base names, and assigns DLC names to bitmasks', () => {
		const database = transformDatasets({
			baseDatasets: [parseFactorioLabDataset(baseDatasetJson), parseFactorioLabDataset(nextBaseDatasetJson)],
			spaceAgeDataset: parseFactorioLabDataset(spaceAgeDatasetJson),
			modDatasets: [
				{
					id: 'kr2',
					label: 'Krastorio 2',
					dataset: parseFactorioLabDataset(krastorioDatasetJson),
				},
			],
			supplement: {
				base: ['straight-rail', 'signal-A', 'stone-path'],
				spaceAge: ['space-platform-foundation'],
				quality: ['quality-test-name'],
				elevatedRails: ['elevated-straight-rail'],
			},
			mapEditorNames: ['infinity-test-container'],
			spaceAgeMapEditorNames: ['turbo-test-loader'],
			prefixes: {'kr-': 'Krastorio 2'},
			generatedAt: '2000-01-01',
			factoriolabCommit: '0000000000000000000000000000000000000000',
			factorioDataVersion: '0.0.0',
		});

		expect(database).toStrictEqual({
			generatedAt: '2000-01-01',
			factoriolabCommit: '0000000000000000000000000000000000000000',
			factorioDataVersion: '0.0.0',
			license:
				'Data derived from FactorioLab, Copyright (c) 2020-2026 Doug Broad, under the MIT License. https://github.com/factoriolab/factoriolab',
			sources: [
				{id: 'base', label: 'Factorio 2.0 / 2.1'},
				{id: 'space-age', label: 'Space Age', dlc: true},
				{id: 'quality', label: 'Quality', dlc: true},
				{id: 'elevated-rails', label: 'Elevated Rails', dlc: true},
				{id: 'kr2', label: 'Krastorio 2', mods: {Krastorio2: '2.0.0', flib: '1.0.0'}},
				{id: 'map-editor', label: 'Map editor', editor: true},
				{id: 'space-age-map-editor', label: 'Space Age map editor', dlc: true, editor: true},
			],
			names: {
				'assembling-machine-1': 1,
				'elevated-straight-rail': 8,
				foundry: 2,
				legendary: 4,
				nauvis: 1,
				normal: 4,
				'quality-module-3': 4,
				'quality-test-name': 4,
				'rail-ramp': 8,
				'infinity-test-container': 32,
				'kr-test-machine': 16,
				'kr-test-recipe': 16,
				'selector-combinator': 1,
				'shared-name': 1,
				'signal-A': 1,
				'space-platform-foundation': 2,
				'stone-path': 1,
				'straight-rail': 1,
				superconductor: 2,
				'transport-belt': 1,
				'turbo-test-loader': 64,
				vulcanus: 2,
			},
			prefixes: {'kr-': 'Krastorio 2'},
		});
	});

	it('extracts hidden place results from Lua prototype tables', () => {
		const source = `
			data:extend({
				{ type = "item", hidden = true, place_result = "editor-one" },
				{
					type = 'item',
					icons = {{ icon = "icon.png", tint = {1, 0.5, 0.25} }},
					hidden = true,
					place_result = 'editor-two'
				},
				{ type = "item", hidden = false, place_result = "ordinary-item" },
				{ type = "item", hidden = true },
				-- { type = "item", hidden = true, place_result = "commented-out" }
				{ type = "item", name = [[{ hidden = true, place_result = "string-content" }]] }
			})
		`;

		expect(extractHiddenPlaceResults(source)).toStrictEqual(['editor-one', 'editor-two']);
		expect(extractVisiblePlaceResults(source)).toStrictEqual(['ordinary-item']);
	});

	it('extracts table and data.raw next-upgrade assignments from Lua prototypes', () => {
		const sources = [
			`data:extend({
				{
					type = "transport-belt",
					name = "transport-belt",
					animation = { filename = "belt.png" },
					next_upgrade = "fast-transport-belt"
				},
				-- { name = "commented-belt", next_upgrade = "ignored-belt" }
			})`,
			`data.raw["transport-belt"]["fast-transport-belt"].next_upgrade = "express-transport-belt"
			-- data.raw["transport-belt"]["commented-belt"].next_upgrade = "ignored-belt"`,
		];

		expect(extractPrototypeUpgrades(sources)).toStrictEqual([
			{from: 'transport-belt', to: 'fast-transport-belt'},
			{from: 'fast-transport-belt', to: 'express-transport-belt'},
		]);
	});

	it('extracts entity module-slot counts with later definitions overriding earlier ones', () => {
		const sources = [
			`data:extend({
				{
					type = "assembling-machine",
					name = "assembling-machine-2",
					module_slots = 2,
					energy_usage = "150kW"
				},
				{
					type = "furnace",
					name = "stone-furnace",
					result_inventory_size = 1
				},
				{
					type = "lab",
					name = "lab",
					module_slots = 0
				}
			})`,
			`data:extend({
				{
					type = "assembling-machine",
					name = "assembling-machine-2",
					module_slots = 4
				}
			})`,
		];

		expect(extractEntityModuleSlots(sources)).toStrictEqual({'assembling-machine-2': 4});
	});

	it('extracts prototype names in their game-defined order', () => {
		const sources = [
			`data:extend({
				{type = "virtual-signal", name = "signal-blue", order = "b"},
				{type = "item", name = "ignored", order = "a"},
				{type = "virtual-signal", name = "signal-red", order = "a"}
			})`,
		];

		expect(extractPrototypeNames(sources, 'virtual-signal')).toStrictEqual(['signal-red', 'signal-blue']);
	});

	it('extracts picker signals from explicit prototype types without inventing icon sources', () => {
		const sources = [
			`data:extend({
				{type = "item-group", name = "logistics", order = "a"},
				{type = "item-subgroup", name = "belt", group = "logistics", order = "b"},
				{type = "item-subgroup", name = "train-transport", group = "logistics", order = "e"},
				{type = "item", name = "fast-transport-belt", subgroup = "belt", order = "b", stack_size = 100},
				{type = "item", name = "transport-belt", subgroup = "belt", order = "a", stack_size = 100},
				{type = "item", name = "loader", hidden = true, subgroup = "belt", order = "c", stack_size = 50},
				{type = "item-with-entity-data", name = "locomotive", subgroup = "train-transport", order = "a", stack_size = 5},
				{type = "recipe", name = "test-recipe", subgroup = "other", order = "b"},
				{type = "fluid", name = "test-fluid", subgroup = "other", order = "a"},
				{type = "virtual-signal", name = "signal-test", subgroup = "other", order = "c"},
				{type = "planet", name = "test-planet", subgroup = "other", order = "d"},
				{type = "technology", name = "test-technology", subgroup = "other", order = "e"},
				{type = "assembling-machine", name = "excluded-entity", order = "f"}
			})`,
		];

		expect(
			extractPickerSignals(sources, [
				'item',
				'entity',
				'fluid',
				'virtual',
				'recipe',
				'space-location',
				'quality',
			]),
		).toStrictEqual([
			{type: 'item', name: 'transport-belt', group: 'logistics', hidden: false, subgroup: 'belt', order: 'a'},
			{
				type: 'item',
				name: 'fast-transport-belt',
				group: 'logistics',
				hidden: false,
				subgroup: 'belt',
				order: 'b',
			},
			{type: 'item', name: 'loader', group: 'logistics', hidden: true, subgroup: 'belt', order: 'c'},
			{
				type: 'item',
				name: 'locomotive',
				group: 'logistics',
				hidden: false,
				subgroup: 'train-transport',
				order: 'a',
			},
			{type: 'fluid', name: 'test-fluid', group: 'other', hidden: false, subgroup: 'other', order: 'a'},
			{type: 'virtual', name: 'signal-test', group: 'other', hidden: false, subgroup: 'other', order: 'c'},
			{type: 'recipe', name: 'test-recipe', group: 'other', hidden: false, subgroup: 'other', order: 'b'},
			{type: 'item-group', name: 'logistics', group: 'other', hidden: false, subgroup: 'other', order: 'a'},
			{type: 'planet', name: 'test-planet', group: 'other', hidden: false, subgroup: 'other', order: 'd'},
			{
				type: 'technology',
				name: 'test-technology',
				group: 'other',
				hidden: false,
				subgroup: 'other',
				order: 'e',
			},
		]);
	});

	it('prefers prototype layout metadata over nested item references with the same name', () => {
		const sources = [
			`data:extend({
				{type = "item-group", name = "logistics", order = "a"},
				{type = "item-subgroup", name = "belt", group = "logistics", order = "b"},
				{type = "item", name = "transport-belt", subgroup = "belt", order = "a[transport-belt]", stack_size = 100},
				{type = "recipe", name = "transport-belt", results = {{type = "item", name = "transport-belt"}}}
			})`,
		];

		expect(
			extractPickerSignals(sources, [
				'item',
				'entity',
				'fluid',
				'virtual',
				'recipe',
				'space-location',
				'quality',
			]),
		).toStrictEqual([
			{
				type: 'item',
				name: 'transport-belt',
				group: 'logistics',
				hidden: false,
				subgroup: 'belt',
				order: 'a[transport-belt]',
			},
			{
				type: 'recipe',
				name: 'transport-belt',
				group: 'other',
				hidden: false,
				subgroup: 'other',
				order: 'transport-belt',
			},
			{type: 'item-group', name: 'logistics', group: 'other', hidden: false, subgroup: 'other', order: 'a'},
		]);
	});

	it('extracts upgrade modules and the empty-slot sentinel from literal prototype metadata', () => {
		const sources = [
			`data:extend({
				{type = "module", name = "speed-module", subgroup = "module", order = "a"},
				{type = "module", name = "productivity-module", subgroup = "module", order = "b"},
				{type = "item", name = "empty-module-slot", subgroup = "module", order = "z"},
				{type = "item", name = "iron-plate", subgroup = "raw-material", order = "c"}
			})`,
		];

		expect(extractUpgradeModuleItems(sources)).toStrictEqual([
			'speed-module',
			'productivity-module',
			'empty-module-slot',
		]);
	});
});
