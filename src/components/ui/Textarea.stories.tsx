import type {Meta, StoryObj} from '@storybook/react-vite';
import {useState} from 'react';

import {Textarea} from './Textarea';

const meta: Meta<typeof Textarea> = {
	title: 'UI/Textarea',
	component: Textarea,
	parameters: {
		layout: 'centered',
	},
	tags: ['autodocs'],
	argTypes: {
		rows: {control: {type: 'number', min: 1, max: 20}},
		placeholder: {control: 'text'},
	},
};

export default meta;
type Story = StoryObj<typeof Textarea>;

const TextareaWithState = (args: {placeholder?: string; rows?: number}) => {
	const [value, setValue] = useState('');
	return (
		<div style={{width: '400px'}}>
			<Textarea
				value={value}
				onChange={setValue}
				placeholder={args.placeholder}
				rows={args.rows}
			/>
		</div>
	);
};

export const Default: Story = {
	render: () => <TextareaWithState placeholder="Enter blueprint string..." />,
};

export const WithRows: Story = {
	render: () => (
		<TextareaWithState
			placeholder="Larger textarea"
			rows={8}
		/>
	),
};

export const SmallRows: Story = {
	render: () => (
		<TextareaWithState
			placeholder="Compact textarea"
			rows={2}
		/>
	),
};
