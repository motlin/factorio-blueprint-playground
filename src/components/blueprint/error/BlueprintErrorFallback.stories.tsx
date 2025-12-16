import type {Meta, StoryObj} from '@storybook/react-vite';
import {fn} from 'storybook/test';

import {BlueprintErrorFallback} from './BlueprintErrorFallback';

const meta: Meta<typeof BlueprintErrorFallback> = {
	title: 'Blueprint/Error/BlueprintErrorFallback',
	component: BlueprintErrorFallback,
	parameters: {
		layout: 'centered',
	},
	tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof BlueprintErrorFallback>;

export const Default: Story = {
	args: {
		error: new Error('Invalid blueprint string'),
		resetErrorBoundary: fn(),
	},
};

export const ParsingError: Story = {
	args: {
		error: new Error('Failed to parse blueprint: unexpected token at position 42'),
		resetErrorBoundary: fn(),
	},
};

export const NetworkError: Story = {
	args: {
		error: new Error('Failed to fetch blueprint from URL'),
		resetErrorBoundary: fn(),
	},
};
