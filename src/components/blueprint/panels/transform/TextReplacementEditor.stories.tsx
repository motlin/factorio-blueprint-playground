import type {Meta, StoryObj} from '@storybook/react-vite';
import {expect, fn, within} from 'storybook/test';

import {TextReplacementEditor} from './TextReplacementEditor';
import {transformStoryParameters} from './transformStoryParameters';

const meta = {
	title: 'Blueprint/Panels/Transform/TextReplacementEditor',
	component: TextReplacementEditor,
	args: {
		affectedCount: 0,
		enabled: false,
		find: '',
		onEnabledChange: fn(),
		onFindChange: fn(),
		onReplacementChange: fn(),
		replacement: '',
	},
	parameters: transformStoryParameters,
	tags: ['autodocs', 'visual-conformance'],
} satisfies Meta<typeof TextReplacementEditor>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Unused: Story = {
	play: async ({canvasElement}) => {
		const canvas = within(canvasElement);
		await expect({
			count: canvas.getByText('0 affected').textContent,
			preserveCase: canvas.queryByRole('checkbox', {name: /preserve/i}),
			scope: canvas.getByText('Replaces text in titles and descriptions only.').textContent,
			toggle: canvas.queryByRole('checkbox', {name: 'Enable text replacement'}),
		}).toStrictEqual({
			count: '0 affected',
			preserveCase: null,
			scope: 'Replaces text in titles and descriptions only.',
			toggle: null,
		});
	},
};

export const ConfiguredEnabled: Story = {
	args: {
		affectedCount: 3,
		enabled: true,
		find: 'Red',
		replacement: 'Blue',
	},
	play: async ({canvasElement}) => {
		const canvas = within(canvasElement);
		await expect({
			count: canvas.getByText('3 affected').textContent,
			find: canvas.getByRole<HTMLInputElement>('textbox', {name: 'Find'}).value,
			replace: canvas.getByRole<HTMLInputElement>('textbox', {name: 'Replace'}).value,
			toggleChecked: canvas.getByRole<HTMLInputElement>('checkbox', {name: 'Enable text replacement'}).checked,
		}).toStrictEqual({
			count: '3 affected',
			find: 'Red',
			replace: 'Blue',
			toggleChecked: true,
		});
	},
};

export const ConfiguredDisabled: Story = {
	args: {
		affectedCount: 0,
		enabled: false,
		find: 'Red',
		replacement: 'Blue',
	},
	play: async ({canvasElement}) => {
		const toggle = within(canvasElement).getByRole<HTMLInputElement>('checkbox', {
			name: 'Enable text replacement',
		});
		await expect(toggle.checked).toBe(false);
	},
};
