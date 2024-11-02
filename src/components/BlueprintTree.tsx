import { signal } from '@preact/signals'
import type { BlueprintString } from '../parsing/types'
import { FactorioIcon } from './FactorioIcon'
import { RichText } from './RichText'
import { InsetLight } from './ui'
import { getBlueprintContent, getBlueprintType } from '../parsing/blueprintUtils'

// Global signals for blueprint state
export const rootBlueprintSignal = signal<BlueprintString | null>(null)
export const selectedBlueprintPathSignal = signal<string | null>(null)

interface TreeRowProps {
    path: string
    blueprint: BlueprintString
    indentLevel: number
}

const TreeRow = ({ path, blueprint, indentLevel }: TreeRowProps) => {
    const content = getBlueprintContent(blueprint)
    const type = getBlueprintType(blueprint)
    const isSelected = selectedBlueprintPathSignal.value === path

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
            <FactorioIcon
                icon={{
                    type: 'item',
                    name: type
                }}
                size={24}
            />

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
        <RichText text={content.label || ''} />
      </span>
        </div>
    )
}

export function BlueprintTree() {
    const blueprint = rootBlueprintSignal.value
    if (!blueprint) return null;

    // Skip showing the root blueprint book node if this is a plain blueprint
    if (blueprint.blueprint) {
        return (
            <TreeRow
                path="1"
                blueprint={blueprint}
                indentLevel={0}
            />
        )
    }

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
                const childPath = `${path}.${index + 1}`
                rows.push(
                    ...renderNode(
                        child.blueprint || child.blueprint_book || child.upgrade_planner || child.deconstruction_planner
                            ? child as BlueprintString
                            : { blueprint: child },
                        childPath,
                        level + 1
                    )
                )
            })
        }

        return rows
    }

    return (
        <InsetLight>
            {blueprint.blueprint_book.blueprints.map((child, index) => {
                const path = (index + 1).toString()
                const childBlueprint = child.blueprint || child.blueprint_book || child.upgrade_planner || child.deconstruction_planner
                    ? child as BlueprintString
                    : { blueprint: child }
                return renderNode(childBlueprint, path, 0)
            })}
        </InsetLight>
    )
}

export default BlueprintTree