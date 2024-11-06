import {JSX} from 'preact';
import {memo} from 'preact/compat';

import {BlueprintWrapper} from '../parsing/BlueprintWrapper';
import {BlueprintString, BlueprintStringWithIndex, Icon} from '../parsing/types';
import {rootBlueprintSignal, selectBlueprintPath, selectedBlueprintPathSignal} from '../state/blueprintTree';

import {FactorioIcon} from './FactorioIcon';
import {RichText} from './RichText';
import {InsetLight} from './ui';

interface TreeRowProps {
    path: string
    blueprint: BlueprintString
    indentLevel: number
    isSelected: boolean
}

// Memoize the tree row component
const TreeRow = memo(({ path, blueprint, indentLevel, isSelected }: TreeRowProps) => {
    const wrapper = new BlueprintWrapper(blueprint);
    const type = wrapper.getType();
    const label = wrapper.getLabel();
    const icons = wrapper.getIcons();

    function getIconElement(index: number, icon?: Icon) {
        if (icon) {
            return <FactorioIcon key={index} icon={icon.signal}/>;
        }

        return <div key={index} className="placeholder"/>;
    }

    const indentPx = (indentLevel * 32).toString();
    return (
        <div
            className={`tree-row flex clickable ${isSelected ? 'selected' : ''}`}
            style={{
                paddingLeft: `${indentPx}px`,
            }}
            onClick={() => { selectBlueprintPath(path); }}
        >
            <div className="flex flex-items-center">
                <FactorioIcon icon={{type: 'item', name: type}} />
                <div className="separator" />
            </div>

            <div className="flex flex-items-center">
                {[1, 2, 3, 4].map(index => {
                    // Find icon with matching index
                    const icon = icons.find(icon => icon.index === index);
                    return getIconElement(index, icon);
                })}
                <div className="separator"/>
            </div>

            <div className="label">
                <RichText text={label} />
            </div>
        </div>
    );
}, (prevProps, nextProps) => {
    // Custom comparison function for memo
    return (
        prevProps.path === nextProps.path &&
        prevProps.isSelected === nextProps.isSelected &&
        prevProps.indentLevel === nextProps.indentLevel &&
        prevProps.blueprint === nextProps.blueprint
    );
});

// Memoize the entire tree component
export const BlueprintTree = memo(() => {
    const blueprint = rootBlueprintSignal.value;
    const selectedPath = selectedBlueprintPathSignal.value;

    if (!blueprint?.blueprint_book?.blueprints) return null;

    function renderNode(node: BlueprintString, path: string, level: number): JSX.Element[] {
        const rows: JSX.Element[] = [];

        rows.push(
            <TreeRow
                key={path}
                path={path}
                blueprint={node}
                indentLevel={level}
                isSelected={selectedPath === path}
            />,
        );

        if (node.blueprint_book?.blueprints) {
            node.blueprint_book.blueprints.forEach((child: BlueprintStringWithIndex, index) => {
                const nextIndex = (index + 1).toString();
                const childPath = path ? `${path}.${nextIndex}` : nextIndex;
                rows.push(...renderNode(child, childPath, level + 1));
            });
        }

        return rows;
    }

    return (
        <div className="blueprint-tree">
            <InsetLight>
                {renderNode(blueprint, '', 0)}
            </InsetLight>
        </div>
    );
});

export default BlueprintTree;
