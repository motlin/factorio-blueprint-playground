import type {Meta, StoryObj} from '@storybook/react-vite';
import {expect, fn, userEvent, within} from 'storybook/test';

import {BlueprintDescriptionEditor} from './BlueprintDescriptionEditor';
import {transformStoryParameters} from './transformStoryParameters';

const longDescription = [
	'[item=transport-belt,quality=legendary] Main bus upgrade',
	'Keep this deliberately long line wrapped inside the description field without creating horizontal overflow.',
	'Input lanes: iron, copper, steel, circuits, plastic, stone, coal, and lubricant.',
	'Output lanes: upgraded belts, underground belts, and splitters.',
	'The next uninterrupted token also has to wrap:',
	'signalredsignalredsignalredsignalredsignalredsignalredsignalredsignalredsignalredsignalred',
	'Preserve the final line while the field scrolls vertically.',
].join('\n');

const meta = {
	title: 'Blueprint/Panels/Transform/BlueprintDescriptionEditor',
	component: BlueprintDescriptionEditor,
	args: {
		description: '',
		onDescriptionChange: fn(),
	},
	parameters: transformStoryParameters,
	tags: ['autodocs', 'visual-conformance'],
} satisfies Meta<typeof BlueprintDescriptionEditor>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Empty: Story = {
	play: async ({canvasElement}) => {
		const canvas = within(canvasElement);
		const heading = canvas.getByRole('heading', {name: 'Description'});
		const textarea = canvas.getByRole<HTMLTextAreaElement>('textbox', {
			name: 'Blueprint description',
		});
		const section = textarea.closest('section');
		if (section === null) {
			throw new Error('Expected the description bordered frame.');
		}

		await expect({
			collapsibleControl: section.querySelector('button'),
			frameSource: section.getAttribute('data-factorio-source'),
			frameStyle: section.getAttribute('data-factorio-style'),
			headingStyle: heading.getAttribute('data-factorio-style'),
			maxLength: textarea.maxLength,
			textboxSource: textarea.dataset.factorioSource,
			textboxStyle: textarea.dataset.factorioStyle,
			wrap: textarea.wrap,
		}).toStrictEqual({
			collapsibleControl: null,
			frameSource: 'BlueprintSettingsGui::makeDescriptionFrame',
			frameStyle: 'bordered_frame',
			headingStyle: 'caption_label',
			maxLength: 500,
			textboxSource: 'BlueprintSettingsGui::descriptionEdit',
			textboxStyle: 'edit_blueprint_description_textbox',
			wrap: 'soft',
		});
	},
};

export const LongWrappedAndFocused: Story = {
	args: {
		description: longDescription,
	},
	play: async ({canvasElement}) => {
		const canvas = within(canvasElement);
		const textarea = canvas.getByRole<HTMLTextAreaElement>('textbox', {
			name: 'Blueprint description',
		});

		await userEvent.click(textarea);
		textarea.setSelectionRange(1, 25);
		const style = getComputedStyle(textarea);
		const bounds = textarea.getBoundingClientRect();

		await expect(textarea).toHaveFocus();
		await expect({
			geometry: {height: bounds.height},
			horizontalOverflow: style.overflowX,
			resize: style.resize,
			scrollsVertically: textarea.scrollHeight > textarea.clientHeight,
			selection: [textarea.selectionStart, textarea.selectionEnd],
			verticalOverflow: style.overflowY,
			whiteSpace: style.whiteSpace,
			wordBreak: style.overflowWrap,
		}).toStrictEqual({
			geometry: {height: 120},
			horizontalOverflow: 'hidden',
			resize: 'none',
			scrollsVertically: true,
			selection: [1, 25],
			verticalOverflow: 'auto',
			whiteSpace: 'pre-wrap',
			wordBreak: 'break-word',
		});
	},
};
