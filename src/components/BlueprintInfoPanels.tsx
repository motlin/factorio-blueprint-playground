import {memo} from 'preact/compat'
import {InsetLight, Panel} from './ui'
import {FactorioIcon} from './FactorioIcon'
import type {BlueprintString, Parameter} from '../parsing/types'
import {getBlueprintContent} from '../parsing/blueprintUtils'

// Count occurrences of items in an array
function countItems<T>(items: T[], getKey: (item: T) => string) {
    const counts = new Map<string, number>()
    for (const item of items) {
        const key = getKey(item)
        counts.set(key, (counts.get(key) || 0) + 1)
    }
    return counts
}

// Table component for showing icon, count, name
function CountTable({ items }: { items: Array<{ icon: any, count: number, name: string }> }) {
    if (!items?.length) {
        return (
            <div className="text-center p8">
                None
            </div>
        )
    }

    return (
        <InsetLight>
            <table className="w100p">
                <thead>
                <tr>
                        <th style={{padding: '2px', textAlign: 'left'}}></th>
                        <th style={{padding: '2px', textAlign: 'right'}}>Count</th>
                        <th style={{padding: '2px', textAlign: 'left'}}>Name</th>
                </tr>
                </thead>
                <tbody>
                {items.map(({icon, count, name}) => (
                    <tr key={`${icon.type}-${icon.name}`}>
                        <td className="p2">
                            <FactorioIcon icon={icon} size={24}/>
                        </td>
                        <td className="p2" style={{textAlign: 'right'}}>{count}</td>
                        <td className="p2">
                            {name}
                        </td>
                    </tr>
                ))}
                </tbody>
            </table>
        </InsetLight>
    )
}

// Content Panels
export const ContentsPanel = memo(({blueprint}: { blueprint: BlueprintString }) => {
    const content = getBlueprintContent(blueprint)
    if (!content.entities?.length && !content.tiles?.length) return null

    // Count entities by name
    const entityCounts = countItems(content.entities || [], entity => entity.name)
    const entityItems = Array.from(entityCounts.entries()).map(([name, count]) => ({
        icon: { type: 'entity', name },
        count,
        name
    }))

    // Count tiles by name
    const tileCounts = countItems(content.tiles || [], tile => tile.name)
    const tileItems = Array.from(tileCounts.entries()).map(([name, count]) => ({
        icon: { type: 'tile', name },
        count,
        name
    }))

    // Get all unique recipes
    const recipes = new Set<string>()
    content.entities?.forEach(entity => {
        if (entity.recipe) recipes.add(entity.recipe)
    })
    const recipeItems = Array.from(recipes).map(name => ({
        icon: { type: 'recipe', name },
        count: 1,
        name
    }))

    return (
        <>
            {entityItems.length > 0 && (
                <Panel title="Entities">
                    <CountTable items={entityItems} />
                </Panel>
            )}

            {recipeItems.length > 0 && (
                <Panel title="Recipes">
                    <CountTable items={recipeItems} />
                </Panel>
            )}

            {tileItems.length > 0 && (
                <Panel title="Tiles">
                    <CountTable items={tileItems} />
                </Panel>
            )}
        </>
    )
})

// Parameters Panel
export const ParametersPanel = memo(({ blueprint }: { blueprint: BlueprintString }) => {
    const content = getBlueprintContent(blueprint)
    if (!content.parameters?.length) return null

    return (
        <Panel title="Parameters">
            <InsetLight>
                {content.parameters.map((param: Parameter, index: number) => (
                    <div key={index} className="flex justify-between p2">
                        <div className="font-bold">{param.name}</div>
                        <div>
                            {param.type === 'id' && (
                                <div>
                                    <div>ID: {param.id}</div>
                                    {param['quality-condition'] && (
                                        <div>
                                            Quality: {param['quality-condition'].quality} {param['quality-condition'].comparator}
                                        </div>
                                    )}
                                </div>
                            )}
                            {param.type === 'number' && (
                                <div>Value: {param.number}</div>
                            )}
                        </div>
                    </div>
                ))}
            </InsetLight>
        </Panel>
    )
})

// Upgrade Planner Panel
export const UpgradePlannerPanel = memo(({ blueprint }: { blueprint: BlueprintString }) => {
    const content = blueprint.upgrade_planner
    if (!content?.settings?.mappers) return null

    return (
        <Panel title="Upgrade Mappings">
            <InsetLight>
                {content.settings.mappers
                    .sort((a, b) => a.index - b.index)
                    .map((mapping, index) => (
                        <div key={index} className="flex items-center gap-4 p2">
                            {mapping.from && (
                                <FactorioIcon
                                    icon={{
                                        type: mapping.from.type,
                                        name: mapping.from.name
                                    }}
                                    size={24}
                                />
                            )}
                            <div>→</div>
                            {mapping.to && (
                                <FactorioIcon
                                    icon={{
                                        type: mapping.to.type,
                                        name: mapping.to.name
                                    }}
                                    size={24}
                                />
                            )}
                        </div>
                    ))}
            </InsetLight>
        </Panel>
    )
})

// Deconstruction Planner Panel
export const DeconstructionPlannerPanel = memo(({ blueprint }: { blueprint: BlueprintString }) => {
    const content = blueprint.deconstruction_planner
    if (!content?.settings) return null

    return (
        <Panel title="Deconstruction Settings">
            <InsetLight>
                {content.settings.trees_and_rocks_only && (
                    <div className="p2">
                        Only trees and rocks will be marked for deconstruction
                    </div>
                )}

                <div className="p2">
                    Tile Selection: {content.settings.tile_selection_mode === 2 ?
                    'Never deconstruct tiles' :
                    'Always deconstruct tiles'
                }
                </div>

                {content.settings.entity_filters?.length > 0 && (
                    <div className="mt-4">
                        <div className="font-bold mb-2">Entity Filters:</div>
                        <div className="flex flex-wrap gap2">
                            {content.settings.entity_filters.map((filter, index) => (
                                <div key={index} className="flex items-center gap2">
                                    <FactorioIcon
                                        icon={{
                                            type: 'entity',
                                            name: filter.name
                                        }}
                                        size={24}
                                    />
                                    <span>{filter.name}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </InsetLight>
        </Panel>
    )
})

// Main wrapper component that shows the appropriate panels
export const BlueprintInfoPanels = memo(({ blueprint }: { blueprint: BlueprintString }) => {
    if (!blueprint) return null

    return (
        <>
            {/* Show parameters panel if parameters exist */}
            <ParametersPanel blueprint={blueprint} />

            {/* Show type-specific panels */}
            {blueprint.blueprint && <ContentsPanel blueprint={blueprint} />}
            {blueprint.upgrade_planner && <UpgradePlannerPanel blueprint={blueprint} />}
            {blueprint.deconstruction_planner && <DeconstructionPlannerPanel blueprint={blueprint} />}
        </>
    )
})