import {TanStackRouterVite} from '@tanstack/router-plugin/vite';
import react from '@vitejs/plugin-react';
import {defineConfig} from 'vitest/config';

export default defineConfig({
    plugins: [
        react(),
        TanStackRouterVite({
            generatedRouteTree: './src/routeTree.gen.ts',
            routesDirectory: './src/routes',
        }),
    ],
    build: {
        rollupOptions: {
            output: {
                manualChunks: {
                    'react': ['react', 'react-dom'],
                    'react-router': ['@tanstack/react-router'],
                    'fflate': ['fflate'],
                    'dexie': ['dexie', 'dexie-react-hooks'],
                },
            },
        },
        sourcemap: true,
    },
    test: {
        environment: 'jsdom',
        globals: true,
        setupFiles: ['./test/setup.ts'],
        exclude: ['.llm/**', 'node_modules/**'],
    },
});
