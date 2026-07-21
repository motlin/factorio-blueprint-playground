import type {ModSource} from '../../src/parsing/modDetection/types';

export const FACTORIOLAB_COMMIT = '0490123d82626d9453a0b50c531a391088d73361';

export const FACTORIOLAB_DATASETS = [
	{id: '2.0', role: 'base'},
	{id: '2.1', role: 'base'},
	{id: 'spa', role: 'space-age'},
	{id: 'kr2', role: 'mod', label: 'Krastorio 2'},
	{id: 'kr2sxp', role: 'mod', label: 'Krastorio 2 + Space Exploration'},
	{id: 'sxp', role: 'mod', label: 'Space Exploration'},
	{id: 'bob', role: 'mod', label: "Bob's Mods"},
	{id: 'bobang', role: 'mod', label: "Bob's & Angel's"},
	{id: 'pys', role: 'mod', label: 'Pyanodons'},
	{id: 'pysalf', role: 'mod', label: 'Pyanodons + Alien Life'},
	{id: 'ir3', role: 'mod', label: 'Industrial Revolution 3'},
	{id: 'aai', role: 'mod', label: 'AAI Industry'},
	{id: 'nls', role: 'mod', label: 'Nullius'},
	{id: 'sea', role: 'mod', label: 'Sea Block'},
	{id: '2x1', role: 'mod', label: 'Space Age 2.0'},
] as const;

export const FACTORIOLAB_LICENSE =
	'Data derived from FactorioLab, Copyright (c) 2020-2026 Doug Broad, under the MIT License. https://github.com/factoriolab/factoriolab';

export const MOD_SOURCES = [
	{id: 'base', label: 'Factorio 2.0 / 2.1'},
	{id: 'space-age', label: 'Space Age', dlc: true},
	{id: 'quality', label: 'Quality', dlc: true},
	{id: 'elevated-rails', label: 'Elevated Rails', dlc: true},
] satisfies ModSource[];

export const EDITOR_SOURCES = [
	{id: 'map-editor', label: 'Map editor', editor: true},
	{id: 'space-age-map-editor', label: 'Space Age map editor', dlc: true, editor: true},
] satisfies ModSource[];
