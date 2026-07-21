import type {Blueprint, BlueprintString, BlueprintStringWithIndex} from '../parsing/types';

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
