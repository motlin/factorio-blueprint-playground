import {parseVersion4} from '../blueprintParser';
import type {
	Blueprint,
	BlueprintString,
	DeconstructionPlanner,
	Entity,
	Filter,
	Icon,
	Parameter,
	Quality,
	SignalID,
	UpgradePlanner,
} from '../types';
import type {ExtractedNames, ExtractionFlags, NameKind} from './types';

interface ExtractionState {
	names: ExtractedNames['names'];
	flags: ExtractionFlags;
}

interface SignalCondition {
	first_signal?: SignalID;
	second_signal?: SignalID;
}

function addName(state: ExtractionState, name: string, kind: NameKind): void {
	const existing = state.names.get(name);
	if (existing) {
		existing.kinds.add(kind);
		existing.count += 1;
		return;
	}

	state.names.set(name, {kinds: new Set([kind]), count: 1});
}

function recordQuality(state: ExtractionState, quality: Quality): void {
	if (quality !== undefined && quality !== 'normal') {
		state.flags.hasNonNormalQuality = true;
	}
}

function addSignal(state: ExtractionState, signal: SignalID | undefined): void {
	if (!signal) {
		return;
	}

	addName(state, signal.name, 'signal');
	recordQuality(state, signal.quality);
	if (signal.type === 'quality' && signal.name !== 'normal') {
		state.flags.hasNonNormalQuality = true;
	}
	if (signal.type === 'planet') {
		state.flags.hasPlanetSignals = true;
	}
	if (signal.type === 'space-location') {
		state.flags.hasSpaceLocationSignals = true;
	}
}

function addIcons(state: ExtractionState, icons: Icon[] | undefined): void {
	for (const icon of icons ?? []) {
		addSignal(state, icon.signal);
	}
}

function addFilters(state: ExtractionState, filters: Filter[] | undefined, kind: NameKind): void {
	for (const filter of filters ?? []) {
		addName(state, filter.name, kind);
		recordQuality(state, filter.quality);
	}
}

function addCondition(state: ExtractionState, condition: SignalCondition | undefined): void {
	if (!condition) {
		return;
	}

	addSignal(state, condition.first_signal);
	addSignal(state, condition.second_signal);
}

function walkControlBehavior(state: ExtractionState, behavior: NonNullable<Entity['control_behavior']>): void {
	addCondition(state, behavior.circuit_condition);
	addCondition(state, behavior.logistic_condition);

	for (const condition of behavior.decider_conditions?.conditions ?? []) {
		addCondition(state, condition);
	}
	for (const output of behavior.decider_conditions?.outputs ?? []) {
		addSignal(state, output.signal);
	}

	const arithmetic = behavior.arithmetic_conditions;
	if (arithmetic) {
		addSignal(state, arithmetic.first_signal);
		addSignal(state, arithmetic.second_signal);
		addSignal(state, arithmetic.output_signal);
	}

	addSignal(state, behavior.train_stopped_signal);
	addSignal(state, behavior.red_signal);
	addSignal(state, behavior.green_signal);
	addSignal(state, behavior.blue_signal);

	for (const parameter of behavior.parameters ?? []) {
		addSignal(state, parameter.condition.first_signal);
		addSignal(state, parameter.icon);
	}

	for (const section of behavior.sections?.sections ?? []) {
		addFilters(state, section.filters, 'item');
	}
}

function walkEntity(state: ExtractionState, entity: Entity): void {
	addName(state, entity.name, 'entity');
	recordQuality(state, entity.quality);

	if (entity.recipe !== undefined) {
		addName(state, entity.recipe, 'recipe');
	}
	recordQuality(state, entity.recipe_quality);
	addFilters(state, entity.filters, 'item');

	for (const section of entity.request_filters?.sections ?? []) {
		addFilters(state, section.filters, 'item');
	}

	for (const itemStack of entity.items ?? []) {
		addName(state, itemStack.id.name, 'item');
		recordQuality(state, itemStack.id.quality);
	}

	addSignal(state, entity.icon);
	if (entity.control_behavior) {
		walkControlBehavior(state, entity.control_behavior);
	}
}

function walkParameters(state: ExtractionState, parameters: Parameter[] | undefined): void {
	for (const parameter of parameters ?? []) {
		if (parameter.type === 'id' && parameter.id !== undefined) {
			addName(state, parameter.id, 'any');
		}
		if (parameter['ingredient-of'] !== undefined) {
			addName(state, parameter['ingredient-of'], 'any');
		}
		recordQuality(state, parameter['quality-condition']?.quality);
	}
}

function walkBlueprint(state: ExtractionState, blueprint: Blueprint): void {
	addIcons(state, blueprint.icons);
	for (const entity of blueprint.entities ?? []) {
		walkEntity(state, entity);
	}
	for (const tile of blueprint.tiles ?? []) {
		addName(state, tile.name, 'tile');
	}
	for (const schedule of blueprint.schedules ?? []) {
		for (const record of schedule.schedule.records) {
			for (const waitCondition of record.wait_conditions) {
				addCondition(state, waitCondition.condition);
			}
		}
	}
	walkParameters(state, blueprint.parameters);
}

function walkUpgradePlanner(state: ExtractionState, planner: UpgradePlanner): void {
	addIcons(state, planner.settings.icons);
	for (const mapper of planner.settings.mappers) {
		addSignal(state, mapper.from);
		addSignal(state, mapper.to);
	}
}

function walkDeconstructionPlanner(state: ExtractionState, planner: DeconstructionPlanner): void {
	addIcons(state, planner.settings.icons);
	addFilters(state, planner.settings.entity_filters, 'entity');
	addFilters(state, planner.settings.tile_filters, 'tile');
}

function walkBlueprintString(state: ExtractionState, blueprintString: BlueprintString): void {
	if (blueprintString.blueprint) {
		walkBlueprint(state, blueprintString.blueprint);
	}

	if (blueprintString.blueprint_book) {
		addIcons(state, blueprintString.blueprint_book.icons);
		for (const child of blueprintString.blueprint_book.blueprints) {
			walkBlueprintString(state, child);
		}
	}

	if (blueprintString.upgrade_planner) {
		walkUpgradePlanner(state, blueprintString.upgrade_planner);
	}

	if (blueprintString.deconstruction_planner) {
		walkDeconstructionPlanner(state, blueprintString.deconstruction_planner);
	}
}

function extractVersion(blueprintString: BlueprintString): string | undefined {
	const version =
		blueprintString.blueprint?.version ??
		blueprintString.blueprint_book?.version ??
		blueprintString.upgrade_planner?.version ??
		blueprintString.deconstruction_planner?.version;
	return version === undefined ? undefined : parseVersion4(version);
}

export function extractNames(blueprintString: BlueprintString): ExtractedNames {
	const state: ExtractionState = {
		names: new Map(),
		flags: {
			hasNonNormalQuality: false,
			hasPlanetSignals: false,
			hasSpaceLocationSignals: false,
		},
	};

	walkBlueprintString(state, blueprintString);

	return {
		names: state.names,
		flags: state.flags,
		version: extractVersion(blueprintString),
	};
}
