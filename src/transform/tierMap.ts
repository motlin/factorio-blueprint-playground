export interface TierFamily {
	category: 'transport-belt' | 'underground-belt' | 'splitter' | 'assembling-machine' | 'inserter';
	tiers: readonly {name: string; spaceAge?: boolean}[];
}

interface TierLookupEntry {
	familyIndex: number;
	tierIndex: number;
}

export const TIER_FAMILIES: readonly TierFamily[] = [
	{
		category: 'transport-belt',
		tiers: [
			{name: 'transport-belt'},
			{name: 'fast-transport-belt'},
			{name: 'express-transport-belt'},
			{name: 'turbo-transport-belt', spaceAge: true},
		],
	},
	{
		category: 'underground-belt',
		tiers: [
			{name: 'underground-belt'},
			{name: 'fast-underground-belt'},
			{name: 'express-underground-belt'},
			{name: 'turbo-underground-belt', spaceAge: true},
		],
	},
	{
		category: 'splitter',
		tiers: [
			{name: 'splitter'},
			{name: 'fast-splitter'},
			{name: 'express-splitter'},
			{name: 'turbo-splitter', spaceAge: true},
		],
	},
	{
		category: 'assembling-machine',
		tiers: [{name: 'assembling-machine-1'}, {name: 'assembling-machine-2'}, {name: 'assembling-machine-3'}],
	},
	{
		category: 'inserter',
		tiers: [
			{name: 'inserter'},
			{name: 'fast-inserter'},
			{name: 'bulk-inserter'},
			{name: 'stack-inserter', spaceAge: true},
		],
	},
];

function createTierLookup(): ReadonlyMap<string, TierLookupEntry> {
	const lookup = new Map<string, TierLookupEntry>();

	TIER_FAMILIES.forEach((family, familyIndex) => {
		if (family.tiers.length < 2) {
			throw new Error(`Tier family ${family.category} must contain at least two tiers`);
		}

		family.tiers.forEach((tier, tierIndex) => {
			if (lookup.has(tier.name)) {
				throw new Error(`Duplicate entity in tier map: ${tier.name}`);
			}
			lookup.set(tier.name, {familyIndex, tierIndex});
		});
	});

	return lookup;
}

export const TIER_LOOKUP = createTierLookup();
