import {describe, expect, test} from 'vite-plus/test';

import {librarySearchSchema} from '../../src/routes/library';

describe('Blueprint Library route search', () => {
	test('preserves a nested book location for reload and history-shelf round trips', () => {
		expect(
			librarySearchSchema.parse({
				shelf: 'history',
				book: 'book-bob',
			}),
		).toStrictEqual({
			shelf: 'history',
			book: 'book-bob',
		});
	});

	test('uses the Library root for absent or invalid search values', () => {
		expect([librarySearchSchema.parse({}), librarySearchSchema.parse({shelf: 'unknown', book: ''})]).toStrictEqual([
			{},
			{shelf: undefined, book: undefined},
		]);
	});
});
