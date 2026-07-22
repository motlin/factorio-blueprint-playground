import JSON5 from 'json5';
import {z} from 'zod';

import {deserializeBlueprint} from '../parsing/blueprintParser';
import type {
	Blueprint,
	BlueprintString,
	ItemStack,
	Quality,
	SignalID,
	UpgradeMapping,
	UpgradePlanner,
} from '../parsing/types';
import {mapBlueprints} from './visit';

export type UpgradeDirection = 'upgrade' | 'downgrade';

export interface UpgradeRule {
	from: SignalID;
	to: SignalID;
}

export interface UpgradeCandidate extends UpgradeRule {
	count: number;
}

export interface UpgradePlannerSource {
	label: string;
	path: string;
	planner: UpgradePlanner;
}

const qualitySchema = z.enum(['normal', 'uncommon', 'rare', 'epic', 'legendary']);
const signalSchema = z.object({
	type: z.enum(['item', 'entity']).optional(),
	name: z.string().min(1),
	quality: qualitySchema.optional(),
});
const upgradeMappingSchema = z.object({
	from: signalSchema.optional(),
	to: signalSchema.optional(),
	index: z.number().int().nonnegative(),
});
const upgradePlannerSchema = z.object({
	item: z.literal('upgrade-planner'),
	label: z.string().optional(),
	version: z.number(),
	settings: z.object({
		description: z.string().optional(),
		icons: z.array(z.object({signal: signalSchema, index: z.number().int().positive()})).optional(),
		mappers: z.array(upgradeMappingSchema),
	}),
});
const upgradePlannerStringSchema = z.object({upgrade_planner: upgradePlannerSchema});

const NEXT_UPGRADE_RULES: readonly UpgradeRule[] = [
	{from: {type: 'entity', name: 'transport-belt'}, to: {type: 'entity', name: 'fast-transport-belt'}},
	{from: {type: 'entity', name: 'fast-transport-belt'}, to: {type: 'entity', name: 'express-transport-belt'}},
	{from: {type: 'entity', name: 'express-transport-belt'}, to: {type: 'entity', name: 'turbo-transport-belt'}},
	{from: {type: 'entity', name: 'underground-belt'}, to: {type: 'entity', name: 'fast-underground-belt'}},
	{from: {type: 'entity', name: 'fast-underground-belt'}, to: {type: 'entity', name: 'express-underground-belt'}},
	{from: {type: 'entity', name: 'express-underground-belt'}, to: {type: 'entity', name: 'turbo-underground-belt'}},
	{from: {type: 'entity', name: 'splitter'}, to: {type: 'entity', name: 'fast-splitter'}},
	{from: {type: 'entity', name: 'fast-splitter'}, to: {type: 'entity', name: 'express-splitter'}},
	{from: {type: 'entity', name: 'express-splitter'}, to: {type: 'entity', name: 'turbo-splitter'}},
	{from: {type: 'entity', name: 'inserter'}, to: {type: 'entity', name: 'fast-inserter'}},
	{from: {type: 'entity', name: 'fast-inserter'}, to: {type: 'entity', name: 'bulk-inserter'}},
	{from: {type: 'entity', name: 'stone-furnace'}, to: {type: 'entity', name: 'steel-furnace'}},
	{from: {type: 'entity', name: 'assembling-machine-1'}, to: {type: 'entity', name: 'assembling-machine-2'}},
	{from: {type: 'entity', name: 'assembling-machine-2'}, to: {type: 'entity', name: 'assembling-machine-3'}},
];
const SPACE_AGE_TARGETS = new Set(['turbo-transport-belt', 'turbo-underground-belt', 'turbo-splitter']);

function supportedSignalType(signal: SignalID): 'item' | 'entity' | undefined {
	const type = signal.type ?? 'item';
	if (type !== 'item' && type !== 'entity') {
		return undefined;
	}
	return type;
}

function normalizedQuality(quality: Quality): Exclude<Quality, undefined> {
	return quality ?? 'normal';
}

function signalLookupKey(signal: SignalID): string | undefined {
	const type = supportedSignalType(signal);
	return type === undefined ? undefined : [type, signal.name, normalizedQuality(signal.quality)].join(':');
}

function requiredSignalType(signal: SignalID): 'item' | 'entity' {
	const type = supportedSignalType(signal);
	if (type === undefined) {
		throw new Error(`Unsupported upgrade planner signal type: ${signal.type ?? 'item'}`);
	}
	return type;
}

function requiredSignalKey(signal: SignalID): string {
	return [requiredSignalType(signal), signal.name, normalizedQuality(signal.quality)].join(':');
}

export function upgradeRuleKey(rule: UpgradeRule): string {
	return `${requiredSignalKey(rule.from)}:${requiredSignalKey(rule.to)}`;
}

function targetQuality(signal: SignalID): Quality {
	return normalizedQuality(signal.quality) === 'normal' ? undefined : signal.quality;
}

function mappingToRule(mapping: UpgradeMapping): UpgradeRule {
	if (mapping.from === undefined || mapping.to === undefined) {
		throw new Error(`Upgrade planner mapping ${mapping.index.toString()} must define both from and to.`);
	}
	if (requiredSignalType(mapping.from) !== requiredSignalType(mapping.to)) {
		throw new Error(`Upgrade planner mapping ${mapping.index.toString()} cannot change signal types.`);
	}
	return {from: mapping.from, to: mapping.to};
}

function validateRules(rules: readonly UpgradeRule[]): UpgradeRule[] {
	const sourceKeys = new Set<string>();
	return rules.map((rule) => {
		const key = requiredSignalKey(rule.from);
		if (sourceKeys.has(key)) {
			throw new Error(`Upgrade planner defines more than one target for ${rule.from.name}.`);
		}
		sourceKeys.add(key);
		return rule;
	});
}

