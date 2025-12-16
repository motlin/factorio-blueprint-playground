import type {Meta, StoryObj} from '@storybook/react-vite';

import {ParametersList} from './ParametersList';

const meta: Meta<typeof ParametersList> = {
	title: 'Blueprint/Panels/Parameters/ParametersList',
	component: ParametersList,
	parameters: {
		layout: 'centered',
	},
	tags: ['autodocs'],
	decorators: [
		(Story) => (
			<div style={{minWidth: '800px'}}>
				<Story />
			</div>
		),
	],
};

export default meta;
type Story = StoryObj<typeof ParametersList>;

export const SingleParameter: Story = {
	args: {
		parameters: [
			{
				type: 'number',
				name: 'count',
				number: '100',
			},
		],
	},
};

export const MultipleParameters: Story = {
	args: {
		parameters: [
			{
				type: 'number',
				name: 'stack-size',
				number: '50',
				variable: 'x',
			},
			{
				type: 'id',
				name: 'item',
				id: 'iron-plate',
			},
			{
				type: 'number',
				name: 'total',
				number: '200',
				formula: 'x * 4',
			},
		],
	},
};

export const MixedParameters: Story = {
	args: {
		parameters: [
			{
				type: 'id',
				name: 'recipe',
				id: 'electronic-circuit',
			},
			{
				type: 'id',
				name: 'ingredient',
				id: 'copper-plate',
				'ingredient-of': 'parameter-1',
			},
			{
				type: 'number',
				name: 'quantity',
				number: '3',
			},
		],
	},
};

export const EmptyList: Story = {
	args: {
		parameters: [],
	},
};
