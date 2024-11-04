import {memo} from 'preact/compat'
import {Panel} from './ui'
import {FactorioIcon} from './FactorioIcon'
import type {Blueprint, BlueprintString, DeconstructionPlanner, Entity, Tile, UpgradePlanner} from '../parsing/types'
import {getBlueprintContent} from '../parsing/blueprintUtils'
import {Cell, IconCell, Row, Spreadsheet, TextCell} from './spreadsheet'
import {BlueprintWrapper} from "../parsing/BlueprintWrapper";

// Count occurrences of items in an array
function countItems<T>(items: T[], getKey: (item: T) => string | undefined) {
    const counts = new Map<string, number>()
    for (const item of items) {
        const key: string | undefined = getKey(item)
        if (!key) continue;
        counts.set(key, (counts.get(key) || 0) + 1)
    }
    return counts
}

function mapToSortedArray(
    counts: Map<string, number>
) {
    return Array.from(counts.entries())
        .map(([name, count]) => ({
            name,
            count,
        }))
        .sort((a, b) => b.count - a.count) // Sort by count in descending order
}

// Multi-column list component for showing icon, name, count
function ItemPanel({ title, items, type }: { title: string, items: Map<string, number>, type: string}) {
    if (!items.size) return null;

    const sortedItems = mapToSortedArray(items)

    return (
        <Panel title={title}>
            <Spreadsheet>
                {sortedItems.map(({name, count}) => (
                    <Row key={`${type}-${name}`}>
                        <IconCell icon={{type, name}}/>
                        <TextCell grow>{name}</TextCell>
                        <TextCell width="80px" align="right" grow={false}>{count}</TextCell>
                    </Row>
                ))}
            </Spreadsheet>
        </Panel>
    )
}

// Content Panels
export const ContentsPanel = memo(({blueprint}: { blueprint: BlueprintString }) => {
    const content = getBlueprintContent(blueprint)

    // Type guard to ensure we're working with a Blueprint type
    if (!('entities' in content)) return null;

    const blueprintContent = content as Blueprint;

    if (!blueprintContent.entities?.length && !blueprintContent.tiles?.length) return null;

    const entityCounts = countItems(blueprintContent.entities || [], (entity: Entity) => entity.name)
    const tileCounts = countItems(blueprintContent.tiles || [], (tile: Tile) => tile.name)
    const recipeCounts = countItems(blueprintContent.entities || [], (entity: Entity) => entity.recipe)

    return (
        <>
            <ItemPanel title="Entities" items={entityCounts} type={'entity'}/>
            <ItemPanel title="Recipes" items={recipeCounts} type={'recipe'}/>
            <ItemPanel title="Tiles" items={tileCounts} type={'tile'}/>
        </>
    )
})

// Upgrade Planner Panel
export const UpgradePlannerPanel = memo(({blueprint}: { blueprint: BlueprintString }) => {
    const wrapper = new BlueprintWrapper(blueprint);
    const { content } = wrapper.getInfo();

    // Type guard to ensure we're working with an upgrade planner
    if (!('upgrade_planner' in blueprint)) return null;

    const { settings } = content as UpgradePlanner;
    if (!settings?.mappers?.length) return null;

    return (
        <Panel title="Upgrade Mappings">
            <Spreadsheet>
                {settings.mappers
                    .sort((a, b) => a.index - b.index)
                    .map((mapping, index) => (
                        <Row key={index}>
                            <Cell grow>
                                {mapping.from && (
                                    <FactorioIcon
                                        type={mapping.from.type}
                                        name={mapping.from.name}
                                    />
                                )}
                            </Cell>
                            <Cell width="40px" align="center">
                                →
                            </Cell>
                            <Cell grow>
                            {mapping.to && (
                                <FactorioIcon
                                    type={mapping.to.type}
                                    name={mapping.to.name}
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
    const wrapper = new BlueprintWrapper(blueprint);
    const { content } = wrapper.getInfo();

    // Type guard to ensure we're working with a deconstruction planner
    if (!('deconstruction_planner' in blueprint)) return null;

    const { settings } = content as DeconstructionPlanner;
    if (!settings) return null;

    const getTileSelectionText = (mode?: number) => {
        switch (mode) {
            case 1: return 'Default tile behavior';
            case 2: return 'Never deconstruct tiles';
            case 3: return 'Always deconstruct tiles';
            default: return 'Default tile behavior';
        }
    };

    return (
        <Panel title="Deconstruction Settings">
            <Spreadsheet>
                {settings.trees_and_rocks_only && (
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
                        {getTileSelectionText(settings.tile_selection_mode)}
                    </Cell>
                </Row>

                {settings.entity_filters?.length > 0 && (
                    <Row>
                        <Cell width="20%">
                            Entity Filters
                        </Cell>
                        <Cell grow>
                            <div className="flex flex-wrap">
                                {settings.entity_filters
                                    .sort((a, b) => a.index - b.index)
                                    .map((filter, index) => (
                                    <div key={index} className="flex mb8 mr8">
                                    <FactorioIcon
                                        type="entity"
                                        name={filter.name}
                                    />
                                            <span className="ml8">
                                                {filter.name}
                                                {filter.quality && ` (${filter.quality})`}
                                                {filter.comparator && ` ${filter.comparator}`}
                                            </span>
                                        </div>
                                    ))}
                            </div>
                        </Cell>
                    </Row>
                )}

                {settings.tile_filters?.length > 0 && (
                    <Row>
                        <Cell width="20%">Tile Filters</Cell>
                        <Cell grow>
                            <div className="flex flex-wrap">
                                {settings.tile_filters
                                    .sort((a, b) => a.index - b.index)
                                    .map((filter, index) => (
                                        <div key={index} className="flex mb8 mr8">
                                            <FactorioIcon
                                                type="tile"
                                                name={filter.name}
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