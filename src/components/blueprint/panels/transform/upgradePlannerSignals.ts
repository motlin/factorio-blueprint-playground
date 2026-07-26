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

function upgradeModuleFamily(signal: SignalID): string | undefined {
	if (normalizedSignalType(signal) !== 'item') {
		return undefined;
	}
	return signal.name.match(/^(efficiency|productivity|quality|speed)-module(?:-[23])?$/)?.[1];
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

export function isUpgradeSourceOption(signal: SignalID): boolean {
	return normalizedSignalType(signal) === 'entity' || upgradeModuleFamily(signal) !== undefined;
}

export function isUpgradeTargetSelectionAllowed(source: UpgradeSourceSignal, target: SignalID): boolean {
	return upgradeTargetOptions(source, target).some(
		(option) => normalizedSignalType(option) === normalizedSignalType(target) && option.name === target.name,
	);
}

export function upgradeTargetOptions(source: UpgradeSourceSignal, currentTarget: SignalID): SignalID[] {
	const adjacent = new Map<string, Set<string>>();
	for (const {from, to} of gameUiSpec.upgrades.next) {
		const fromTargets = adjacent.get(from) ?? new Set<string>();
		fromTargets.add(to);
		adjacent.set(from, fromTargets);
		const toTargets = adjacent.get(to) ?? new Set<string>();
		toTargets.add(from);
		adjacent.set(to, toTargets);
	}
	const visited = new Set([source.name]);
	const pending = [source.name];
	while (pending.length > 0) {
		const current = pending.shift();
		if (current === undefined) {
			break;
		}
		for (const candidate of adjacent.get(current) ?? []) {
			if (!visited.has(candidate)) {
				visited.add(candidate);
				pending.push(candidate);
			}
		}
	}
	if (
		normalizedSignalType(source) !== 'entity' &&
		normalizedSignalType(source) === normalizedSignalType(currentTarget)
	) {
		visited.add(currentTarget.name);
	}
	const moduleFamily = upgradeModuleFamily(source);
	if (moduleFamily !== undefined) {
		return [`${moduleFamily}-module`, `${moduleFamily}-module-2`, `${moduleFamily}-module-3`].map((name) => ({
			type: currentTarget.type ?? source.type,
			name,
		}));
	}
	return [...visited].map((name) => ({type: currentTarget.type ?? source.type, name}));
}
