// test/parsing/types.ts

/**
 * Test case types used across blueprint tests
 */
export const TEST_CASES = ['simple', 'book', 'upgrade', 'deconstruction'] as const
export type TestCase = typeof TEST_CASES[number]