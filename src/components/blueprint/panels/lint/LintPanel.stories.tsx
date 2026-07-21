import type {Meta, StoryObj} from '@storybook/react-vite';

import {LintPanel} from './LintPanel';

const meta: Meta<typeof LintPanel> = {
	title: 'Blueprint/Panels/Lint/LintPanel',
	component: LintPanel,
	parameters: {layout: 'centered'},
	tags: ['autodocs'],
	decorators: [
		(StoryComponent) => (
			<div style={{minWidth: '520px'}}>
				<StoryComponent />
			</div>
		),
	],
};

export default meta;
type Story = StoryObj<typeof LintPanel>;

export const WithFindings: Story = {
	args: {
		blueprint: {
			blueprint: {
				item: 'blueprint',
				version: 562949958139904,
				entities: [
					{
						entity_number: 100,
						name: 'fast-underground-belt',
						position: {x: 0, y: 0},
						direction: 4,
						type: 'input',
					},
				],
			},
		},
	},
};

export const EmptyBlueprint: Story = {
	args: {
		blueprint: {
			blueprint: {item: 'blueprint', version: 562949958139904},
		},
	},
};

export const NoFindings: Story = {
	args: {
		blueprint: {
			blueprint: {
				item: 'blueprint',
				version: 562949958139904,
				entities: [{entity_number: 100, name: 'alice-modded-entity', position: {x: 0, y: 0}}],
			},
		},
	},
};
