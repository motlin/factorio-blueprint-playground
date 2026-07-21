import type {Blueprint, BlueprintString, BlueprintStringWithIndex, Entity} from '../parsing/types';

export function removeEntities(blueprint: Blueprint, predicate: (entity: Entity) => boolean): Blueprint {
	const removedEntityNumbers = new Set<number>();
	const entities = blueprint.entities?.filter((entity) => {
		if (!predicate(entity)) {
			return true;
		}

		removedEntityNumbers.add(entity.entity_number);
		return false;
	});

	if (removedEntityNumbers.size === 0) {
		return blueprint;
	}

	const wires = blueprint.wires?.filter(
		([firstEntityNumber, , secondEntityNumber]) =>
			!removedEntityNumbers.has(firstEntityNumber) && !removedEntityNumbers.has(secondEntityNumber),
	);
	const schedules = blueprint.schedules
		?.map((schedule) => ({
			...schedule,
			locomotives: schedule.locomotives.filter((entityNumber) => !removedEntityNumbers.has(entityNumber)),
		}))
		.filter((schedule) => schedule.locomotives.length > 0);
	const result: Blueprint = {...blueprint, entities};

	if (wires !== undefined) {
		result.wires = wires;
	}
	if (schedules === undefined || schedules.length === 0) {
		delete result.schedules;
	} else {
		result.schedules = schedules;
	}

	return result;
}

export function mapBlueprints(root: BlueprintString, transform: (blueprint: Blueprint) => Blueprint): BlueprintString {
	if (root.blueprint !== undefined) {
		return {...root, blueprint: transform(root.blueprint)};
	}

	if (root.blueprint_book !== undefined) {
		return {
			...root,
			blueprint_book: {
				...root.blueprint_book,
				blueprints: root.blueprint_book.blueprints.map((child): BlueprintStringWithIndex => {
					const transformedChild = mapBlueprints(child, transform);
					return {...transformedChild, index: child.index};
				}),
			},
		};
	}

	return root;
}
