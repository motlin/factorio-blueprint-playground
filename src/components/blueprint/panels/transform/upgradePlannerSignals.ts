import gameData from '../../../../generated/game-data.json';
import gameUiSpec from '../../../../generated/game-ui-spec.json';
import type {SignalID, UpgradeSourceSignal} from '../../../../parsing/types';

/**
 * Factorio 2.1.12 mapper endpoint eligibility contract:
 *
 * Empty and quality rules
 *
 * - Clearing either endpoint is always allowed. A newly confirmed From must have
 *   an eligible entity/item prototype; an empty prototype with only a quality
 *   condition is invalid. From uses an optional quality condition (Any or a
 *   comparator plus threshold), while To uses one exact quality.
 * - With no opposite endpoint, show all eligible sources or destinations. With
 *   one present, filter the other picker against it immediately. Unknown
 *   prototypes are not user choices.
 * - Source and destination must have the same entity-versus-item kind. An entity
 *   pair must be replace-compatible: fast-replace group, build position,
 *   collision geometry/mask, belt kind, and rolling-stock geometry all matter.
 *   An item pair must be module-to-module, module-to-empty-module-slot in either
 *   direction, or fuel-to-fuel.
 * - The same entity prototype is selectable when quality changes are available
 *   or when its module slots can be configured. This permits quality-only and
 *   module-plan records; an exact self-map may remain a no-op when applied.
 *
 * Module options
 *
 * - A module From may add an optional entity filter, limited to entities that
 *   support modules; no filter means all eligible entities.
 * - A module-item To may add a limit from 1 through the game-wide module-slot
 *   maximum. Zero/omitted means unlimited, and the last compatible limit survives
 *   toggling or a compatible target change.
 * - An entity To with module capacity may enable an explicit slot plan. Disabled
 *   means leave modules unchanged; enabled means a vector sized to that entity
 *   and quality, preserving empty positions. Module choices obey the target's
 *   allowed effects, and the slot plan itself is reorderable. Compatible values
 *   are retained and resized when the target changes.
 *
 * These predicates constrain both picker visibility and final confirmation.
 * `UpgradePlannerDialog` must not approximate them with blueprint occurrence or
 * a website-maintained next-upgrade list.
 *
 * Evidence: UpgradeItemGui, UpgradeFilterSelectListGui,
 * UpgradeDestinationSelectListGui, UpgradeData, UpgradeFilter,
 * UpgradeDestination, UpgradeIDBase, and UpgradeMapping at Factorio 2.1.12.
 */
export const pickerSignals: readonly SignalID[] = gameData.pickerSignals.map(({name, type}) => {
	switch (type) {
		case 'achievement':
		case 'fluid':
		case 'item':
		case 'item-group':
		case 'planet':
		case 'recipe':
		case 'space-location':
		case 'technology':
		case 'tile':
		case 'virtual':
			return {type, name};
		default:
			throw new Error(`Unknown generated picker signal type: ${type}`);
	}
});

const upgradeEntityItemNames = new Set(gameData.upgradeEntityItems);
const upgradeModuleNames = new Set(gameData.upgradeModuleItems);
const pickerSignalLayouts = new Map(
	gameData.pickerSignals.map(({group, hidden, name, subgroup, type}, index) => [
		`${type}:${name}`,
		{group, hidden, index, subgroup},
	]),
);
const nextUpgradeOrder = new Map<string, number>();
for (const {from, to} of gameUiSpec.upgrades.next) {
	if (!nextUpgradeOrder.has(from)) {
		nextUpgradeOrder.set(from, nextUpgradeOrder.size);
	}
	if (!nextUpgradeOrder.has(to)) {
		nextUpgradeOrder.set(to, nextUpgradeOrder.size);
	}
}
const upgradeEntityGroups = gameUiSpec.upgrades.groups.map((group) => ({
	...group,
	members: group.members.filter(({name}) => upgradeEntityItemNames.has(name)),
}));
const upgradeEntityNames = new Set(upgradeEntityGroups.flatMap(({members}) => members.map(({name}) => name)));
const beltPrototypeTypes = new Set(['splitter', 'transport-belt', 'underground-belt']);

function pickerSignalLayout(signal: SignalID) {
	const type = normalizedSignalType(signal);
	return (
		pickerSignalLayouts.get(`${type}:${signal.name}`) ??
		(type === 'entity' ? pickerSignalLayouts.get(`item:${signal.name}`) : undefined)
	);
}

export function comparePickerSignalOrder(left: SignalID, right: SignalID): number {
	const leftLayout = pickerSignalLayout(left);
	const rightLayout = pickerSignalLayout(right);
	if (leftLayout === undefined && rightLayout === undefined) {
		return 0;
	}
	return (
		(leftLayout?.index ?? Number.MAX_SAFE_INTEGER) - (rightLayout?.index ?? Number.MAX_SAFE_INTEGER) ||
		left.name.localeCompare(right.name)
	);
}

