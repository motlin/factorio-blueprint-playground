import {describe, expect, it} from 'vitest';

import {BlueprintFetchMethod} from '../../src/fetching/blueprintFetcher';
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
			} as Record<string, unknown>);

			expect(result).toEqual({
				pasted: 'blueprint',
				selection: '1',
				fetchType: undefined,
				focusTextarea: undefined,
			});
		});

		it('should use catch() to handle non-string values', () => {
			const result = searchSchema.parse({
				pasted: 123,
				selection: true,
			} as Record<string, unknown>);

			expect(result).toEqual({
				pasted: undefined,
				selection: undefined,
				fetchType: undefined,
				focusTextarea: undefined,
			});
		});

		it('should accept valid fetchType parameter', () => {
			const result = searchSchema.parse({
				pasted: 'some-blueprint-string',
				selection: '1.2.3',
				fetchType: 'edit' as BlueprintFetchMethod,
			});

			expect(result).toEqual({
				pasted: 'some-blueprint-string',
				selection: '1.2.3',
				fetchType: 'edit',
				focusTextarea: undefined,
			});
		});

		it('should reject invalid fetchType parameter', () => {
			const result = searchSchema.parse({
				pasted: 'some-blueprint-string',
				fetchType: 'invalid-type',
			} as Record<string, unknown>);

			expect(result).toEqual({
				pasted: 'some-blueprint-string',
				selection: undefined,
				fetchType: undefined,
				focusTextarea: undefined,
			});
		});
	});

	describe('deep linking to edited blueprints', () => {
		it('should handle edited blueprint links', () => {
			const result = searchSchema.parse({
				pasted: 'some-blueprint-string',
				selection: '1.2.3',
				fetchType: 'edit' as BlueprintFetchMethod,
			});

			expect(result.fetchType).toBe('edit');
		});
	});
});
