import type {Meta, StoryObj} from '@storybook/react-vite';
import {useState, type ComponentProps} from 'react';
import {expect, fn, userEvent, within} from 'storybook/test';

import {BlueprintTitleEditor} from './BlueprintTitleEditor';
import {transformStoryParameters} from './transformStoryParameters';

function StatefulBlueprintTitleEditor(args: ComponentProps<typeof BlueprintTitleEditor>) {
	const [label, setLabel] = useState(args.label);
	return (
		<BlueprintTitleEditor
			{...args}
			label={label}
			onLabelChange={(nextLabel) => {
				args.onLabelChange(nextLabel);
				setLabel(nextLabel);
			}}
		/>
	);
}

const meta = {
	title: 'Blueprint/Panels/Transform/BlueprintTitleEditor',
	component: BlueprintTitleEditor,
	args: {
		label: "Alice's reactor block",
		onLabelChange: fn(),
	},
	parameters: transformStoryParameters,
	render: (args) => <StatefulBlueprintTitleEditor {...args} />,
	tags: ['autodocs', 'visual-conformance'],
} satisfies Meta<typeof BlueprintTitleEditor>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Titled: Story = {
	play: async ({args, canvasElement}) => {
		const canvas = within(canvasElement);
		const titleEditor = canvas.getByTestId('blueprint-title-editor');
		const editButton = canvas.getByRole('button', {name: 'Edit blueprint title'});

		await expect({
			buttonStyle: editButton.dataset.factorioSourceStyle,
			buttonTooltip: editButton.title,
			editorSource: titleEditor.dataset.factorioSource,
			label: canvas.getByText("Alice's reactor block").textContent,
			labelStyle: canvas.getByText("Alice's reactor block").dataset.factorioStyle,
		}).toStrictEqual({
			buttonStyle: 'mini_button_aligned_to_text_vertically_when_centered',
			buttonTooltip: 'Edit label',
			editorSource: 'BlueprintLabelEdit',
			label: "Alice's reactor block",
			labelStyle: 'subheader_caption_label',
		});

		await userEvent.click(editButton);
		const input = canvas.getByRole<HTMLInputElement>('textbox', {name: 'Blueprint title'});
		await expect({
			activeElement: document.activeElement,
			maxLength: input.maxLength,
			saveButton: canvas.getByRole('button', {name: 'Save label'}).title,
			value: input.value,
		}).toStrictEqual({
			activeElement: input,
			maxLength: 200,
			saveButton: 'Save label',
			value: "Alice's reactor block",
		});

		await userEvent.clear(input);
		await userEvent.type(input, "Bob's reactor block");
		await userEvent.click(canvas.getByRole('button', {name: 'Save label'}));
		await expect({
			calls: args.onLabelChange.mock.calls,
			label: canvas.getByText("Bob's reactor block").textContent,
		}).toStrictEqual({
			calls: [["Bob's reactor block"]],
			label: "Bob's reactor block",
		});
	},
};

export const Untitled: Story = {
	args: {label: ''},
	play: async ({canvasElement}) => {
		const canvas = within(canvasElement);
		await expect({
			editButton: canvas.getByRole('button', {name: 'Edit blueprint title'}).title,
			unnamedLabel: canvas.getByText('<Unnamed blueprint>').textContent,
		}).toStrictEqual({
			editButton: 'Edit label',
			unnamedLabel: '<Unnamed blueprint>',
		});
	},
};
