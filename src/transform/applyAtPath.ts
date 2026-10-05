import type {BlueprintString} from '../parsing/types';

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
