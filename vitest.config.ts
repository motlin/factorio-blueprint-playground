import {defineConfig, defineProject, mergeConfig} from 'vite-plus';
import viteConfig from './vite.config';

export default mergeConfig(
	viteConfig,
	defineConfig({
		test: {
			projects: [
				defineProject({
					test: {
						name: 'unit',
						globals: true,
						environment: 'jsdom',
						setupFiles: ['./test/setup.ts'],
						exclude: ['.llm/**', 'node_modules/**'],
					},
				}),
			],
		},
	}),
);
