import {BlueprintString} from '../../../parsing/types';

import {TreeNode} from './types';

/**
 * Determines if a node is active based on its parent's active_index.
 *
 * @param node - The node to check for active status
 * @param parentNode - Optional parent node containing active_index
 * @returns boolean indicating if the node is active
 */
export function isNodeActive(node: TreeNode, parentNode?: TreeNode): boolean {
	const activeIndex = parentNode?.blueprint.blueprint_book?.active_index;
	if (!activeIndex) {
		return false;
	}

	const nodeIndex = parentNode.children.findIndex((child) => child.path === node.path);

	return nodeIndex === activeIndex;
}

/**
 * Builds a tree structure from a blueprint string.
 * Recursively processes blueprint books to create a navigable hierarchy.
 *
 * @param blueprint - Source blueprint data
 * @param path - Current path in the tree
 * @returns Constructed TreeNode
 */
export function buildNode(blueprint: BlueprintString, path: string): TreeNode {
	const children =
		blueprint.blueprint_book?.blueprints.map((child, index) => {
			const childPath = path ? `${path}.${index + 1}` : `${index + 1}`;
			return buildNode(child, childPath);
		}) ?? [];

	return {
		path,
		blueprint,
		children,
	};
}
