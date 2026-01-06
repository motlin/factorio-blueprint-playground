import type {Meta, StoryObj} from '@storybook/react-vite';

import {ParametersPanel} from './ParametersPanel';

const meta: Meta<typeof ParametersPanel> = {
	title: 'Blueprint/Panels/Parameters/ParametersPanel',
	component: ParametersPanel,
	parameters: {
		layout: 'centered',
	},
	tags: ['autodocs'],
	decorators: [
		(StoryComponent) => (
			<div style={{minWidth: '800px'}}>
				<StoryComponent />
			</div>
		),
	],
};

export default meta;
type Story = StoryObj<typeof ParametersPanel>;

export const WithParameters: Story = {
	args: {
		blueprintString: {
			blueprint: {
				item: 'blueprint',
				version: 562949954076673,
				parameters: [
					{
						type: 'number',
						name: 'count',
						number: '100',
					},
					{
						type: 'id',
						name: 'item',
						id: 'iron-plate',
					},
				],
			},
		},
	},
};

export const WithComplexParameters: Story = {
	args: {
		blueprintString: {
			blueprint: {
				item: 'blueprint',
				version: 562949954076673,
				parameters: [
					{
						type: 'number',
						name: 'stack-size',
						number: '50',
						variable: 'x',
					},
					{
						type: 'number',
						name: 'total',
						number: '200',
						formula: 'x * 4',
					},
					{
						type: 'id',
						name: 'recipe',
						id: 'electronic-circuit',
					},
				],
			},
		},
	},
};

export const EmptyParameters: Story = {
	args: {
		blueprintString: {
			blueprint: {
				item: 'blueprint',
				version: 562949954076673,
				parameters: [],
			},
		},
	},
};

export const NoBlueprint: Story = {
	args: {
		blueprintString: undefined,
	},
};

export const NonBlueprintType: Story = {
	args: {
		blueprintString: {
			deconstruction_planner: {
				item: 'deconstruction-planner',
				version: 562949954076673,
				label: 'Test',
				settings: {},
			},
		},
	},
};
