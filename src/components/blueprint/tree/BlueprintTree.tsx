import {memo, type ReactNode} from 'react';

import {BlueprintString} from '../../../parsing/types';
import {InsetLight, Panel} from '../../ui';

import {TreeRow} from './TreeRow';
import {buildNode, isNodeActive} from './treeUtils';
import {TreeNode} from './types';

interface BlueprintTreeProps {
	rootBlueprint?: BlueprintString;
	selectedPath: string;
	onSelect: (path: string) => void;
}

const BlueprintTreeComponent = ({rootBlueprint, selectedPath, onSelect}: BlueprintTreeProps) => {
	if (!rootBlueprint) return null;

	const tree = buildNode(rootBlueprint, '');

	function renderNode(node: TreeNode, level: number, parent?: TreeNode): ReactNode[] {
		const rows: ReactNode[] = [];

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
};

BlueprintTreeComponent.displayName = 'BlueprintTree';
export const BlueprintTree = memo(BlueprintTreeComponent);
