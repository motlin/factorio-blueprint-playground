import type {Meta, StoryObj} from '@storybook/react-vite';
import {fn} from 'storybook/test';

import {BookWideReplacements} from './BookWideReplacements';
import {transformStoryParameters} from './transformStoryParameters';

const meta = {
	title: 'Blueprint/Panels/Transform/BookWideReplacements',
	component: BookWideReplacements,
	args: {
		iconMappingCount: 2,
		iconReplacementCount: 5,
		metadataFind: 'Alice',
		metadataReplace: 'Bob',
		metadataReplacementCount: 3,
		onIconReplacementsOpen: fn(),
		onMetadataFindChange: fn(),
		onMetadataReplaceChange: fn(),
		onTextReplacementEnabledChange: fn(),
		textReplacementEnabled: true,
	},
	parameters: transformStoryParameters,
	tags: ['autodocs'],
} satisfies Meta<typeof BookWideReplacements>;

export default meta;
type Story = StoryObj<typeof meta>;

export const ActiveReplacements: Story = {};
