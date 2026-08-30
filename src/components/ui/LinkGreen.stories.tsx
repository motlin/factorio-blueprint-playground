import type {Meta, StoryObj} from '@storybook/react-vite';
import {expect, within} from 'storybook/test';

import {LinkGreen} from './LinkGreen';

const meta: Meta<typeof LinkGreen> = {
	title: 'UI/LinkGreen',
	component: LinkGreen,
	parameters: {
		layout: 'centered',
	},
	tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof LinkGreen>;

export const Default: Story = {
	args: {
		href: 'https://fbe.factorygamefan.com/',
		children: 'Open in Editor',
	},
};

export const OpensInNewTab: Story = {
	args: {
		href: 'https://fbe.factorygamefan.com/',
		children: 'Open in Editor',
	},
	play: async ({canvasElement}) => {
		const canvas = within(canvasElement);
		const link = canvas.getByRole('link', {name: 'Open in Editor'});

		await expect(link).toHaveAttribute('target', '_blank');
		await expect(link).toHaveAttribute('rel', 'noopener noreferrer');
	},
};
