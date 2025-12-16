import type {Meta, StoryObj} from '@storybook/react-vite';

import {InsetLight} from './InsetLight';

const meta: Meta<typeof InsetLight> = {
	title: 'UI/InsetLight',
	component: InsetLight,
	parameters: {
		layout: 'centered',
	},
	tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof InsetLight>;

export const Default: Story = {
	args: {
		children: <p style={{padding: '8px'}}>Light inset content</p>,
	},
};

export const WithTable: Story = {
	args: {
		children: (
			<table style={{width: '100%', padding: '8px'}}>
				<tbody>
					<tr>
						<td>Item 1</td>
						<td>Value 1</td>
					</tr>
					<tr>
						<td>Item 2</td>
						<td>Value 2</td>
					</tr>
				</tbody>
			</table>
		),
	},
};
