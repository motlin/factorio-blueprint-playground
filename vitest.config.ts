import {storybookTest} from '@storybook/addon-vitest/vitest-plugin';
import {playwright} from '@vitest/browser-playwright';
import path from 'node:path';
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
						maxWorkers: 2,
						setupFiles: ['./test/setup.ts'],
						exclude: ['.llm/**', 'node_modules/**'],
					},
				}),
				{
					extends: true,
					plugins: [
						storybookTest({
							configDir: path.join(import.meta.dirname, '.storybook'),
							tags: {include: ['visual-conformance']},
						}),
					],
					test: {
						name: 'storybook',
						browser: {
							enabled: true,
							headless: true,
							provider: playwright({}),
							instances: [{browser: 'chromium'}],
						},
						setupFiles: ['./.storybook/vitest.setup.ts'],
					},
				},
			],
		},
	}),
);
