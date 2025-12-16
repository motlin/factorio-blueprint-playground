import type {Meta, StoryObj} from '@storybook/react-vite';

import {InsetDark} from './InsetDark';

const meta: Meta<typeof InsetDark> = {
	title: 'UI/InsetDark',
	component: InsetDark,
	parameters: {
		layout: 'centered',
	},
	tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof InsetDark>;

export const Default: Story = {
	args: {
		children: <p style={{padding: '8px'}}>Dark inset content</p>,
	},
};

export const WithCode: Story = {
	args: {
		children: <pre style={{padding: '8px', margin: 0}}>{'0eNqNkN0KgzAMhe...'}</pre>,
	},
};
