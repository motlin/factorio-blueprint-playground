import {describe, expect, it} from 'vite-plus/test';

import baseDatasetJson from '../fixtures/factoriolab/2.0.json';
import nextBaseDatasetJson from '../fixtures/factoriolab/2.1.json';
import spaceAgeDatasetJson from '../fixtures/factoriolab/spa.json';
import {parseFactorioLabDataset, transformDatasets} from '../../scripts/mod-db/transform';

describe('transformDatasets', () => {
	it('unions base datasets, subtracts base names, and assigns DLC names to bitmasks', () => {
		const database = transformDatasets({
			baseDatasets: [parseFactorioLabDataset(baseDatasetJson), parseFactorioLabDataset(nextBaseDatasetJson)],
			spaceAgeDataset: parseFactorioLabDataset(spaceAgeDatasetJson),
			supplement: {
				base: ['straight-rail', 'signal-A', 'stone-path'],
				spaceAge: ['space-platform-foundation'],
				quality: ['quality-test-name'],
				elevatedRails: ['elevated-straight-rail'],
			},
			prefixes: {'kr-': 'Krastorio 2'},
			generatedAt: '2000-01-01',
			factoriolabCommit: '0000000000000000000000000000000000000000',
		});

		expect(database).toStrictEqual({
			generatedAt: '2000-01-01',
			factoriolabCommit: '0000000000000000000000000000000000000000',
			license:
				'Data derived from FactorioLab, Copyright (c) 2020-2026 Doug Broad, under the MIT License. https://github.com/factoriolab/factoriolab',
			sources: [
				{id: 'base', label: 'Factorio 2.0 / 2.1'},
				{id: 'space-age', label: 'Space Age', dlc: true},
				{id: 'quality', label: 'Quality', dlc: true},
				{id: 'elevated-rails', label: 'Elevated Rails', dlc: true},
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
				'selector-combinator': 1,
				'shared-name': 1,
				'signal-A': 1,
				'space-platform-foundation': 2,
				'stone-path': 1,
				'straight-rail': 1,
				superconductor: 2,
				'transport-belt': 1,
				vulcanus: 2,
			},
			prefixes: {'kr-': 'Krastorio 2'},
		});
	});
});
