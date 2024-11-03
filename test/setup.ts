import { expect, afterEach } from 'vitest'
import { cleanup } from '@testing-library/preact'
import * as matchers from '@testing-library/jest-dom/matchers'

// Add testing-library matchers
expect.extend(matchers)

// Cleanup after each test
afterEach(() => {
    cleanup()
})