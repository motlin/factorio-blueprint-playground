import type {Meta, StoryObj} from '@storybook/react-vite';
import {expect, fn, userEvent, within} from 'storybook/test';

import {BlueprintTableCheckbox} from './BlueprintTableCheckbox';

const meta: Meta<typeof BlueprintTableCheckbox> = {
	title: 'History/Table/BlueprintTableCheckbox',
	component: BlueprintTableCheckbox,
	parameters: {
		layout: 'centered',
	},
	tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof BlueprintTableCheckbox>;

export const Unchecked: Story = {
	args: {
		isSelected: false,
		onToggle: fn(),
	},
};

export const Checked: Story = {
	args: {
		isSelected: true,
		onToggle: fn(),
	},
};

export const ToggleInteraction: Story = {
	args: {
		isSelected: false,
		onToggle: fn(),
	},
	play: async ({canvasElement, args}) => {
		const canvas = within(canvasElement);
		const checkbox = canvas.getByTestId('blueprint-checkbox');

		await expect(checkbox).toBeInTheDocument();
		await expect(checkbox).not.toBeChecked();

		await userEvent.click(checkbox);
		await expect(args.onToggle).toHaveBeenCalledTimes(1);
	},
};
