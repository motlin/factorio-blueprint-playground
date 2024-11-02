import type { BlueprintString } from './types'

export function getBlueprintContent(blueprint: BlueprintString) {
    if (blueprint.blueprint) return blueprint.blueprint;
    if (blueprint.blueprint_book) return blueprint.blueprint_book;
    if (blueprint.upgrade_planner) return blueprint.upgrade_planner;
    if (blueprint.deconstruction_planner) return blueprint.deconstruction_planner;
    throw new Error('Invalid blueprint: missing content (no blueprint, blueprint book, upgrade planner or deconstruction planner found)')
}

export function getBlueprintType(blueprint: BlueprintString): string {
    // Just get the key and replace underscores with hyphens
    const type = Object.keys(blueprint)[0]
    return type.replace(/_/g, '-')
}