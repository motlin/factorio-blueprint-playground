import type {BlueprintString} from './types';

export function updateNestedBlueprint(
	rootBlueprint: BlueprintString,
	path: string,
	updater: (blueprint: BlueprintString) => BlueprintString,
): BlueprintString | null {
	if (path === '') {
		return updater(rootBlueprint);
	}

	try {
		const parts = path.split('.');

		function updateAtPath(current: BlueprintString, remainingPath: string[]): BlueprintString | null {
			if (remainingPath.length === 0) {
				return updater(current);
			}

			const [nextIndex, ...restPath] = remainingPath;
			const index = parseInt(nextIndex, 10) - 1;

			if (!current.blueprint_book?.blueprints) {
				console.error('Expected blueprint book but found none');
				return null;
			}

			if (isNaN(index) || index < 0 || index >= current.blueprint_book.blueprints.length) {
				console.error(`Invalid index ${nextIndex} (out of bounds)`);
				return null;
			}

			const nestedBlueprint = current.blueprint_book.blueprints[index];
			const updatedNested = updateAtPath(nestedBlueprint, restPath);
			if (updatedNested == null) {
				return null;
			}

			const newBlueprints = [...current.blueprint_book.blueprints];
			newBlueprints[index] = {...updatedNested, index: nestedBlueprint.index};

			return {
				...current,
				blueprint_book: {
					...current.blueprint_book,
					blueprints: newBlueprints,
				},
			};
		}

		return updateAtPath(rootBlueprint, parts);
	} catch (error) {
		console.error('Error updating nested blueprint:', error);
		return null;
	}
}

export function createLabelDescriptionUpdater(
	newLabel: string,
	newDescription: string,
): (blueprint: BlueprintString) => BlueprintString {
	return (blueprint: BlueprintString): BlueprintString => {
		const updated = structuredClone(blueprint);

		if (updated.blueprint) {
			updated.blueprint.label = newLabel;
			updated.blueprint.description = newDescription;
		} else if (updated.blueprint_book) {
			updated.blueprint_book.label = newLabel;
			updated.blueprint_book.description = newDescription;
		} else if (updated.upgrade_planner) {
			updated.upgrade_planner.label = newLabel;
			updated.upgrade_planner.settings.description = newDescription;
		} else if (updated.deconstruction_planner) {
			updated.deconstruction_planner.label = newLabel;
			updated.deconstruction_planner.settings.description = newDescription;
		}

		return updated;
	};
}
