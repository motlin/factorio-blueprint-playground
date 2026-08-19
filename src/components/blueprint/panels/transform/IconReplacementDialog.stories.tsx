import type {Meta, StoryObj} from '@storybook/react-vite';
import {expect, fn, userEvent, within} from 'storybook/test';

import {IconReplacementDialog} from './IconReplacementDialog';
import {transformStoryParameters} from './transformStoryParameters';

const meta = {
	title: 'Blueprint/Panels/Transform/IconReplacementDialog',
	component: IconReplacementDialog,
	args: {
		onChange: fn(),
		onClose: fn(),
		replacements: [
			{
				from: {type: 'virtual', name: 'signal-red'},
				to: {type: 'virtual', name: 'signal-blue'},
			},
		],
		rootBlueprint: {
			blueprint_book: {
				item: 'blueprint-book',
				version: 0,
				icons: [{index: 1, signal: {type: 'virtual', name: 'signal-red'}}],
				blueprints: [
					{
						index: 100,
						blueprint: {
							item: 'blueprint',
							version: 0,
							icons: [{index: 1, signal: {type: 'virtual', name: 'signal-red'}}],
						},
					},
				],
			},
		},
	},
	parameters: transformStoryParameters,
	tags: ['autodocs'],
} satisfies Meta<typeof IconReplacementDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

export const VirtualSignalMapping: Story = {
	play: async ({canvasElement}) => {
		const canvas = within(canvasElement);
		const source = canvas.getByRole('button', {name: 'Source Signal red'});
		const name = canvas.getByText('Signal red', {selector: '.icon-replacement-editor__name'});
		await userEvent.hover(source);
		await expect(name).toBeVisible();
		await userEvent.unhover(source);
		source.focus();
		await expect(name).toBeVisible();
	},
};
