import {storybookTest} from '@storybook/addon-vitest/vitest-plugin';
import {playwright} from '@vitest/browser-playwright';
import {defineConfig} from 'vitest/config';

export default defineConfig({
	plugins: [
		storybookTest({
			storybookScript: 'npm run storybook -- --ci',
			tags: {
				include: ['test'],
			},
		}),
	],
	resolve: {
		conditions: ['browser'],
	},
	define: {
		'process.env.NODE_ENV': '"test"',
	},
	optimizeDeps: {
		include: ['react', 'react-dom'],
	},
	test: {
		name: 'storybook',
		browser: {
			enabled: true,
			provider: playwright({
				launch: {
					headless: true,
				},
			}),
			instances: [
				{
					browser: 'chromium',
				},
			],
		},
		setupFiles: ['./.storybook/vitest.setup.ts'],
		exclude: ['**/node_modules/**', '**/dist/**', '**/.wrangler/**'],
	},
});
