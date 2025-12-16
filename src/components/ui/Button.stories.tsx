import type {Meta, StoryObj} from '@storybook/react-vite';
import {expect, fn, userEvent, within} from 'storybook/test';

import {Button} from './Button';

const meta: Meta<typeof Button> = {
	title: 'UI/Button',
	component: Button,
	parameters: {
		layout: 'centered',
	},
	tags: ['autodocs'],
	argTypes: {
		onClick: {action: 'clicked'},
		disabled: {control: 'boolean'},
	},
};

export default meta;
type Story = StoryObj<typeof Button>;

export const Default: Story = {
	args: {
		children: 'Click me',
		disabled: false,
	},
};

export const Disabled: Story = {
	args: {
		children: 'Disabled Button',
		disabled: true,
	},
};

export const WithLongText: Story = {
	args: {
		children: 'This is a button with longer text',
		disabled: false,
	},
};

export const ClickInteraction: Story = {
	args: {
		children: 'Click to test',
		disabled: false,
		onClick: fn(),
	},
	play: async ({canvasElement, args}) => {
		const canvas = within(canvasElement);
		const button = canvas.getByRole('button', {name: 'Click to test'});

		await expect(button).toBeInTheDocument();
		await expect(button).not.toBeDisabled();

		await userEvent.click(button);
		await expect(args.onClick).toHaveBeenCalledTimes(1);
	},
};

export const DisabledButtonDoesNotTriggerClick: Story = {
	args: {
		children: 'Disabled - cannot click',
		disabled: true,
		onClick: fn(),
	},
	play: async ({canvasElement, args}) => {
		const canvas = within(canvasElement);
		const button = canvas.getByRole('button', {name: 'Disabled - cannot click'});

		await expect(button).toBeInTheDocument();
		await expect(button).toBeDisabled();

		await userEvent.click(button);
		await expect(args.onClick).not.toHaveBeenCalled();
	},
};
