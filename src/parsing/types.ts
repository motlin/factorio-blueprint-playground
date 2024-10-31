// The different types of objects we can parse
export type ParserBlueprintType = 'blueprint' | 'blueprint_book' | 'upgrade_planner' | 'deconstruction_planner'

interface Position {
    x: number
    y: number
}

type VirtualSignalName =
    | 'signal-each' | 'signal-anything' | 'signal-everything' | 'signal-info'
    | 'signal-check' | 'signal-deny' | 'signal-red' | 'signal-green' | 'signal-blue'
    | 'signal-0' | 'signal-1' | 'signal-2' | 'signal-3' | 'signal-4'
    | 'signal-5' | 'signal-6' | 'signal-7' | 'signal-8' | 'signal-9'
    | 'signal-A' | 'signal-B' | 'signal-C' | 'signal-D' | 'signal-E'
    | 'signal-F' | 'signal-G' | 'signal-H' | 'signal-I' | 'signal-J'
    | 'signal-K' | 'signal-L' | 'signal-M' | 'signal-N' | 'signal-O'
    | 'signal-P' | 'signal-Q' | 'signal-R' | 'signal-S' | 'signal-T'
    | 'signal-U' | 'signal-V' | 'signal-W' | 'signal-X' | 'signal-Y' | 'signal-Z'
    | 'signal-dot' | 'signal-comma' | 'signal-skull'
    | 'signal-item-parameter' | 'signal-fuel-parameter' | 'signal-pink' | 'signal-yellow'
    | 'shape-horizontal'

interface SignalID {
    type?: 'item' | 'fluid' | 'virtual' | 'entity' | 'technology' | 'recipe' |
           'item-group' | 'tile' | 'virtual-signal' | 'achievement' | 'equipment' |
           'planet' | 'quality' | 'utility'  // Defaults to "item" if not specified
    name: string | VirtualSignalName
    quality?: 'normal' | 'uncommon' | 'rare' | 'epic' | 'legendary'
}

interface Icon {
    signal: SignalID
    index: number  // 1-based index, max 4 icons
}

interface NetworkPorts {
    red: boolean
    green: boolean
        }

interface CircuitCondition {
    first_signal?: SignalID
    second_signal?: SignalID
    constant?: number
    comparator?: '=' | '>' | '<' | '≥' | '≤' | '≠'
    first_signal_networks?: NetworkPorts
    second_signal_networks?: NetworkPorts
}

interface DeciderCondition extends CircuitCondition {
    compare_type?: 'and' | 'or'
}

interface ConditionOutput {
    signal: SignalID
    copy_count_from_input?: boolean
    networks?: NetworkPorts
}

interface DeciderCombinatorConditions {
    conditions: DeciderCondition[]
    outputs: ConditionOutput[]
}

interface ArithmeticCondition {
        first_signal: SignalID
        second_signal?: SignalID
        second_constant?: number
    operation: '+' | '-' | '*' | '/' | '^' | '%' | '<<' | '>>' | 'AND' | 'OR' | 'XOR'
        output_signal: SignalID
    first_signal_networks?: NetworkPorts
    second_signal_networks?: NetworkPorts
    }

interface DisplayPanelParameter {
    condition: {
        first_signal: SignalID
        constant: number
        comparator: '=' | '>' | '<' | '≥' | '≤' | '≠'
    }
    icon?: SignalID
}

interface Filter {
        index: number
    name: string
    type?: string
    quality?: string
    comparator?: string
    count?: number
    max_count?: number
}

interface SectionFilters {
    index: number
    filters?: Filter[]
    group?: string
    active?: boolean
}

// Common fields across all blueprint types
interface CommonFields {
    item: string
    label?: string
    description?: string
    icons?: Icon[]
    version: bigint
}

interface ControlBehavior {
    // Circuit network conditions
    circuit_enabled?: boolean
    circuit_condition?: CircuitCondition
    connect_to_logistic_network?: boolean
    logistic_condition?: CircuitCondition

    // Circuit read modes
    circuit_read_hand_contents?: boolean
    circuit_hand_read_mode?: number
    circuit_contents_read_mode?: number
    circuit_read_resources?: boolean

    // Item/recipe control
    set_recipe?: boolean
    read_contents?: boolean
    read_ingredients?: true
    circuit_set_stack_size?: boolean
    circuit_condition_enabled?: boolean
    circuit_mode_of_operation?: number

