import type {BlueprintString} from '../parsing/types'
import {FactorioIcon} from './FactorioIcon'
import {RichText} from './RichText'
import {InsetLight} from './ui'
import {rootBlueprintSignal, selectedBlueprintPathSignal} from '../state/blueprintTree'
import {getBlueprintContent, getBlueprintType} from "../parsing/blueprintUtils.ts";


 // Darker color for better visibility
const SEPARATOR_STYLE = {
    width: '1px',
    height: `24px`,
    backgroundColor: '#666',
    margin: '0 8px'
}

interface TreeRowProps {
    path: string
    blueprint: BlueprintString
    indentLevel: number
}

const TreeRow = ({ path, blueprint, indentLevel }: TreeRowProps) => {
    const content = getBlueprintContent(blueprint)
    const type = getBlueprintType(blueprint)
    const isSelected = selectedBlueprintPathSignal.value === path

    // Container for the entire row
    return (
        <div
            className={`flex flex-items-center p2 blueprint-tree-row ${isSelected ? 'panel-hole active' : ''} clickable`}
            style={{
                marginLeft: `${indentLevel * 32}px`,
                marginRight: '4px',
                borderRadius: '4px',
                transition: 'background-color 0.15s ease'
            }}
            onClick={() => selectedBlueprintPathSignal.value = path}
        >
            <div className="flex flex-items-center">
                <FactorioIcon
                    icon={{
                        type: 'item',
                        name: type
                    }}
                    size={24}
                />
                <div style={SEPARATOR_STYLE} />
            </div>

            {/* Blueprint icons with separator */}
            <div className="flex flex-items-center">
                {/* Show up to 4 icons, using icon slots 0-3 */}
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
                        // Placeholder to maintain spacing
                        <div
                            key={i}
                            style={{
                                width: 24,
                                height: 24,
                                margin: '0 2px'
                            }}
                        />
                    )
                })}
                <div style={SEPARATOR_STYLE} />
            </div>

            {/* Label */}
            <div style={{
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                flex: 1
            }}>
                    <RichText text={content.label || ''}/>
                </div>
        </div>
    )
}

export function BlueprintTree() {
    const blueprint = rootBlueprintSignal.value
    if (!blueprint?.blueprint_book?.blueprints) return null

    // Recursively render blueprint book contents
    function renderNode(node: BlueprintString, path: string, level: number): JSX.Element[] {
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
        <div className="blueprint-tree">
            <InsetLight>
                {renderNode(blueprint, "", 0)}
            </InsetLight>
        </div>
    )
}

export default BlueprintTree