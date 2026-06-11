import type {StorybookConfig} from '@storybook/react-vite';

const config: StorybookConfig = {
	stories: ['../src/**/*.mdx', '../src/**/*.stories.@(js|jsx|mjs|ts|tsx)'],
	addons: [
		'@chromatic-com/storybook',
		'@storybook/addon-docs',
		'@storybook/addon-a11y',
		'@storybook/addon-onboarding',
		{
			name: '@storybook/addon-vitest',
			options: {
				configDir: '.storybook',
			},
		},
	],
	framework: {
		name: '@storybook/react-vite',
		options: {},
	},
};
export default config;
