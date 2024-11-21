import preact from '@preact/preset-vite';
import {sentryVitePlugin} from '@sentry/vite-plugin';
import {TanStackRouterVite} from '@tanstack/router-plugin/vite';
import {visualizer} from 'rollup-plugin-visualizer';
import {defineConfig} from 'vite';

export default defineConfig({
    plugins: [
        preact(),
        TanStackRouterVite({
            generatedRouteTree: './src/routeTree.gen.ts',
            routesDirectory: './src/routes',
        }),
        visualizer({
            open: true,
            gzipSize: true,
            brotliSize: true,
        }),
        sentryVitePlugin({
            org: 'na-w6b',
            project: 'factorio-blueprints-playground',
        }),
    ],
    build: {
        rollupOptions: {
            output: {
                manualChunks: {
                    'preact': ['preact', '@preact/signals'],
                    'react-router': ['@tanstack/react-router'],
                    'fflate': ['fflate'],
                    'idb-keyval': ['idb-keyval'],
                },
            },
        },
        sourcemap: true,
    },
});
