import type {Meta, StoryObj} from '@storybook/react-vite';

import {ErrorAlert} from './ErrorAlert';

const meta: Meta<typeof ErrorAlert> = {
	title: 'UI/ErrorAlert',
	component: ErrorAlert,
	parameters: {
		layout: 'centered',
	},
	tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof ErrorAlert>;

export const WithStringError: Story = {
	args: {
		error: 'Invalid blueprint string format',
	},
};

export const WithErrorObject: Story = {
	args: {
		error: new Error('Failed to decode blueprint: Invalid base64 encoding'),
	},
};

export const WithStackTrace: Story = {
	render: () => {
		const error = new Error('Blueprint parsing failed');
		error.stack = `Error: Blueprint parsing failed
    at decodeBlueprint (src/parsing/decoder.ts:42:15)
    at parseBlueprint (src/parsing/parser.ts:18:10)
    at BlueprintPlayground (src/components/BlueprintPlayground.tsx:25:8)`;
		return <ErrorAlert error={error} />;
	},
};

export const NoError: Story = {
	args: {
		error: undefined,
	},
};
