import { memo } from 'preact/compat';
import type {BlueprintString} from '../parsing/types'
import {FactorioIcon} from './FactorioIcon'
import {RichText} from './RichText'
import {InsetLight} from './ui'
import { rootBlueprintSignal, selectedBlueprintPathSignal, selectBlueprintPath } from '../state/blueprintTree'
import { getBlueprintContent, getBlueprintType } from "../parsing/blueprintUtils"

interface TreeRowProps {
    path: string
    blueprint: BlueprintString
    indentLevel: number
    isSelected: boolean
}

// Memoize the tree row component
const TreeRow = memo(({ path, blueprint, indentLevel, isSelected }: TreeRowProps) => {
    const content = getBlueprintContent(blueprint)
    const type = getBlueprintType(blueprint)

    return (
        <div
            className={`blueprint-tree-row flex  clickable ${isSelected ? 'selected' : ''}`}
            style={{
                paddingLeft: `${indentLevel * 32}px`,
            }}
            onClick={() => selectBlueprintPath(path)}
        >
            <div className="flex flex-items-center">
                <FactorioIcon
                    icon={{
                        type: 'item',
                        name: type
                    }}
                    size={24}
                />
                <div className="blueprint-tree-separator" />
            </div>

            <div className="flex flex-items-center">
                {[0,1,2,3].map(i => {
                    const icon = content.icons?.[i]
                    return icon ? (
                    <FactorioIcon
                            key={i}
                        icon={{
                            type: icon.signal.type,
                            name: icon.signal.name
                        }}
                            size={24}
                    />
                    ) : (
                        <div key={i} className="blueprint-tree-icon-placeholder" />
                    )
                })}
                <div className="blueprint-tree-separator" />
            </div>

            <div className="blueprint-tree-label">
                    <RichText text={content.label || ''}/>
                </div>
        </div>
    )
}, (prevProps, nextProps) => {
    // Custom comparison function for memo
    return (
        prevProps.path === nextProps.path &&
        prevProps.isSelected === nextProps.isSelected &&
        prevProps.indentLevel === nextProps.indentLevel &&
        prevProps.blueprint === nextProps.blueprint
    )
})

// Memoize the entire tree component
export const BlueprintTree = memo(() => {
    const blueprint = rootBlueprintSignal.value
    const selectedPath = selectedBlueprintPathSignal.value

    if (!blueprint?.blueprint_book?.blueprints) return null

    function renderNode(node: BlueprintString, path: string, level: number): JSX.Element[] {
        const rows = []

        rows.push(
            <TreeRow
                key={path}
                path={path}
                blueprint={node}
                indentLevel={level}
                isSelected={selectedPath === path}
            />
        )

        if (node.blueprint_book?.blueprints) {
            node.blueprint_book.blueprints.forEach((child, index) => {
                const childPath = path ? `${path}.${index + 1}` : (index + 1).toString()
                const childNode = child.blueprint || child.blueprint_book ||
                                child.upgrade_planner || child.deconstruction_planner
                            ? child as BlueprintString
                    : { blueprint: child }

                rows.push(...renderNode(childNode, childPath, level + 1))
            })
        }

        return rows
    }

    return (
        <div className="blueprint-tree">
            <InsetLight>
                {renderNode(blueprint, "", 0)}
            </InsetLight>
        </div>
    )
})

export default BlueprintTree