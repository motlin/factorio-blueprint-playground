import * as matchers from '@testing-library/jest-dom/matchers';
import { cleanup } from '@testing-library/react';
import { expect, afterEach } from 'vitest';

// Add testing-library matchers
expect.extend(matchers);

// Cleanup after each test
afterEach(() => {
    cleanup();
});
