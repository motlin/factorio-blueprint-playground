import preact from '@preact/preset-vite';
import {TanStackRouterVite} from '@tanstack/router-plugin/vite';
import { visualizer } from 'rollup-plugin-visualizer';
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
    ],
    build: {
        target: 'esnext',
        minify: 'esbuild',
        modulePreload: {
            polyfill: true,
        },
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
        cssCodeSplit: true,
        sourcemap: true,
        assetsInlineLimit: 4096,
        chunkSizeWarningLimit: 1000,
    },
});
