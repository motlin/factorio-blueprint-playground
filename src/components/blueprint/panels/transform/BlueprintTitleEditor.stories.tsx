import type {Meta, StoryObj} from '@storybook/react-vite';
import {fn} from 'storybook/test';

import {BlueprintTitleEditor} from './BlueprintTitleEditor';
import {transformStoryParameters} from './transformStoryParameters';

const meta = {
	title: 'Blueprint/Panels/Transform/BlueprintTitleEditor',
	component: BlueprintTitleEditor,
	args: {
		label: "Alice's reactor block",
		onLabelChange: fn(),
	},
	parameters: transformStoryParameters,
	tags: ['autodocs'],
} satisfies Meta<typeof BlueprintTitleEditor>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Titled: Story = {};

export const Untitled: Story = {
	args: {label: ''},
};
