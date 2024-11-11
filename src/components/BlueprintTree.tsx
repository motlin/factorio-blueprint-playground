import {memo} from 'preact/compat';
import {selectedPathSignal} from '../state/blueprintState';
import {blueprintTreeSignal, selectBlueprintPath, type TreeNode} from '../state/blueprintTree';
import {FactorioIcon} from './FactorioIcon';
import {RichText} from './RichText';
import {InsetLight} from './ui';
import {Icon} from "../parsing/types.ts";
import {BlueprintWrapper} from "../parsing/BlueprintWrapper.ts";

interface TreeRowProps {
    node: TreeNode;
    indentLevel: number;
    isSelected: boolean;
}

// Memoize the tree row component
const TreeRow = memo(({ node, indentLevel, isSelected }: TreeRowProps) => {
    const wrapper = new BlueprintWrapper(node.blueprint);

    function getIconElement(index: number) {
        const icon: Icon|undefined = wrapper.getIcons()?.find(icon => icon.index === index);
        if (icon) {
            return <FactorioIcon key={index} icon={icon.signal} />;
        }
        return <div key={index} className="placeholder" />;
    }

    const indentPx = (indentLevel * 32).toString();
    return (
        <div
            className={`tree-row flex clickable ${isSelected ? 'selected' : ''}`}
            style={{
                paddingLeft: `${indentPx}px`,
            }}
            onClick={() => { selectBlueprintPath(node.path); }}
        >
            <div className="flex flex-items-center">
                <FactorioIcon icon={{ type: 'item', name: wrapper.getType() }} />
                <div className="separator" />
            </div>

            <div className="flex flex-items-center">
                {[1, 2, 3, 4].map(index => getIconElement(index))}
                <div className="separator" />
            </div>

            <div className="label">
                <RichText text={wrapper.getLabel()} />
            </div>
        </div>
    );
}, (prevProps, nextProps) => {
    // Custom comparison function for memo
    return (
        prevProps.node === nextProps.node &&
        prevProps.isSelected === nextProps.isSelected &&
        prevProps.indentLevel === nextProps.indentLevel
    );
});

// Memoize the entire tree component
export const BlueprintTree = memo(() => {
    const tree = blueprintTreeSignal.value;
    const selectedPath = selectedPathSignal.value;

    if (!tree) return null;

    function renderNode(node: TreeNode, level: number): JSX.Element[] {
        const rows: JSX.Element[] = [];

        rows.push(
            <TreeRow
                key={node.path}
                node={node}
                indentLevel={level}
                isSelected={selectedPath === node.path}
            />
        );

        node.children.forEach(child => {
            rows.push(...renderNode(child, level + 1));
        });

        return rows;
    }

    return (
        <div className="blueprint-tree">
            <InsetLight>
                {renderNode(tree, 0)}
            </InsetLight>
        </div>
    );
});

export default BlueprintTree;