import type {VNode} from 'preact';
import {memo} from 'preact/compat';

import {BlueprintWrapper} from '../parsing/BlueprintWrapper';
import {type BlueprintString, Icon} from '../parsing/types';

import {FactorioIcon, Placeholder} from './FactorioIcon';
import {RichText} from './RichText';
import {InsetLight, Panel} from './ui';

// Types for tree structure
export interface TreeNode {
	path: string;
	blueprint: BlueprintString;
	children: TreeNode[];
}

interface TreeRowProps {
	node: TreeNode;
	indentLevel: number;
	isSelected: boolean;
	isActive: boolean;
	onSelect: (path: string) => void;
}

/**
 * Determines if a node is active based on its parent's active_index.
 *
 * @param node - The node to check for active status
 * @param parentNode - Optional parent node containing active_index
 * @returns boolean indicating if the node is active
 */
function isNodeActive(node: TreeNode, parentNode?: TreeNode): boolean {
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
function buildNode(blueprint: BlueprintString, path: string): TreeNode {
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

// Memoize the tree row component
const TreeRow = ({node, indentLevel, isSelected, isActive, onSelect}: TreeRowProps) => {
	const wrapper = new BlueprintWrapper(node.blueprint);

	function getIconElement(index: number) {
		const icon: Icon | undefined = wrapper.getIcons()?.find((icon) => icon.index === index);
		if (icon) {
			return <FactorioIcon key={index} icon={icon.signal} size={'small'} />;
		}
		return <Placeholder key={index} size={'small'} />;
	}

	// Combine the CSS classes based on state
	const classes = ['tree-row flex clickable', isSelected ? 'selected' : '', isActive ? 'active' : '']
		.filter(Boolean)
		.join(' ');

	const indentPx = (indentLevel * 32).toString();

	const handleClick = (e: MouseEvent) => {
		e.preventDefault();
		onSelect(node.path);
	};

	return (
		<div
			className={classes}
			style={{
				paddingLeft: `${indentPx}px`,
			}}
			onClick={handleClick}
		>
			<div className="flex flex-items-center">
				<FactorioIcon icon={{type: 'item', name: wrapper.getType()}} size={'small'} />
				<div className="separator" />
			</div>

			<div className="flex flex-items-center">
				{[1, 2, 3, 4].map((index) => getIconElement(index))}
				<div className="separator" />
			</div>

			<div className="label">
				<RichText text={wrapper.getLabel()} iconSize={'small'} />
			</div>
		</div>
	);
};

interface BlueprintTreeProps {
	rootBlueprint?: BlueprintString;
	selectedPath: string;
	onSelect: (path: string) => void;
}

// Memoize the entire tree component
export const BlueprintTree = memo(({rootBlueprint, selectedPath, onSelect}: BlueprintTreeProps) => {
	if (!rootBlueprint) return null;

	const tree = buildNode(rootBlueprint, '');

	function renderNode(node: TreeNode, level: number, parent?: TreeNode): VNode[] {
		const rows: VNode[] = [];

		const active = isNodeActive(node, parent);

		rows.push(
			<TreeRow
				key={node.path}
				node={node}
				indentLevel={level}
				isSelected={selectedPath === node.path}
				isActive={active}
				onSelect={onSelect}
			/>,
		);

		node.children.forEach((child) => {
			rows.push(...renderNode(child, level + 1, node));
		});

		return rows;
	}

	return (
		<Panel title="Blueprint Tree">
			<div className="blueprint-tree">
				<InsetLight>{renderNode(tree, 0)}</InsetLight>
			</div>
		</Panel>
	);
});

export default BlueprintTree;
