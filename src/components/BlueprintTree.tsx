import {useNavigate} from '@tanstack/react-router';
import type {VNode} from 'preact';
import {memo, useEffect} from 'preact/compat';

import {BlueprintWrapper} from '../parsing/BlueprintWrapper';
import {Icon} from '../parsing/types.ts';
import type {TreeNode} from '../state/blueprintState';
import {blueprintTreeSignal, selectBlueprintPath, selectedPathSignal} from '../state/blueprintState';

import {FactorioIcon, Placeholder} from './FactorioIcon';
import {RichText} from './RichText';
import {InsetLight} from './ui';

interface TreeRowProps {
    node: TreeNode;
    indentLevel: number;
    isSelected: boolean;
    isActive: boolean;
}

// Memoize the tree row component
const TreeRow = memo(({ node, indentLevel, isSelected, isActive }: TreeRowProps) => {
    const wrapper = new BlueprintWrapper(node.blueprint);
    const navigate = useNavigate();

    function getIconElement(index: number) {
        const icon: Icon|undefined = wrapper.getIcons()?.find(icon => icon.index === index);
        if (icon) {
            return <FactorioIcon key={index} icon={icon.signal} size={'small'} />;
        }
        return <Placeholder key={index} size={'small'}/>;
    }

    // Combine the CSS classes based on state
    const classes = [
        'tree-row flex clickable',
        isSelected ? 'selected' : '',
        isActive ? 'active' : '',
    ].filter(Boolean).join(' ');

    const indentPx = (indentLevel * 32).toString();
    return (
        <div
            className={classes}
            style={{
                paddingLeft: `${indentPx}px`,
            }}
            onClick={(e) => {
                e.preventDefault();
                selectBlueprintPath(node.path);
                void navigate({
                    to: '/',
                    search: (prev) => ({...prev, selection: node.path}),
                    replace: true,
                });
            }}
        >
            <div className="flex flex-items-center">
                <FactorioIcon icon={{ type: 'item', name: wrapper.getType() }} size={'small'} />
                <div className="separator" />
            </div>

            <div className="flex flex-items-center">
                {[1, 2, 3, 4].map(index => getIconElement(index))}
                <div className="separator" />
            </div>

            <div className="label">
                <RichText text={wrapper.getLabel()} iconSize={'small'} />
            </div>
        </div>
    );
}, (prevProps, nextProps) => {
    // Custom comparison function for memo
    return (
        prevProps.node === nextProps.node &&
        prevProps.isSelected === nextProps.isSelected &&
        prevProps.indentLevel === nextProps.indentLevel &&
        prevProps.isActive === nextProps.isActive
    );
});

function isNodeActive(node: TreeNode, parentNode?: TreeNode): boolean {
    if (!parentNode) {
        return false;
    }

    if (!('blueprint_book' in parentNode.blueprint)) {
        return false;
    }

    const book = parentNode.blueprint.blueprint_book;
    if (!book || typeof book.active_index !== 'number') {
        return false;
    }

    // Find this node's index in the parent's children
    const nodeIndex = parentNode.children.findIndex(
        child => child.path === node.path,
    );

    return nodeIndex === book.active_index;
}

// Memoize the entire tree component
export const BlueprintTree = memo(() => {
    const tree = blueprintTreeSignal.value;
    const selectedPath = selectedPathSignal.value;

    if (!tree) return null;

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
            />,
        );

        node.children.forEach(child => {
            rows.push(...renderNode(child, level + 1, node));
        });

        return rows;
    }

    useEffect(() => {
        if (selectedPathSignal.value) {
            selectBlueprintPath(selectedPathSignal.value);
        }
    }, [selectedPathSignal.value]);

    return (
        <div className="blueprint-tree">
            <InsetLight>
                {renderNode(tree, 0)}
            </InsetLight>
        </div>
    );
});

export default BlueprintTree;
