export const UNDERGROUND_BELT_SPAN = {
	'underground-belt': 5,
	'fast-underground-belt': 7,
	'express-underground-belt': 9,
	'turbo-underground-belt': 11,
} as const satisfies Record<string, number>;

export const PIPE_TO_GROUND_SPAN = {
	'pipe-to-ground': 10,
} as const satisfies Record<string, number>;
