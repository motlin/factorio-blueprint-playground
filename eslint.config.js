import pluginRouter from '@tanstack/eslint-plugin-router';

export default [
	{
		ignores: ['node_modules/**', 'dist/**', '.llm/**', 'coverage/**', 'src/routeTree.gen.ts'],
	},
	...pluginRouter.configs['flat/recommended'],
];
