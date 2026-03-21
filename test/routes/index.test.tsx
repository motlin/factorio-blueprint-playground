import {describe, expect, it} from 'vite-plus/test';

import {searchSchema} from '../../src/routes';

describe('Root route search schema', () => {
	describe('validation', () => {
		it('should accept valid pasted and selection parameters', () => {
			const result = searchSchema.parse({
				pasted: 'some-blueprint-string',
				selection: '1.2.3',
			});

			expect(result).toEqual({
				pasted: 'some-blueprint-string',
				selection: '1.2.3',
			});
		});

		it('should handle empty parameters', () => {
			const result = searchSchema.parse({});

			expect(result).toEqual({
				pasted: undefined,
				selection: undefined,
			});
		});

		it('should handle undefined values', () => {
			const result = searchSchema.parse({
				pasted: undefined,
				selection: undefined,
			});

			expect(result).toEqual({
				pasted: undefined,
				selection: undefined,
			});
		});

		it('should ignore extra parameters', () => {
			const result = searchSchema.parse({
				pasted: 'blueprint',
				selection: '1',
				extraParam: 'should be ignored',
			});

			expect(result).toEqual({
				pasted: 'blueprint',
				selection: '1',
			});
		});

		it('should use catch() to handle non-string values', () => {
			const result = searchSchema.parse({
				pasted: 123,
				selection: true,
			});

			expect(result).toEqual({
				pasted: undefined,
				selection: undefined,
			});
		});

		it('should accept valid fetchType parameter', () => {
			const result = searchSchema.parse({
				pasted: 'some-blueprint-string',
				selection: '1.2.3',
				fetchType: 'edit',
			});

			expect(result).toEqual({
				pasted: 'some-blueprint-string',
				selection: '1.2.3',
				fetchType: 'edit',
			});
		});

		it('should reject invalid fetchType parameter', () => {
			const result = searchSchema.parse({
				pasted: 'some-blueprint-string',
				fetchType: 'invalid-type',
			});

			expect(result).toEqual({
				pasted: 'some-blueprint-string',
				fetchType: undefined,
			});
		});
	});

	describe('deep linking to edited blueprints', () => {
		it('should handle edited blueprint links', () => {
			const result = searchSchema.parse({
				pasted: 'some-blueprint-string',
				selection: '1.2.3',
				fetchType: 'edit',
			});

			expect(result.fetchType).toBe('edit');
		});
	});
});
