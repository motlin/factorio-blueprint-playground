import type {BlueprintString, Entity, Icon} from '../parsing/types';
import {TIER_FAMILIES, TIER_LOOKUP} from './tierMap';
import {mapBlueprints} from './visit';

export interface ShiftTierOptions {
	includeSpaceAge?: boolean;
	remapIcons?: boolean;
}

function getShiftedName(name: string, delta: 1 | -1, includeSpaceAge: boolean): string {
	const lookupEntry = TIER_LOOKUP.get(name);
	if (lookupEntry === undefined) {
		return name;
	}

	const family = TIER_FAMILIES[lookupEntry.familyIndex];
	const firstSpaceAgeIndex = family.tiers.findIndex((tier) => tier.spaceAge === true);
	const highestNonSpaceAgeIndex = firstSpaceAgeIndex === -1 ? family.tiers.length - 1 : firstSpaceAgeIndex - 1;
	const maximumTierIndex = includeSpaceAge
		? family.tiers.length - 1
		: Math.max(lookupEntry.tierIndex, highestNonSpaceAgeIndex);
	const shiftedIndex = Math.min(maximumTierIndex, Math.max(0, lookupEntry.tierIndex + delta));
	const shiftedTier = family.tiers[shiftedIndex];

	return shiftedTier.name;
}

function shiftEntity(entity: Entity, delta: 1 | -1, includeSpaceAge: boolean): Entity {
	return {...entity, name: getShiftedName(entity.name, delta, includeSpaceAge)};
}

function shiftIcon(icon: Icon, delta: 1 | -1, includeSpaceAge: boolean): Icon {
	return {
		...icon,
		signal: {...icon.signal, name: getShiftedName(icon.signal.name, delta, includeSpaceAge)},
	};
}

export function shiftTier(root: BlueprintString, delta: 1 | -1, options: ShiftTierOptions = {}): BlueprintString {
	const includeSpaceAge = options.includeSpaceAge ?? false;
	const remapIcons = options.remapIcons ?? true;

	return mapBlueprints(root, (blueprint) => {
		const entities =
			blueprint.entities === undefined
				? {}
				: {entities: blueprint.entities.map((entity) => shiftEntity(entity, delta, includeSpaceAge))};
		const icons =
			blueprint.icons === undefined
				? {}
				: {
						icons: remapIcons
							? blueprint.icons.map((icon) => shiftIcon(icon, delta, includeSpaceAge))
							: blueprint.icons,
					};

		return {...blueprint, ...entities, ...icons};
	});
}
