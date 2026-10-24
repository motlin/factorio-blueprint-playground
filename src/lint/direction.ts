import {parseVersion4} from '../parsing/blueprintParser';

export type Direction16 = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15;

const DIRECTION_COUNT = 16;
const VERSION_1_DIRECTION_COUNT = 8;

function asDirection16(direction: number): Direction16 {
	if (!Number.isInteger(direction) || direction < 0 || direction >= DIRECTION_COUNT) {
		throw new RangeError(`Direction must be an integer from 0 to 15; received ${direction}.`);
	}

	// oxlint-disable-next-line typescript/no-unsafe-type-assertion -- Range validation above narrows the numeric value at runtime.
	return direction as Direction16;
}

export function versionMajor(version: number): number {
	const [major] = parseVersion4(version).split('.');
	return Number(major);
}

export function normalizeDirection(rawDirection: number | undefined, major: number): Direction16 {
	const direction = rawDirection ?? 0;
	if (major < 2 && (!Number.isInteger(direction) || direction < 0 || direction >= VERSION_1_DIRECTION_COUNT)) {
		throw new RangeError(`Factorio 1.x direction must be an integer from 0 to 7; received ${direction}.`);
	}

	return asDirection16(major < 2 ? direction * 2 : direction);
}

export function isCardinal(direction: number): direction is 0 | 4 | 8 | 12 {
	return direction === 0 || direction === 4 || direction === 8 || direction === 12;
}

export function unitVector(direction: Direction16): {dx: number; dy: number} {
	if (!isCardinal(direction)) {
		throw new RangeError(`Direction ${direction} is not cardinal.`);
	}

	const vectors = {
		0: {dx: 0, dy: -1},
		4: {dx: 1, dy: 0},
		8: {dx: 0, dy: 1},
		12: {dx: -1, dy: 0},
	} as const;
	return vectors[direction];
}

export function opposite(direction: Direction16): Direction16 {
	return asDirection16((direction + DIRECTION_COUNT / 2) % DIRECTION_COUNT);
}
