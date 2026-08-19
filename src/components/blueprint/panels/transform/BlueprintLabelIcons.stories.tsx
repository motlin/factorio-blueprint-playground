import type {Meta, StoryObj} from '@storybook/react-vite';
import {fn} from 'storybook/test';

import {BlueprintLabelIcons} from './BlueprintLabelIcons';
import {transformStoryParameters} from './transformStoryParameters';

const meta = {
	title: 'Blueprint/Panels/Transform/BlueprintLabelIcons',
	component: BlueprintLabelIcons,
	args: {
		icons: [
			{type: 'item', name: 'iron-plate'},
			{type: 'entity', name: 'transport-belt'},
		],
		onChange: fn(),
		onChoose: fn(),
		signalTitle: (signal) => `${signal.type ?? 'item'}:${signal.name}`,
	},
	decorators: [
		(StoryComponent) => (
			<div className="blueprint-editor__icons">
				<div>
					<StoryComponent />
				</div>
			</div>
		),
	],
	parameters: transformStoryParameters,
	tags: ['autodocs'],
} satisfies Meta<typeof BlueprintLabelIcons>;

export default meta;
type Story = StoryObj<typeof meta>;

export const TwoFilledSlots: Story = {};
