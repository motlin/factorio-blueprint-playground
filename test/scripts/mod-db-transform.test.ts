import {describe, expect, it} from 'vite-plus/test';

import legacyDatasetJson from '../fixtures/factoriolab/1.1.json';
import baseDatasetJson from '../fixtures/factoriolab/2.0.json';
import nextBaseDatasetJson from '../fixtures/factoriolab/2.1.json';
import krastorioDatasetJson from '../fixtures/factoriolab/kr2.json';
import spaceAgeDatasetJson from '../fixtures/factoriolab/spa.json';
import {
	extractHiddenPlaceResults,
	extractPrototypeNames,
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

		expect(extractPrototypeNames(source)).toStrictEqual([
			'entity-ghost',
			'long-string-name',
			'tile-ghost',
			'tree-with-results',
		]);
	});
});
