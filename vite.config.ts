import {TanStackRouterVite} from '@tanstack/router-plugin/vite';
import react from '@vitejs/plugin-react';
import {visualizer} from 'rollup-plugin-visualizer';
import {defineConfig, loadEnv} from 'vite';

export default defineConfig(({mode}) => {
    // Load environment variables
    const env = loadEnv(mode, process.cwd(), '');

    return {
        plugins: [
            react(),
            TanStackRouterVite({
                generatedRouteTree: './src/routeTree.gen.ts',
                routesDirectory: './src/routes',
            }),
            visualizer({
                open: env.VITE_VISUALIZER_OPEN !== 'false',
                gzipSize: true,
                brotliSize: true,
            }),
        ],
        build: {
            rollupOptions: {
                output: {
                    manualChunks: {
                        'react': ['react', 'react-dom'],
                        'react-router': ['@tanstack/react-router'],
                        'fflate': ['fflate'],
                    },
                },
            },
            sourcemap: true,
        },
    };
});
