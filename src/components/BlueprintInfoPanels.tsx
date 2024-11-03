import {memo} from 'preact/compat'
import {Panel} from './ui'
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

// Multi-column list component for showing icon, name, count
function ItemList({ items }: { items: Array<{ icon: any, count: number, name: string }> }) {
    if (!items?.length) {
        return <div className="spreadsheet-container text-center">None</div>
    }

    return (
        <div className="spreadsheet-container">
            {items.map(({icon, count, name}) => (
                <div key={`${icon.type}-${icon.name}`} className="spreadsheet-row">
                    <div className="spreadsheet-cell" style={{flexShrink: 0}}>
                        <FactorioIcon icon={icon} />
                    </div>
                    <div className="spreadsheet-cell" style={{flexGrow: 1}}>
                        {name}
                </div>
                    <div className="spreadsheet-cell" style={{width: '80px', textAlign: 'right'}}>
                        {count}
                    </div>
                </div>
            ))}
        </div>
    )
}

// Content Panels
export const ContentsPanel = memo(({blueprint}: { blueprint: BlueprintString }) => {
    const content = getBlueprintContent(blueprint)
    if (!content.entities?.length && !content.tiles?.length) return null

    // Count entities by name
    const entityCounts = countItems(content.entities || [], entity => entity.name)
    const entityItems = Array.from(entityCounts.entries()).map(([name, count]) => ({
        icon: {type: 'entity', name},
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
                    <ItemList items={entityItems} />
                </Panel>
            )}

            {recipeItems.length > 0 && (
                <Panel title="Recipes">
                    <ItemList items={recipeItems} />
                </Panel>
            )}

            {tileItems.length > 0 && (
                <Panel title="Tiles">
                    <ItemList items={tileItems} />
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
            <div className="spreadsheet-container">
                {content.parameters.map((param: Parameter, index: number) => (
                    <div key={index} className="spreadsheet-row">
                        <div className="spreadsheet-cell" style={{width: '20%'}}>
                            {param.name}
                                        </div>
                        <div className="spreadsheet-cell" style={{width: '15%'}}>
                            {param.type === 'id' ? 'ID' : 'Value'}
                        </div>
                        <div className="spreadsheet-cell" style={{flexGrow: 1}}>
                            {param.type === 'id' ? param.id : param.number}
                        </div>
                        {param.type === 'id' && param['quality-condition'] && (
                            <div className="spreadsheet-cell" style={{width: '30%'}}>
                                Quality: {param['quality-condition'].quality} {param['quality-condition'].comparator}
                    </div>
                        )}
                    </div>
                ))}
            </div>
        </Panel>
    )
})

// Upgrade Planner Panel
export const UpgradePlannerPanel = memo(({blueprint}: { blueprint: BlueprintString }) => {
    const content = blueprint.upgrade_planner
    if (!content?.settings?.mappers) return null

    return (
        <Panel title="Upgrade Mappings">
            <div className="spreadsheet-container">
                {content.settings.mappers
                    .sort((a, b) => a.index - b.index)
                    .map((mapping, index) => (
                        <div key={index} className="spreadsheet-row">
                            <div className="spreadsheet-cell" style={{flexGrow: 1}}>
                                {mapping.from && (
                                    <FactorioIcon
                                        icon={{
                                            type: mapping.from.type,
                                            name: mapping.from.name
                                        }}
                                        size={24}
                                    />
                                )}
                            </div>
                            <div className="spreadsheet-cell" style={{width: '40px', textAlign: 'center'}}>
                                →
                            </div>
                            <div className="spreadsheet-cell" style={{flexGrow: 1}}>
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
                        </div>
                    ))}
            </div>
        </Panel>
    )
})

// Deconstruction Planner Panel
export const DeconstructionPlannerPanel = memo(({blueprint}: { blueprint: BlueprintString }) => {
    const content = blueprint.deconstruction_planner
    if (!content?.settings) return null

    return (
        <Panel title="Deconstruction Settings">
            <div className="spreadsheet-container">
                {content.settings.trees_and_rocks_only && (
                    <div className="spreadsheet-row">
                        <div className="spreadsheet-cell" style={{width: '20%'}}>Mode</div>
                        <div className="spreadsheet-cell" style={{flexGrow: 1}}>
                            Only trees and rocks will be marked for deconstruction
                        </div>
                    </div>
                )}
                <div className="spreadsheet-row">
                    <div className="spreadsheet-cell" style={{width: '20%'}}>
                        Tile Selection
                    </div>
                    <div className="spreadsheet-cell" style={{flexGrow: 1}}>
                        {content.settings.tile_selection_mode === 2 ?
                            'Never deconstruct tiles' :
                            'Always deconstruct tiles'
                        }
                    </div>
                </div>
                {content.settings.entity_filters?.length > 0 && (
                    <div className="spreadsheet-row">
                        <div className="spreadsheet-cell" style={{width: '20%'}}>
                            Entity Filters
                        </div>
                        <div className="spreadsheet-cell" style={{flexGrow: 1}}>
                            <div className="flex flex-wrap">
                            {content.settings.entity_filters.map((filter, index) => (
                                    <div key={index} className="flex mb8 mr8">
                                    <FactorioIcon
                                        icon={{
                                            type: 'entity',
                                            name: filter.name
                                        }}
                                        size={24}
                                    />
                                    <span className="ml8">{filter.name}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                    </div>
                )}
            </div>
        </Panel>
    )
})

// Main wrapper component that shows the appropriate panels
export const BlueprintInfoPanels = memo(({blueprint}: { blueprint: BlueprintString }) => {
    if (!blueprint) return null

    return (
        <>
            {/* Show parameters panel if parameters exist */}
            <ParametersPanel blueprint={blueprint}/>

            {/* Show type-specific panels */}
            {blueprint.blueprint && <ContentsPanel blueprint={blueprint}/>}
            {blueprint.upgrade_planner && <UpgradePlannerPanel blueprint={blueprint}/>}
            {blueprint.deconstruction_planner && <DeconstructionPlannerPanel blueprint={blueprint}/>}
        </>
    )
})