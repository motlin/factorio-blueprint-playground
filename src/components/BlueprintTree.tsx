import type {BlueprintString} from '../parsing/types'
import {FactorioIcon} from './FactorioIcon'
import {RichText} from './RichText'
import {InsetLight} from './ui'
import {rootBlueprintSignal, selectedBlueprintPathSignal} from '../state/blueprintTree'
import {getBlueprintContent, getBlueprintType} from "../parsing/blueprintUtils.ts";

interface TreeRowProps {
    path: string
    blueprint: BlueprintString
    indentLevel: number
}

const TreeRow = ({ path, blueprint, indentLevel }: TreeRowProps) => {
    const content = getBlueprintContent(blueprint)
    const type = getBlueprintType(blueprint)
    const isSelected = selectedBlueprintPathSignal.value === path

    // Only show type icon for upgrade/deconstruction planners
    const showTypeIcon = type === 'upgrade-planner' || type === 'deconstruction-planner'

    return (
        <div
            className={`flex flex-items-center p2 ${isSelected ? 'panel-hole active' : ''} clickable`}
            style={{
                paddingLeft: `${indentLevel * 24}px`,
                marginLeft: '4px',
                marginRight: '4px',
                borderRadius: '4px'
            }}
            onClick={() => selectedBlueprintPathSignal.value = path}
        >
            {showTypeIcon && (
                <FactorioIcon
                    icon={{
                        type: 'item',
                        name: type
                    }}
                    size={24}
                />
            )}

            {content.icons?.map((icon, index) => (
                <FactorioIcon
                    key={index}
                    icon={{
                        type: icon.signal.type,
                        name: icon.signal.name
                    }}
                    size={24}
                />
            ))}

            <span className="ml8">
                <div style={{overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'}}>
                    <RichText text={content.label || ''}/>
                </div>
            </span>
        </div>
    )
}

export function BlueprintTree() {
    const blueprint = rootBlueprintSignal.value
    if (!blueprint) return null;

    if (!blueprint.blueprint_book?.blueprints) {
        return null
    }

    // Recursively render blueprint book contents
    function renderNode(node: BlueprintString, path: string, level: number) {
        const rows = []

        // Add this node
        rows.push(
            <TreeRow
                key={path}
                path={path}
                blueprint={node}
                indentLevel={level}
            />
        )

        // Recursively add children if this is a book
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
        <InsetLight>
            {renderNode(blueprint, "", 0)}
        </InsetLight>
    )
}

export default BlueprintTree