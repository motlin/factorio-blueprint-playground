import preact from '@preact/preset-vite';
import {TanStackRouterVite} from '@tanstack/router-plugin/vite';
import {defineConfig} from 'vite';

export default defineConfig({
    plugins: [
        preact(),
        TanStackRouterVite({
            generatedRouteTree: './src/routeTree.gen.ts',
            routesDirectory: './src/routes',
        }),
    ],
    build: {
        target: 'esnext',
        // Enable minification
        minify: 'esbuild',
        // Enable tree shaking
        modulePreload: {
            polyfill: true,
        },
    },
});