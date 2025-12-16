import type {Meta, StoryObj} from '@storybook/react-vite';

import {Panel} from './Panel';

const meta: Meta<typeof Panel> = {
	title: 'UI/Panel',
	component: Panel,
	parameters: {
		layout: 'centered',
	},
	tags: ['autodocs'],
	argTypes: {
		title: {control: 'text'},
	},
};

export default meta;
type Story = StoryObj<typeof Panel>;

export const Default: Story = {
	args: {
		children: <p>Panel content goes here.</p>,
	},
};

export const WithTitle: Story = {
	args: {
		title: 'Blueprint Info',
		children: <p>This panel has a title and some content.</p>,
	},
};

export const WithComplexContent: Story = {
	args: {
		title: 'Complex Panel',
		children: (
			<div>
				<p>This panel contains multiple elements:</p>
				<ul>
					<li>List item 1</li>
					<li>List item 2</li>
					<li>List item 3</li>
				</ul>
			</div>
		),
	},
};