    // Train control
    read_from_train?: boolean
    train_stopped_signal?: SignalID
    send_to_train?: boolean

    // Specialized controls
    read_robot_stats?: boolean
    decider_conditions?: DeciderCombinatorConditions
    arithmetic_conditions?: ArithmeticCondition
    parameters?: DisplayPanelParameter[]

    // Display/lamp controls
    use_colors?: boolean
    color_mode?: number
    red_signal?: SignalID
    green_signal?: SignalID
    blue_signal?: SignalID

    // Random operation (for selector combinators)
    operation?: 'random' | string
    random_update_interval?: number

    // Sections (for combinators)
    sections?: {
        sections: SectionFilters[]
    }
}

interface ItemStack {
    id: {
        name: string
    }
    items: {
        in_inventory: Array<{
            inventory: number
            stack: number
        }>
    }
}

interface Entity {
    entity_number: number
    name: string
    position: Position
    direction?: number  // 0, 2, 4, 6 = North, East, South, West
    control_behavior?: ControlBehavior
    recipe?: string
    recipe_quality?: string
    request_filters?: {
        sections: SectionFilters[]
        request_from_buffers?: boolean
        trash_not_requested?: boolean
    }
    filter_mode?: 'whitelist' | 'blacklist'
    use_filters?: boolean
    override_stack_size?: number
    bar?: number
    filters?: Filter[]
    items?: ItemStack[]
    transitional_request_index?: number
    icon?: SignalID
    always_show?: boolean
    color?: {
        r: number
        g: number
        b: number
        a: number
    }
    spoil_priority?: 'fresh-first' | 'spoiled-first'
    type?: string  // For underground belts - "input" or "output"
    manual_trains_limit?: number
    priority?: number
    station?: string
    text?: string  // For display panels
}

interface Wire {
    entity_number: number
    circuit_id: number
}

interface ScheduleRecord {
    station: string
    wait_conditions: Array<{
        compare_type: 'and' | 'or'
        type: string
        condition?: CircuitCondition
        ticks?: number
    }>
}

interface Schedule {
    locomotives: number[]
    schedule: {
        records: ScheduleRecord[]
    }
}

interface Tile {
    position: Position
    name: string
}

interface Parameter {
    type: 'id' | 'number'
    name: string
    id?: string
    number?: string
    variable?: string
    formula?: string
    dependent?: boolean
    'quality-condition'?: {
        quality: string
        comparator: string
    }
    'ingredient-of'?: string
}

export interface Blueprint extends CommonFields {
    item: 'blueprint'
    entities?: Entity[]
    tiles?: Tile[]
    schedules?: Schedule[]
    parameters?: Parameter[]
    snap_to_grid?: {
        x: number
        y: number
    }
    absolute_snapping?: boolean
}

interface UpgradeMapping {
    from?: SignalID
    to?: SignalID
    index: number
}

export interface UpgradePlanner extends CommonFields {
    item: 'upgrade-planner'
    settings: {
        mappers: UpgradeMapping[]
    }
}

export interface DeconstructionPlanner extends CommonFields {
    item: 'deconstruction-planner'
    settings: {
        entity_filters?: Filter[]
        tile_selection_mode?: 2 | 3  // 2="Never deconstruct tiles", 3="Always deconstruct tiles"
        trees_and_rocks_only?: boolean
    }
}

export interface BlueprintBook extends CommonFields {
    item: 'blueprint-book'
    blueprints: Array<{
        index: number
        blueprint?: Blueprint
        blueprint_book?: BlueprintBook
        upgrade_planner?: UpgradePlanner
        deconstruction_planner?: DeconstructionPlanner
    }>
    active_index?: number
}

export interface BlueprintString {
    blueprint?: Blueprint
    blueprint_book?: BlueprintBook
    upgrade_planner?: UpgradePlanner
    deconstruction_planner?: DeconstructionPlanner
}

// Controlling trains
interface StopBehavior {
    circuit_enabled?: boolean;
    logistic_condition?: CircuitCondition;
    read_from_train?: boolean;
    train_stopped_signal?: SignalID;
    send_to_train?: boolean;
    manual_trains_limit?: number;
    priority?: number;
}

// For stations
interface Station {
    station?: string;
    color?: {
        r: number;
        g: number;
        b: number;
        a: number;
    };
}

interface DisplayPanel extends Entity {
    text?: string;
    icon?: SignalID;
    always_show?: boolean;
}