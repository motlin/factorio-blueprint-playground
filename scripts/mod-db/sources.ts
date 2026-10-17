import {z} from 'zod';

import type {ModSource} from '../../src/parsing/modDetection/types';

const commitSchema = z.string().regex(/^[0-9a-f]{40}$/);

const sourceLockSchema = z.object({
	factorioLab: z.object({
		commit: commitSchema,
		committedAt: z.iso.datetime(),
	}),
	factorioData: z.object({
		version: z.string().regex(/^\d+\.\d+\.\d+$/),
		commit: commitSchema,
	}),
});

export type SourceLock = z.infer<typeof sourceLockSchema>;

export function parseSourceLock(value: unknown): SourceLock {
	return sourceLockSchema.parse(value);
}

export const FACTORIOLAB_DATASETS = [
	{id: '2.0', role: 'base'},
	{id: '2.1', role: 'base'},
	{id: '1.0', role: 'legacy'},
	{id: '1.1', role: 'legacy'},
	{id: 'spa', role: 'space-age'},
	// Space Age with the recipe names Factorio 2.1 introduces, such as iron-ore-melting.
	{id: '2x1', role: 'space-age'},
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
] as const;

// Prototype definitions whose literal names FactorioLab omits: entities, tiles, fluids, signals, and tool items.
// Names that Lua builds at load time live in base-supplement.json instead.
export const FACTORIO_DATA_PROTOTYPE_FILES = {
	base: [
		'core/prototypes/unknown.lua',
		'base/prototypes/item.lua',
		'base/prototypes/tile/tiles.lua',
		'base/prototypes/decorative/decoratives.lua',
		'base/prototypes/entity/circuit-network.lua',
		'base/prototypes/entity/crash-site.lua',
		'base/prototypes/entity/enemies.lua',
		'base/prototypes/entity/entities.lua',
		'base/prototypes/entity/factorio-logo.lua',
		'base/prototypes/entity/fire.lua',
		'base/prototypes/entity/flying-robots.lua',
		'base/prototypes/entity/mining-drill.lua',
		'base/prototypes/entity/resources.lua',
		'base/prototypes/entity/trains.lua',
		'base/prototypes/entity/transport-belts.lua',
		'base/prototypes/entity/trees.lua',
		'base/prototypes/entity/turrets.lua',
	],
	spaceAge: [
		'space-age/prototypes/fluid.lua',
		'space-age/prototypes/item.lua',
		'space-age/prototypes/tile/tiles.lua',
		'space-age/prototypes/tile/tiles-aquilo.lua',
		'space-age/prototypes/tile/tiles-fulgora.lua',
		'space-age/prototypes/tile/tiles-gleba.lua',
		'space-age/prototypes/tile/tiles-vulcanus.lua',
		'space-age/prototypes/decorative/decoratives.lua',
		'space-age/prototypes/decorative/decoratives-aquilo.lua',
		'space-age/prototypes/decorative/decoratives-fulgora.lua',
		'space-age/prototypes/decorative/decoratives-gleba.lua',
		'space-age/prototypes/decorative/decoratives-vulcanus.lua',
		'space-age/prototypes/entity/big-mining-drill.lua',
		'space-age/prototypes/entity/enemies.lua',
		'space-age/prototypes/entity/entities.lua',
		'space-age/prototypes/entity/flying-robots.lua',
		'space-age/prototypes/entity/plants.lua',
		'space-age/prototypes/entity/resources.lua',
		'space-age/prototypes/entity/transport-belts.lua',
		'space-age/prototypes/entity/trees.lua',
		'space-age/prototypes/entity/turrets.lua',
	],
	quality: ['quality/prototypes/signal.lua'],
} as const;

export const FACTORIOLAB_LICENSE =
	'Data derived from FactorioLab, Copyright (c) 2020-2026 Doug Broad, under the MIT License. https://github.com/factoriolab/factoriolab';

export const MOD_SOURCES = [
	{id: 'base', label: 'Factorio 2.0 / 2.1'},
	{id: 'space-age', label: 'Space Age', dlc: true},
	{id: 'quality', label: 'Quality', dlc: true},
	{id: 'elevated-rails', label: 'Elevated Rails', dlc: true},
	{id: 'base-1.1', label: 'Factorio 1.1 and earlier'},
] satisfies ModSource[];

export const EDITOR_SOURCES = [
	{id: 'map-editor', label: 'Map editor', editor: true},
	{id: 'space-age-map-editor', label: 'Space Age map editor', dlc: true, editor: true},
] satisfies ModSource[];
