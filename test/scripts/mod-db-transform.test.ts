import {describe, expect, it} from 'vite-plus/test';

import legacyDatasetJson from '../fixtures/factoriolab/1.1.json';
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
	extractTopLevelPrototypeNames,
	extractUpgradeFuelItems,
	extractUpgradeModuleItems,
	extractVisiblePlaceResults,
	parseFactorioLabDataset,
	transformDatasets,
} from '../../scripts/mod-db/transform';

describe('transformDatasets', () => {
	it('unions base datasets, subtracts base names, and assigns DLC names to bitmasks', () => {
		const database = transformDatasets({
			baseDatasets: [parseFactorioLabDataset(baseDatasetJson), parseFactorioLabDataset(nextBaseDatasetJson)],
			spaceAgeDatasets: [
				parseFactorioLabDataset(spaceAgeDatasetJson),
				parseFactorioLabDataset({
					version: {base: '2.0.0', 'space-age': '2.0.0'},
					items: [],
					recipes: [{id: 'iron-ore-melting'}, {id: 'foundry'}],
				}),
			],
			legacyDatasets: [parseFactorioLabDataset(legacyDatasetJson)],
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
				legacy: ['science-pack-1'],
			},
			mapEditorNames: ['infinity-test-container'],
			spaceAgeMapEditorNames: ['turbo-test-loader'],
			prototypeNames: {
				base: ['entity-ghost', 'infinity-test-container'],
				spaceAge: ['entity-ghost', 'space-test-entity', 'turbo-test-loader'],
				quality: ['signal-any-quality'],
			},
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
				{id: 'base-1.1', label: 'Factorio 1.1 and earlier'},
				{id: 'kr2', label: 'Krastorio 2', mods: {Krastorio2: '2.0.0', flib: '1.0.0'}},
				{id: 'map-editor', label: 'Map editor', editor: true},
				{id: 'space-age-map-editor', label: 'Space Age map editor', dlc: true, editor: true},
			],
			names: {
				'assembling-machine-1': 1,
				'elevated-straight-rail': 8,
				'entity-ghost': 1,
				'filter-inserter': 16,
				foundry: 2,
				'iron-ore-melting': 2,
				legendary: 4,
				nauvis: 1,
				normal: 4,
				'quality-module-3': 4,
				'quality-test-name': 4,
				'rail-ramp': 8,
				'infinity-test-container': 64,
				'kr-test-machine': 32,
				'kr-test-recipe': 32,
				'science-pack-1': 16,
				'selector-combinator': 1,
				'shared-name': 1,
				'signal-A': 1,
				'signal-any-quality': 4,
				'space-platform-foundation': 2,
				'space-test-entity': 2,
				'stone-path': 1,
				'straight-rail': 1,
				superconductor: 2,
				'transport-belt': 17,
				'turbo-test-loader': 128,
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

	it('extracts literal prototype names from top-level Lua prototype tables', () => {
		const source = `
			data:extend({
				{ type = "entity-ghost", name = "entity-ghost", icon = "ghost.png" },
				{
					name = 'tile-ghost',
					flags = {"not-on-map"},
					type = 'tile-ghost'
				},
				{
					type = "tree",
					name = "tree-with-results",
					minable = { results = {{ type = "item", name = "nested-result", amount = 4 }} }
				},
				{ type = "tree", name = "tree-" .. variation },
				{ type = "explosion" },
				-- { type = "entity-ghost", name = "commented-out" }
				{ type = "item", name = [[long-string-name]] }
			})
		`;

		expect(extractTopLevelPrototypeNames(source)).toStrictEqual([
			'entity-ghost',
			'long-string-name',
			'tile-ghost',
			'tree-with-results',
		]);
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

	it('extracts non-hidden fueled item prototypes and skips fluids', () => {
		const sources = [
			`data:extend({
				{type = "item", name = "coal", fuel_value = "4MJ", stack_size = 50},
				{type = "item", name = "solid-fuel", fuel_value = "12MJ", stack_size = 50},
				{type = "item", name = "hidden-fuel", fuel_value = "1MJ", hidden = true},
				{type = "fluid", name = "crude-oil", fuel_value = "100kJ"},
				{type = "item", name = "iron-plate", stack_size = 100}
			})`,
		];

		expect(extractUpgradeFuelItems(sources)).toStrictEqual(['coal', 'solid-fuel']);
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
