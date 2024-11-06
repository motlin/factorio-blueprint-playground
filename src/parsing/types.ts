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

export type SignalType = 'item' | 'fluid' | 'virtual' | 'entity' | 'technology' | 'recipe' |
    'item-group' | 'tile' | 'virtual-signal' | 'achievement' | 'equipment' |
    'planet' | 'quality' | 'utility' | 'space-location';

export type Quality = 'normal' | 'uncommon' | 'rare' | 'epic' | 'legendary' | undefined;

export interface SignalID {
    type?: SignalType  // Defaults to "item" if not specified
    name: string | VirtualSignalName
    quality?: Quality
}

export interface Icon {
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

export interface Filter {
    index: number
    name: string
    type?: string
    quality?: Quality
    comparator?: string // '=' | '≠' | '>' | '<' | '≥' | '≤'
    count?: number
    max_count?: number
}

interface SectionFilters {
    index: number
    filters?: Filter[]
    group?: string
    active?: boolean
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
        in_inventory: {
            inventory: number
            stack: number
        }[]
    }
}

export interface Entity {
    entity_number: number
    name: string
    position: Position
    direction?: number  // 0, 2, 4, 6 = North, East, South, West
    control_behavior?: ControlBehavior
    recipe?: string
    recipe_quality?: Quality
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
    quality?: Quality
}

export interface Wire {
    entity_number: number
    circuit_id: number
}

interface ScheduleRecord {
    station: string
    wait_conditions: {
        compare_type: 'and' | 'or'
        type: string
        condition?: CircuitCondition
        ticks?: number
    }[]
}

interface Schedule {
    locomotives: number[]
    schedule: {
        records: ScheduleRecord[]
    }
}

export interface Tile {
    position: Position
    name: string
}

export interface Parameter {
    type: 'id' | 'number'
    name: string
    id?: string
    number?: string
    variable?: string
    formula?: string
    dependent?: boolean
    'quality-condition'?: {
        quality: Quality
        comparator: string
    }
    'ingredient-of'?: string
}

// Common fields across all blueprint types
interface CommonFields {
    item: string
    label?: string
    version: number
}

export interface Blueprint extends CommonFields {
    item: 'blueprint'
    description?: string
    icons?: Icon[]
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

interface DeconstructionSettings {
    description?: string    // Added these metadata fields that can appear
    icons?: Icon[]
    entity_filters?: Filter[]
    tile_filters?: Filter[]  // Added this
    tile_selection_mode?: 1 | 2 | 3  // 1=default, 2=never, 3=always
    trees_and_rocks_only?: boolean
}

export interface DeconstructionPlanner extends CommonFields {
    item: 'deconstruction-planner'
    settings: DeconstructionSettings
}

interface UpgradeMapping {
    from?: SignalID
    to?: SignalID
    index: number
}

interface UpgradeSettings {
    description?: string
    icons?: Icon[]
    mappers: UpgradeMapping[]
}

export interface UpgradePlanner extends CommonFields {
    item: 'upgrade-planner'
    settings: UpgradeSettings
}

export interface BlueprintStringWithIndex extends BlueprintString {
    index: number
}

// Referenced interfaces for context
export interface BlueprintBook extends CommonFields {
    item: 'blueprint-book'
    label?: string
    description?: string
    icons?: Icon[]
    blueprints: BlueprintStringWithIndex[]
    active_index?: number
}

export interface BlueprintString {
    blueprint?: Blueprint
    blueprint_book?: BlueprintBook
    upgrade_planner?: UpgradePlanner
    deconstruction_planner?: DeconstructionPlanner
}

// Controlling trains
export interface StopBehavior {
    circuit_enabled?: boolean;
    logistic_condition?: CircuitCondition;
    read_from_train?: boolean;
    train_stopped_signal?: SignalID;
    send_to_train?: boolean;
    manual_trains_limit?: number;
    priority?: number;
}

// For stations
export interface Station {
    station?: string;
    color?: {
        r: number;
        g: number;
        b: number;
        a: number;
    };
}

export interface DisplayPanel extends Entity {
    text?: string;
    icon?: SignalID;
    always_show?: boolean;
}
