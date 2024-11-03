import {memo} from 'preact/compat'
import {Panel} from './ui'
import {FactorioIcon} from './FactorioIcon'
import type {BlueprintString, Parameter} from '../parsing/types'
import {getBlueprintContent} from '../parsing/blueprintUtils'
import {Cell, IconCell, Row, Spreadsheet, TextCell} from './spreadsheet'
import {ParametersPanel} from "./ParametersPanel.tsx";

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
    return (
        <Spreadsheet>
            {items.map(({icon, count, name}) => (
                <Row key={`${icon.type}-${icon.name}`}>
                    <IconCell icon={icon} />
                    <TextCell grow>{name}</TextCell>
                    <TextCell width="80px" align="right" grow={false}>{count}</TextCell>
                </Row>
            ))}
        </Spreadsheet>
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

// Upgrade Planner Panel
export const UpgradePlannerPanel = memo(({blueprint}: { blueprint: BlueprintString }) => {
    const content = blueprint.upgrade_planner
    if (!content?.settings?.mappers) return null

    return (
        <Panel title="Upgrade Mappings">
            <Spreadsheet>
                {content.settings.mappers
                    .sort((a, b) => a.index - b.index)
                    .map((mapping, index) => (
                        <Row key={index}>
                            <Cell grow>
                                {mapping.from && (
                                    <FactorioIcon
                                        icon={{
                                            type: mapping.from.type,
                                            name: mapping.from.name
                                        }}
                                        size={24}
                                    />
                                )}
                            </Cell>
                            <Cell width="40px" align="center">
                                →
                            </Cell>
                            <Cell grow>
                            {mapping.to && (
                                    <FactorioIcon
                                        icon={{
                                            type: mapping.to.type,
                                            name: mapping.to.name
                                        }}
                                        size={24}
                                    />
                                )}
                            </Cell>
                        </Row>
                    ))}
            </Spreadsheet>
        </Panel>
    )
})

// Deconstruction Planner Panel
export const DeconstructionPlannerPanel = memo(({blueprint}: { blueprint: BlueprintString }) => {
    const content = blueprint.deconstruction_planner
    if (!content?.settings) return null

    return (
        <Panel title="Deconstruction Settings">
            <Spreadsheet>
                {content.settings.trees_and_rocks_only && (
                    <Row>
                        <Cell width="20%">Mode</Cell>
                        <Cell grow>
                            Only trees and rocks will be marked for deconstruction
                        </Cell>
                    </Row>
                )}
                <Row>
                    <Cell width="20%">
                        Tile Selection
                    </Cell>
                    <Cell grow>
                        {content.settings.tile_selection_mode === 2 ?
                            'Never deconstruct tiles' :
                            'Always deconstruct tiles'
                        }
                    </Cell>
                </Row>
                {content.settings.entity_filters?.length > 0 && (
                    <Row>
                        <Cell width="20%">
                            Entity Filters
                        </Cell>
                        <Cell grow>
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
                        </Cell>
                    </Row>
                )}
            </Spreadsheet>
        </Panel>
    )
})

// Main wrapper component that shows the appropriate panels
export const BlueprintInfoPanels = memo(({blueprint}: { blueprint: BlueprintString }) => {
    if (!blueprint) return null

    return (
        <>
            {/* Show type-specific panels */}
            {blueprint.blueprint && <ContentsPanel blueprint={blueprint}/>}
            {blueprint.upgrade_planner && <UpgradePlannerPanel blueprint={blueprint}/>}
            {blueprint.deconstruction_planner && <DeconstructionPlannerPanel blueprint={blueprint}/>}
        </>
    )
})