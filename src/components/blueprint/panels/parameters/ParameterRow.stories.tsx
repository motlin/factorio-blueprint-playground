import type {Meta, StoryObj} from '@storybook/react-vite';

import {ParameterRow} from './ParameterRow';

const meta: Meta<typeof ParameterRow> = {
	title: 'Blueprint/Panels/Parameters/ParameterRow',
	component: ParameterRow,
	parameters: {
		layout: 'centered',
	},
	tags: ['autodocs'],
	decorators: [
		(Story) => (
			<div style={{minWidth: '800px', padding: '16px'}}>
				<Story />
			</div>
		),
	],
};

export default meta;
type Story = StoryObj<typeof ParameterRow>;

export const NumberParameter: Story = {
	args: {
		param: {
			type: 'number',
			name: 'count',
			number: '100',
		},
		parameters: [],
	},
};

export const NumberWithVariable: Story = {
	args: {
		param: {
			type: 'number',
			name: 'stack-size',
			number: '50',
			variable: 'x',
		},
		parameters: [],
	},
};

export const NumberWithFormula: Story = {
	args: {
		param: {
			type: 'number',
			name: 'total',
			number: '200',
			formula: 'x * 2',
		},
		parameters: [],
	},
};

export const IdParameter: Story = {
	args: {
		param: {
			type: 'id',
			name: 'item',
			id: 'iron-plate',
		},
		parameters: [],
	},
};

export const VirtualSignalId: Story = {
	args: {
		param: {
			type: 'id',
			name: 'signal',
			id: 'signal-A',
		},
		parameters: [],
	},
};

export const NonParametrised: Story = {
	args: {
		param: {
			type: 'number',
			name: 'constant',
			number: '42',
			'not-parametrised': true,
		},
		parameters: [],
	},
};

export const WithIngredientOf: Story = {
	args: {
		param: {
			type: 'id',
			name: 'ingredient',
			id: 'copper-plate',
			'ingredient-of': 'parameter-1',
		},
		parameters: [
			{
				type: 'id',
				name: 'recipe',
				id: 'electronic-circuit',
			},
		],
	},
};