export function builtInUpgradeRules(direction: UpgradeDirection, includeSpaceAge = false): UpgradeRule[] {
	const availableRules =
		direction === 'upgrade' && !includeSpaceAge
			? NEXT_UPGRADE_RULES.filter((rule) => !SPACE_AGE_TARGETS.has(rule.to.name))
			: NEXT_UPGRADE_RULES;
	const rules = availableRules.map((rule) => (direction === 'upgrade' ? rule : {from: rule.to, to: rule.from}));
	return validateRules(rules);
}

export function rulesFromUpgradePlanner(plannerInput: UpgradePlanner): UpgradeRule[] {
	const planner = upgradePlannerSchema.parse(plannerInput);
	if (planner.settings.mappers.length === 0) {
		return builtInUpgradeRules('upgrade');
	}
	return validateRules(
		[...planner.settings.mappers].sort((first, second) => first.index - second.index).map(mappingToRule),
	);
}

export function parseUpgradePlanner(input: string): UpgradePlanner {
	const trimmedInput = input.trim();
	if (trimmedInput === '') {
		throw new Error('Paste an upgrade planner string or JSON.');
	}
	const parsed: unknown = trimmedInput.startsWith('0')
		? deserializeBlueprint(trimmedInput)
		: JSON5.parse(trimmedInput);
	return upgradePlannerStringSchema.parse(parsed).upgrade_planner;
}

function applySignalRule(signal: SignalID, rules: ReadonlyMap<string, UpgradeRule>): SignalID {
	const key = signalLookupKey(signal);
	if (key === undefined) {
		return signal;
	}
	const rule = rules.get(key);
	if (rule === undefined) {
		return signal;
	}
	const mappedSignal: SignalID = {...signal, type: rule.to.type, name: rule.to.name, quality: targetQuality(rule.to)};
	if (mappedSignal.type === undefined) {
		delete mappedSignal.type;
	}
	if (mappedSignal.quality === undefined) {
		delete mappedSignal.quality;
	}
	return mappedSignal;
}

function applyItemRules(
	items: ItemStack[] | undefined,
	rules: ReadonlyMap<string, UpgradeRule>,
): ItemStack[] | undefined {
	return items?.map((item) => {
		const mappedItem = applySignalRule({type: 'item', ...item.id}, rules);
		const id = {name: mappedItem.name, quality: mappedItem.quality};
		if (id.quality === undefined) {
			delete id.quality;
		}
		return {...item, id};
	});
}

function applyRulesToBlueprint(blueprint: Blueprint, rules: ReadonlyMap<string, UpgradeRule>): Blueprint {
	const entities = blueprint.entities?.map((entity) => {
		const mappedEntity = applySignalRule({type: 'entity', name: entity.name, quality: entity.quality}, rules);
		const result = {
			...entity,
			name: mappedEntity.name,
			quality: mappedEntity.quality,
			items: applyItemRules(entity.items, rules),
		};
		if (result.quality === undefined) {
			delete result.quality;
		}
		if (result.items === undefined) {
			delete result.items;
		}
		return result;
	});
	const icons = blueprint.icons?.map((icon) => ({...icon, signal: applySignalRule(icon.signal, rules)}));
	const result = {...blueprint, entities, icons};
	if (result.entities === undefined) {
		delete result.entities;
	}
	if (result.icons === undefined) {
		delete result.icons;
	}
	return result;
}

export function applyUpgradeRules(root: BlueprintString, rules: readonly UpgradeRule[]): BlueprintString {
	const validatedRules = validateRules(rules);
	const ruleLookup = new Map(validatedRules.map((rule) => [requiredSignalKey(rule.from), rule]));
	return mapBlueprints(root, (blueprint) => applyRulesToBlueprint(blueprint, ruleLookup));
}

function itemCount(item: ItemStack): number {
	return item.items.in_inventory.reduce((total, inventoryItem) => total + (inventoryItem.count ?? 1), 0);
}

export function analyzeUpgradeRules(root: BlueprintString, rules: readonly UpgradeRule[]): UpgradeCandidate[] {
	const validatedRules = validateRules(rules);
	const counts = new Map(validatedRules.map((rule) => [requiredSignalKey(rule.from), 0]));
	mapBlueprints(root, (blueprint) => {
		for (const entity of blueprint.entities ?? []) {
			const entityKey = requiredSignalKey({type: 'entity', name: entity.name, quality: entity.quality});
			if (counts.has(entityKey)) {
				counts.set(entityKey, (counts.get(entityKey) ?? 0) + 1);
			}
			for (const item of entity.items ?? []) {
				const itemKey = requiredSignalKey({type: 'item', ...item.id});
				if (counts.has(itemKey)) {
					counts.set(itemKey, (counts.get(itemKey) ?? 0) + itemCount(item));
				}
			}
		}
		return blueprint;
	});
	return validatedRules.flatMap((rule) => {
		const count = counts.get(requiredSignalKey(rule.from)) ?? 0;
		return count === 0 ? [] : [{...rule, count}];
	});
}

export function findUpgradePlanners(root: BlueprintString): UpgradePlannerSource[] {
	const planners: UpgradePlannerSource[] = [];
	const visit = (current: BlueprintString, path: string) => {
		if (current.upgrade_planner !== undefined) {
			planners.push({
				path,
				label:
					current.upgrade_planner.label ??
					(path === '' ? 'Current upgrade planner' : `Upgrade planner at ${path}`),
				planner: current.upgrade_planner,
			});
		}
		current.blueprint_book?.blueprints.forEach((child, index) => {
			visit(child, path === '' ? (index + 1).toString() : `${path}.${(index + 1).toString()}`);
		});
	};
	visit(root, '');
	return planners;
}
