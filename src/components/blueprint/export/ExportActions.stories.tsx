import type {Meta, StoryObj} from '@storybook/react-vite';

import {ExportActions} from './ExportActions';

const meta: Meta<typeof ExportActions> = {
	title: 'Blueprint/Export/ExportActions',
	component: ExportActions,
	parameters: {
		layout: 'centered',
	},
	tags: ['autodocs'],
	decorators: [
		(Story) => (
			<div style={{minWidth: '500px'}}>
				<Story />
			</div>
		),
	],
};

export default meta;
type Story = StoryObj<typeof ExportActions>;

export const Default: Story = {
	args: {
		blueprint: {
			blueprint: {
				item: 'blueprint',
				version: 562949954076673,
				label: 'Iron Smelting',
			},
		},
		title: 'Blueprint',
	},
};

export const WithPath: Story = {
	args: {
		blueprint: {
			blueprint: {
				item: 'blueprint',
				version: 562949954076673,
				label: 'Iron Smelting',
			},
		},
		path: '0.1.2',
		title: 'Nested Blueprint',
	},
};

export const BlueprintBook: Story = {
	args: {
		blueprint: {
			blueprint_book: {
				item: 'blueprint-book',
				version: 562949954076673,
				label: 'Factory Collection',
				blueprints: [],
			},
		},
		title: 'Blueprint Book',
	},
};

export const NoBlueprint: Story = {
	args: {
		blueprint: undefined,
		title: 'Empty',
	},
};
