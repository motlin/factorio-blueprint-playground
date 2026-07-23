interface Position {
	x: number;
	y: number;
}

export type SignalType =
	| 'item'
	| 'fluid'
	| 'virtual'
	| 'entity'
	| 'technology'
	| 'recipe'
	| 'item-group'
	| 'tile'
	| 'virtual-signal'
	| 'achievement'
	| 'equipment'
	| 'planet'
	| 'quality'
	| 'utility'
	| 'space-location';

export type Quality = 'normal' | 'uncommon' | 'rare' | 'epic' | 'legendary' | undefined;
export type QualityComparator = '=' | '!=' | '<' | '<=' | '>' | '>=' | '≠' | '≤' | '≥';

export interface SignalID {
	// Defaults to "item" if not specified
	type?: SignalType;
	name: string;
	quality?: Quality;
}

export interface UpgradeSourceSignal extends SignalID {
	comparator?: QualityComparator;
}

export interface Icon {
	signal: SignalID;
	// 1-based index, max 4 icons
	index: number;
}

interface NetworkPorts {
	red: boolean;
	green: boolean;
}

interface CircuitCondition {
	first_signal?: SignalID;
	second_signal?: SignalID;
	constant?: number;
	comparator?: '=' | '>' | '<' | '≥' | '≤' | '≠';
	first_signal_networks?: NetworkPorts;
	second_signal_networks?: NetworkPorts;
}

interface DeciderCondition extends CircuitCondition {
	compare_type?: 'and' | 'or';
}

interface ConditionOutput {
	signal: SignalID;
	copy_count_from_input?: boolean;
	networks?: NetworkPorts;
}

interface DeciderCombinatorConditions {
	conditions: DeciderCondition[];
	outputs: ConditionOutput[];
}

interface ArithmeticCondition {
	first_signal: SignalID;
	second_signal?: SignalID;
	second_constant?: number;
	operation: '+' | '-' | '*' | '/' | '^' | '%' | '<<' | '>>' | 'AND' | 'OR' | 'XOR';
	output_signal: SignalID;
	first_signal_networks?: NetworkPorts;
	second_signal_networks?: NetworkPorts;
}

interface DisplayPanelParameter {
	condition: {
		first_signal: SignalID;
		constant: number;
		comparator: '=' | '>' | '<' | '≥' | '≤' | '≠';
	};
	icon?: SignalID;
}

export interface Filter {
	index: number;
	name: string;
	type?: string;
	quality?: Quality;
	// '=' | '≠' | '>' | '<' | '≥' | '≤'
	comparator?: string;
	count?: number;
	max_count?: number;
}

interface SectionFilters {
	index: number;
	filters?: Filter[];
	group?: string;
	active?: boolean;
}

interface ControlBehavior {
	// Circuit network conditions
	circuit_enabled?: boolean;
	circuit_condition?: CircuitCondition;
	connect_to_logistic_network?: boolean;
	logistic_condition?: CircuitCondition;

	// Circuit read modes
	circuit_read_hand_contents?: boolean;
	circuit_hand_read_mode?: number;
	circuit_contents_read_mode?: number;
	circuit_read_resources?: boolean;

	// Item/recipe control
	set_recipe?: boolean;
	read_contents?: boolean;
	read_ingredients?: true;
	circuit_set_stack_size?: boolean;
	circuit_condition_enabled?: boolean;
	circuit_mode_of_operation?: number;

	// Train control
	read_from_train?: boolean;
	train_stopped_signal?: SignalID;
	send_to_train?: boolean;

	// Specialized controls
	read_robot_stats?: boolean;
	decider_conditions?: DeciderCombinatorConditions;
	arithmetic_conditions?: ArithmeticCondition;
	parameters?: DisplayPanelParameter[];

	// Display/lamp controls
	use_colors?: boolean;
	color_mode?: number;
	red_signal?: SignalID;
	green_signal?: SignalID;
	blue_signal?: SignalID;

	// Random operation (for selector combinators)
	operation?: 'random';
	random_update_interval?: number;

