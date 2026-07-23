import gameData from '../../../../generated/game-data.json';
import type {SignalID, UpgradeSourceSignal} from '../../../../parsing/types';

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

export function isUpgradeTargetSelectionAllowed(
	source: UpgradeSourceSignal,
	target: SignalID,
	preserveQuality: boolean,
): boolean {
	const samePrototype = normalizedSignalType(source) === normalizedSignalType(target) && source.name === target.name;
	return !samePrototype || (!preserveQuality && target.quality !== undefined);
}

export function upgradeTargetOptions(source: UpgradeSourceSignal, currentTarget: SignalID): SignalID[] {
	const adjacent = new Map<string, Set<string>>();
	for (const {from, to} of gameData.nextUpgrades) {
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
			...currentTarget,
			name,
		}));
	}
	return [...visited].map((name) => ({...currentTarget, name}));
}
