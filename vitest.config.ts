import {defineConfig} from 'vitest/config'

export default defineConfig({
    test: {
        environment: 'jsdom',
        globals: true,
        setupFiles: ['./test/setup.ts'],
        // Add this to ensure proper functioning with Preact
        alias: {
            'react': 'preact/compat',
            'react-dom': 'preact/compat'
        }
    }
})