	// Sections (for combinators)
	sections?: {
		sections: SectionFilters[];
	};
}

export interface ItemStack {
	id: {
		name: string;
		quality?: Quality;
	};
	items: {
		in_inventory: {
			inventory: number;
			stack: number;
			count?: number;
		}[];
	};
}

export interface Entity {
	entity_number: number;
	name: string;
	position: Position;
	// 0, 2, 4, 6 = North, East, South, West
	direction?: number;
	control_behavior?: ControlBehavior;
	recipe?: string;
	recipe_quality?: Quality;
	request_filters?: {
		sections: SectionFilters[];
		request_from_buffers?: boolean;
		trash_not_requested?: boolean;
	};
	filter_mode?: 'whitelist' | 'blacklist';
	use_filters?: boolean;
	override_stack_size?: number;
	bar?: number;
	filters?: Filter[];
	items?: ItemStack[];
	transitional_request_index?: number;
	icon?: SignalID;
	always_show?: boolean;
	color?: {
		r: number;
		g: number;
		b: number;
		a: number;
	};
	spoil_priority?: 'fresh-first' | 'spoiled-first';
	// For underground belts - "input" or "output"
	type?: string;
	manual_trains_limit?: number;
	priority?: number;
	station?: string;
	// For display panels
	text?: string;
	quality?: Quality;
}

interface ScheduleRecord {
	station: string;
	wait_conditions: {
		compare_type: 'and' | 'or';
		type: string;
		condition?: CircuitCondition;
		ticks?: number;
	}[];
}

interface Schedule {
	locomotives: number[];
	schedule: {
		records: ScheduleRecord[];
	};
}

export interface Tile {
	position: Position;
	name: string;
}

export interface Parameter {
	type: 'id' | 'number';
	name: string;
	id?: string;
	number?: string;
	variable?: string;
	formula?: string;
	dependent?: boolean;
	'not-parametrised'?: boolean;
	'quality-condition'?: {
		quality: Quality;
		comparator: string;
	};
	'ingredient-of'?: string;
}

// Common fields across all blueprint types
interface CommonFields {
	item: string;
	label?: string;
	version: number;
}

export interface Blueprint extends CommonFields {
	item: 'blueprint';
	description?: string;
	icons?: Icon[];
	entities?: Entity[];
	wires?: [number, number, number, number][];
	tiles?: Tile[];
	schedules?: Schedule[];
	parameters?: Parameter[];
	'snap-to-grid'?: {
		x: number;
		y: number;
	};
	'absolute-snapping'?: boolean;
	'position-relative-to-grid'?: {
		x: number;
		y: number;
	};
}

interface DeconstructionSettings {
	// Added these metadata fields that can appear
	description?: string;
	icons?: Icon[];
	entity_filters?: Filter[];
	// 0=allow, 1=deny
	entity_filter_mode?: 0 | 1;
	tile_filters?: Filter[];
	// 1=default, 2=never, 3=always
	tile_selection_mode?: 1 | 2 | 3;
	trees_and_rocks_only?: boolean;
}

export interface DeconstructionPlanner extends CommonFields {
	item: 'deconstruction-planner';
	settings: DeconstructionSettings;
}

export interface UpgradeMapping {
	from?: UpgradeSourceSignal;
	to?: SignalID;
	index: number;
}

interface UpgradeSettings {
	description?: string;
	icons?: Icon[];
	mappers: UpgradeMapping[];
}

export interface UpgradePlanner extends CommonFields {
	item: 'upgrade-planner';
	settings: UpgradeSettings;
}

export interface BlueprintStringWithIndex extends BlueprintString {
	index: number;
}

// Referenced interfaces for context
export interface BlueprintBook extends CommonFields {
	item: 'blueprint-book';
	label?: string;
	description?: string;
	icons?: Icon[];
	blueprints: BlueprintStringWithIndex[];
	active_index?: number;
}

export interface BlueprintString {
	blueprint?: Blueprint;
	blueprint_book?: BlueprintBook;
	upgrade_planner?: UpgradePlanner;
	deconstruction_planner?: DeconstructionPlanner;
}
