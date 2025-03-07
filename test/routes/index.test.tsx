import {describe, expect, it} from 'vitest';

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
      } as any);
      
      expect(result).toEqual({
        pasted: 'blueprint',
        selection: '1',
      });
    });

    it('should use catch() to handle non-string values', () => {
      const result = searchSchema.parse({
        pasted: 123,
        selection: true,
      } as any);
      
      expect(result).toEqual({
        pasted: undefined,
        selection: undefined,
      });
    });
  });
});
