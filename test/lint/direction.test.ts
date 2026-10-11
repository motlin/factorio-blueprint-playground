import {describe, expect, test} from 'vite-plus/test';

import {isCardinal, normalizeDirection, opposite, unitVector, versionMajor} from '../../src/lint/direction';

describe('direction', () => {
	test('extracts the major version', () => {
		expect(versionMajor(281479278886912)).toBe(1);
		expect(versionMajor(562949958139904)).toBe(2);
	});

	test('normalizes missing and version-specific direction encodings', () => {
		expect([normalizeDirection(undefined, 1), normalizeDirection(2, 1), normalizeDirection(4, 2)]).toStrictEqual([
			0, 4, 4,
		]);
	});

	test('identifies cardinal directions', () => {
		expect(Array.from({length: 16}, (_, direction) => isCardinal(direction))).toStrictEqual([
			true,
			false,
			false,
			false,
			true,
			false,
			false,
			false,
			true,
			false,
			false,
			false,
			true,
			false,
			false,
			false,
		]);
	});

	test('returns Factorio tile vectors for cardinal directions', () => {
		expect([unitVector(0), unitVector(4), unitVector(8), unitVector(12)]).toStrictEqual([
			{dx: 0, dy: -1},
			{dx: 1, dy: 0},
			{dx: 0, dy: 1},
			{dx: -1, dy: 0},
		]);
	});

	test('returns opposite directions', () => {
		expect([opposite(0), opposite(4), opposite(8), opposite(12)]).toStrictEqual([8, 12, 0, 4]);
	});
});
