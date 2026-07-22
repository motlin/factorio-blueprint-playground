import JSON5 from 'json5';
import {z} from 'zod';

import {deserializeBlueprint} from '../parsing/blueprintParser';
import gameData from '../generated/game-data.json';
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
	preserveQuality: boolean;
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

interface UpgradeRuleLookup {
	exact: ReadonlyMap<string, UpgradeRule>;
	preserving: ReadonlyMap<string, UpgradeRule>;
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

const NEXT_UPGRADE_RULES: readonly UpgradeRule[] = gameData.nextUpgrades.map(({from, to}) => ({
	from: {type: 'entity', name: from},
	preserveQuality: true,
	to: {type: 'entity', name: to},
}));

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

function upgradeRuleKey(rule: UpgradeRule): string {
	return `${requiredSignalKey(rule.from)}:${requiredSignalKey(rule.to)}`;
}

function qualityAgnosticSignalKey(signal: SignalID): string {
	return [requiredSignalType(signal), signal.name].join(':');
}

function targetQuality(signal: SignalID, rule: UpgradeRule): Quality {
	if (rule.preserveQuality) {
		return signal.quality;
	}
	return normalizedQuality(rule.to.quality) === 'normal' ? undefined : rule.to.quality;
}

function mappingToRule(mapping: UpgradeMapping): UpgradeRule {
	if (mapping.from === undefined || mapping.to === undefined) {
		throw new Error(`Upgrade planner mapping ${mapping.index.toString()} must define both from and to.`);
	}
	if (requiredSignalType(mapping.from) !== requiredSignalType(mapping.to)) {
		throw new Error(`Upgrade planner mapping ${mapping.index.toString()} cannot change signal types.`);
	}
	return {from: mapping.from, preserveQuality: false, to: mapping.to};
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

export function builtInUpgradeRules(direction: UpgradeDirection): UpgradeRule[] {
	const rules = NEXT_UPGRADE_RULES.map((rule) =>
		direction === 'upgrade' ? rule : {from: rule.to, preserveQuality: rule.preserveQuality, to: rule.from},
	);
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

function findSignalRule(signal: SignalID, rules: UpgradeRuleLookup): UpgradeRule | undefined {
	const key = signalLookupKey(signal);
	if (key === undefined) {
		return undefined;
	}
	return rules.exact.get(key) ?? rules.preserving.get(qualityAgnosticSignalKey(signal));
}

function mappedSignal(signal: SignalID, rule: UpgradeRule, type: SignalID['type'] = rule.to.type): SignalID {
	const mappedSignal: SignalID = {...signal, type, name: rule.to.name, quality: targetQuality(signal, rule)};
	if (mappedSignal.type === undefined) {
		delete mappedSignal.type;
	}
	if (mappedSignal.quality === undefined) {
		delete mappedSignal.quality;
	}
	return mappedSignal;
}

function applySignalRule(signal: SignalID, rules: UpgradeRuleLookup): SignalID {
	const rule = findSignalRule(signal, rules);
	if (rule === undefined) {
		return signal;
	}
	return mappedSignal(signal, rule);
}

function applyIconRule(signal: SignalID, rules: UpgradeRuleLookup): SignalID {
	const directRule = findSignalRule(signal, rules);
	if (directRule !== undefined) {
		return mappedSignal(signal, directRule);
	}
	if ((signal.type ?? 'item') !== 'item') {
		return signal;
	}
	const entityRule = findSignalRule({...signal, type: 'entity'}, rules);
	return entityRule === undefined ? signal : mappedSignal(signal, entityRule, signal.type);
}

function applyItemRules(items: ItemStack[] | undefined, rules: UpgradeRuleLookup): ItemStack[] | undefined {
	return items?.map((item) => {
		const mappedItem = applySignalRule({type: 'item', ...item.id}, rules);
		const id = {name: mappedItem.name, quality: mappedItem.quality};
		if (id.quality === undefined) {
			delete id.quality;
		}
		return {...item, id};
	});
}

function applyRulesToBlueprint(blueprint: Blueprint, rules: UpgradeRuleLookup): Blueprint {
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
	const icons = blueprint.icons?.map((icon) => ({...icon, signal: applyIconRule(icon.signal, rules)}));
	const result = {...blueprint, entities, icons};
	if (result.entities === undefined) {
		delete result.entities;
	}
	if (result.icons === undefined) {
		delete result.icons;
	}
	return result;
}

function createRuleLookup(rules: readonly UpgradeRule[]): UpgradeRuleLookup {
	return {
		exact: new Map(
			rules.filter((rule) => !rule.preserveQuality).map((rule) => [requiredSignalKey(rule.from), rule]),
		),
		preserving: new Map(
			rules.filter((rule) => rule.preserveQuality).map((rule) => [qualityAgnosticSignalKey(rule.from), rule]),
		),
	};
}

export function applyUpgradeRules(root: BlueprintString, rules: readonly UpgradeRule[]): BlueprintString {
	const validatedRules = validateRules(rules);
	const ruleLookup = createRuleLookup(validatedRules);
	return mapBlueprints(root, (blueprint) => applyRulesToBlueprint(blueprint, ruleLookup));
}

function itemCount(item: ItemStack): number {
	return item.items.in_inventory.reduce((total, inventoryItem) => total + (inventoryItem.count ?? 1), 0);
}

export function analyzeUpgradeRules(root: BlueprintString, rules: readonly UpgradeRule[]): UpgradeCandidate[] {
	const validatedRules = validateRules(rules);
	const ruleLookup = createRuleLookup(validatedRules);
	const counts = new Map(validatedRules.map((rule) => [upgradeRuleKey(rule), 0]));
	const addCount = (signal: SignalID, count: number) => {
		const rule = findSignalRule(signal, ruleLookup);
		if (rule === undefined) {
			return;
		}
		const key = upgradeRuleKey(rule);
		counts.set(key, (counts.get(key) ?? 0) + count);
	};
	mapBlueprints(root, (blueprint) => {
		for (const entity of blueprint.entities ?? []) {
			addCount({type: 'entity', name: entity.name, quality: entity.quality}, 1);
			for (const item of entity.items ?? []) {
				addCount({type: 'item', ...item.id}, itemCount(item));
			}
		}
		return blueprint;
	});
	return validatedRules.flatMap((rule) => {
		const count = counts.get(upgradeRuleKey(rule)) ?? 0;
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
