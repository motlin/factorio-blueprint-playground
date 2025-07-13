import {TanStackRouterVite} from '@tanstack/router-plugin/vite';
import react from '@vitejs/plugin-react';
import {defineConfig} from 'vite';

export default defineConfig(() => {
	return {
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
						react: ['react', 'react-dom'],
						'react-router': ['@tanstack/react-router'],
						fflate: ['fflate'],
						dexie: ['dexie', 'dexie-react-hooks'],
					},
				},
			},
			sourcemap: true,
		},
	};
});