function compareUpgradeTargetOrder(left: SignalID, right: SignalID): number {
	return (
		(nextUpgradeOrder.get(left.name) ?? Number.MAX_SAFE_INTEGER) -
			(nextUpgradeOrder.get(right.name) ?? Number.MAX_SAFE_INTEGER) || comparePickerSignalOrder(left, right)
	);
}

function appendCurrentOption(options: SignalID[], currentSource: SignalID | undefined): SignalID[] {
	if (
		currentSource === undefined ||
		options.some((option) => signalPrototypeIdentity(option) === signalPrototypeIdentity(currentSource))
	) {
		return options;
	}
	return [...options, currentSource];
}

export function normalizedSignalType(signal: SignalID): string {
	if (signal.type === 'virtual-signal') {
		return 'virtual';
	}
	return signal.type ?? 'item';
}

export function signalIdentity(signal: UpgradeSourceSignal): string {
	return [normalizedSignalType(signal), signal.name, signal.quality ?? 'normal', signal.comparator ?? '='].join(':');
}

export function signalName(signal: SignalID): string {
	const words = signal.name.replace(/^signal-/, 'signal ').replaceAll('-', ' ');
	return words.slice(0, 1).toUpperCase() + words.slice(1);
}

export function signalTitle(signal: UpgradeSourceSignal): string {
	const quality = signal.quality === undefined ? '' : `\nQuality: ${signal.comparator ?? '='} ${signal.quality}`;
	return `${signalName(signal)}\n${normalizedSignalType(signal)}:${signal.name}${quality}`;
}

export function signalPrototypeIdentity(signal: SignalID): string {
	return `${normalizedSignalType(signal)}:${signal.name}`;
}

export function signalPickerGroup(signal: SignalID): string | undefined {
	return pickerSignalLayout(signal)?.group;
}

export function signalPickerHidden(signal: SignalID): boolean {
	return pickerSignalLayout(signal)?.hidden ?? false;
}

export function signalPickerSubgroup(signal: SignalID): string {
	return pickerSignalLayout(signal)?.subgroup ?? `unmapped-${normalizedSignalType(signal)}`;
}

export function isUpgradeSourceOption(signal: SignalID): boolean {
	const type = normalizedSignalType(signal);
	return (
		(type === 'entity' && upgradeEntityNames.has(signal.name)) ||
		(type === 'item' && upgradeModuleNames.has(signal.name))
	);
}

export function upgradeSourceOptions(currentSource?: SignalID): SignalID[] {
	const generatedOptions = [
		...upgradeEntityGroups.flatMap(({members}) => members.map(({name}): SignalID => ({type: 'entity', name}))),
		...gameData.upgradeModuleItems.map((name): SignalID => ({type: 'item', name})),
	].sort(comparePickerSignalOrder);
	return appendCurrentOption(generatedOptions, currentSource);
}

export function isUpgradeTargetSelectionAllowed(source: UpgradeSourceSignal, target: SignalID): boolean {
	return upgradeTargetOptions(source).some(
		(option) => normalizedSignalType(option) === normalizedSignalType(target) && option.name === target.name,
	);
}

/**
 * Unsupported endpoint fields from imported planners remain opaque. They are
 * retained when compatibility is knowable without runtime prototype data:
 * module limits survive module-to-module changes, and entity module-slot plans
 * survive quality changes on the same prototype. A different entity prototype
 * resets opaque fields because slot counts and allowed effects are dynamic.
 */
export function replaceUpgradeTarget(currentTarget: SignalID | undefined, nextTarget: SignalID): SignalID {
	if (currentTarget === undefined) {
		return {...nextTarget};
	}
	const samePrototype = signalPrototypeIdentity(currentTarget) === signalPrototypeIdentity(nextTarget);
	const compatibleModules =
		normalizedSignalType(currentTarget) === 'item' &&
		normalizedSignalType(nextTarget) === 'item' &&
		upgradeModuleNames.has(currentTarget.name) &&
		upgradeModuleNames.has(nextTarget.name);
	return samePrototype || compatibleModules ? {...currentTarget, ...nextTarget} : {...nextTarget};
}

export function upgradeTargetOptions(source: UpgradeSourceSignal): SignalID[] {
	if (normalizedSignalType(source) === 'item' && upgradeModuleNames.has(source.name)) {
		return gameData.upgradeModuleItems.map((name) => ({type: 'item', name}));
	}
	if (normalizedSignalType(source) !== 'entity') {
		return [];
	}
	const sourceGroup = upgradeEntityGroups.find(({members}) => members.some(({name}) => name === source.name));
	const sourceMember = sourceGroup?.members.find(({name}) => name === source.name);
	if (sourceGroup === undefined || sourceMember === undefined) {
		return [];
	}
	return sourceGroup.members
		.filter(
			({prototypeType}) =>
				!beltPrototypeTypes.has(sourceMember.prototypeType) || prototypeType === sourceMember.prototypeType,
		)
		.map(({name}): SignalID => ({type: 'entity', name}))
		.sort(compareUpgradeTargetOrder);
}
