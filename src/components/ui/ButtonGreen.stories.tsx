import type {Meta, StoryObj} from '@storybook/react-vite';
import {expect, fn, userEvent, within} from 'storybook/test';

import {ButtonGreen} from './ButtonGreen';

const meta: Meta<typeof ButtonGreen> = {
	title: 'UI/ButtonGreen',
	component: ButtonGreen,
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
type Story = StoryObj<typeof ButtonGreen>;

export const Default: Story = {
	args: {
		children: 'Green Action',
		disabled: false,
	},
};

export const Disabled: Story = {
	args: {
		children: 'Disabled Green',
		disabled: true,
	},
};

export const WithIcon: Story = {
	args: {
		children: (
			<>
				<span>Export</span>
			</>
		),
		disabled: false,
	},
};

export const ClickInteraction: Story = {
	args: {
		children: 'Click me',
		disabled: false,
		onClick: fn(),
	},
	play: async ({canvasElement, args}) => {
		const canvas = within(canvasElement);
		const button = canvas.getByRole('button', {name: 'Click me'});

		await expect(button).toBeInTheDocument();
		await expect(button).toHaveStyle({display: 'inline-flex'});

		await userEvent.click(button);
		await expect(args.onClick).toHaveBeenCalledTimes(1);
	},
};
