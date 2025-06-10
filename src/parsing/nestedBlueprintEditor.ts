import type {BlueprintString} from './types';

/**
 * Immutably updates a nested blueprint within a blueprint book structure.
 * Returns a new blueprint structure with the nested blueprint updated.
 *
 * @param rootBlueprint The root blueprint structure
 * @param path The dot-separated path to the nested blueprint (e.g., "1.2")
 * @param updater A function that takes the nested blueprint and returns an updated version
 * @returns A new blueprint structure with the update applied, or null if update failed
 */
export function updateNestedBlueprint(
	rootBlueprint: BlueprintString,
	path: string,
	updater: (blueprint: BlueprintString) => BlueprintString,
): BlueprintString | null {
	// If no path, we're updating the root
	if (!path) {
		return updater(rootBlueprint);
	}

	try {
		const parts = path.split('.');

		// Recursive function to update at the specified path
		function updateAtPath(current: BlueprintString, remainingPath: string[]): BlueprintString | null {
			if (remainingPath.length === 0) {
				// We've reached the target - apply the updater
				return updater(current);
			}

			// We need to go deeper
			const [nextIndex, ...restPath] = remainingPath;
			const index = parseInt(nextIndex) - 1;

			if (!current.blueprint_book?.blueprints) {
				console.error('Expected blueprint book but found none');
				return null;
			}

			if (isNaN(index) || index < 0 || index >= current.blueprint_book.blueprints.length) {
				console.error(`Invalid index ${nextIndex} (out of bounds)`);
				return null;
			}

			// Recursively update the nested blueprint
			const updatedNested = updateAtPath(current.blueprint_book.blueprints[index], restPath);
			if (!updatedNested) {
				return null;
			}

			// Create a new blueprint book with the updated nested blueprint
			const newBlueprints = [...current.blueprint_book.blueprints];
			newBlueprints[index] = updatedNested;

			// Return a new blueprint structure with the updated book
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

/**
 * Creates an updater function that updates the label and description of a blueprint
 * @param newLabel The new label to set
 * @param newDescription The new description to set
 * @returns An updater function for use with updateNestedBlueprint
 */
export function createLabelDescriptionUpdater(
	newLabel: string,
	newDescription: string,
): (blueprint: BlueprintString) => BlueprintString {
	return (blueprint: BlueprintString): BlueprintString => {
		// Deep clone to ensure immutability
		const updated = JSON.parse(JSON.stringify(blueprint)) as BlueprintString;

		// Update based on blueprint type
		if (updated.blueprint) {
			updated.blueprint.label = newLabel;
			updated.blueprint.description = newDescription;
		} else if (updated.blueprint_book) {
			updated.blueprint_book.label = newLabel;
			updated.blueprint_book.description = newDescription;
		} else if (updated.upgrade_planner) {
			updated.upgrade_planner.label = newLabel;
			if (!updated.upgrade_planner.settings) {
				updated.upgrade_planner.settings = {};
			}
			updated.upgrade_planner.settings.description = newDescription;
		} else if (updated.deconstruction_planner) {
			updated.deconstruction_planner.label = newLabel;
			if (!updated.deconstruction_planner.settings) {
				updated.deconstruction_planner.settings = {};
			}
			updated.deconstruction_planner.settings.description = newDescription;
		}

		return updated;
	};
}
