import preact from '@preact/preset-vite';
import {TanStackRouterVite} from '@tanstack/router-plugin/vite';
import {defineConfig} from 'vite';

export default defineConfig({
    plugins: [
        preact(),
        TanStackRouterVite({
            generatedRouteTree: './src/routeTree.gen.ts', // Specify the output path
            routesDirectory: './src/routes',              // Specify the routes directory
        }),
    ],
    build: {
        target: 'esnext',
    },
});
