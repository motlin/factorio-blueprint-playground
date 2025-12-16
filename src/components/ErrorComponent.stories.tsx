import type {Meta, StoryObj} from '@storybook/react-vite';

import {ErrorComponent} from './ErrorComponent';

const meta: Meta<typeof ErrorComponent> = {
	title: 'Components/ErrorComponent',
	component: ErrorComponent,
	parameters: {
		layout: 'centered',
	},
	tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof ErrorComponent>;

export const BasicError: Story = {
	args: {
		error: {
			message: 'Something went wrong while processing your request.',
		},
	},
};

export const ErrorWithStatus: Story = {
	args: {
		error: {
			message: 'The requested resource was not found.',
			status: 404,
		},
	},
};

export const ServerError: Story = {
	args: {
		error: {
			message: 'Internal server error occurred.',
			status: 500,
		},
	},
};

export const LongErrorMessage: Story = {
	args: {
		error: {
			message:
				'This is a longer error message that explains in detail what went wrong during the operation and provides some context about what the user might do to resolve the issue.',
			status: 400,
		},
	},
};
