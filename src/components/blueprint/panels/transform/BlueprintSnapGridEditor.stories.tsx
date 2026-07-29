import type {Meta, StoryObj} from '@storybook/react-vite';
import {useState, type ComponentProps} from 'react';
import {expect, fn, userEvent, within} from 'storybook/test';

import {BlueprintSnapGridEditor} from './BlueprintSnapGridEditor';
import {transformStoryParameters} from './transformStoryParameters';

function StatefulBlueprintSnapGridEditor(args: ComponentProps<typeof BlueprintSnapGridEditor>) {
	const [settings, setSettings] = useState(args.settings);
	return (
		<BlueprintSnapGridEditor
			{...args}
			settings={settings}
			onChange={(nextSettings) => {
				args.onChange(nextSettings);
				setSettings(nextSettings);
			}}
		/>
	);
}

const meta = {
	title: 'Blueprint/Panels/Transform/BlueprintSnapGridEditor',
	component: BlueprintSnapGridEditor,
	args: {
		onChange: fn(),
		settings: {
			absolute: true,
			enabled: true,
			height: 64,
			positionX: 0,
			positionY: -16,
			width: 32,
		},
	},
	parameters: transformStoryParameters,
	decorators: [
		(StoryComponent) => (
			<div style={{width: 'min(432px, 100vw)'}}>
				<StoryComponent />
			</div>
		),
	],
	render: (args) => <StatefulBlueprintSnapGridEditor {...args} />,
	tags: ['autodocs', 'visual-conformance'],
} satisfies Meta<typeof BlueprintSnapGridEditor>;

export default meta;
type Story = StoryObj<typeof meta>;

export const EnabledAbsolute: Story = {
	play: async ({args, canvasElement}) => {
		const canvas = within(canvasElement);
		const master = canvas.getByRole<HTMLInputElement>('checkbox', {name: 'Snap to grid'});
		const heading = canvas.getByRole('heading', {name: 'Snap to grid'});
		const fieldset = canvas.getByRole('group', {name: 'Snap to grid settings'});
		const width = canvas.getByRole<HTMLInputElement>('spinbutton', {name: 'Width'});
		const height = canvas.getByRole<HTMLInputElement>('spinbutton', {name: 'Height'});
		const dimensionRow = width.closest('.blueprint-snap-grid-editor__dimensions');
		const positionX = canvas.getByRole<HTMLInputElement>('spinbutton', {name: 'X'});
		const section = master.closest('section');
		if (section === null || dimensionRow === null) {
			throw new Error('Expected the snap-to-grid bordered frame and dimension row.');
		}
		const dimensionGridTemplate =
			section.getBoundingClientRect().width <= 400
				? '45.3594px 40px 50.7031px 40px'
				: '110px 81.9375px 45.3594px 40px 50.7031px 40px';

		await expect({
			controlCount: fieldset.querySelectorAll('input').length,
			dimensions: {
				cells: [...dimensionRow.children].map((cell) => cell.textContent),
				columns: dimensionRow.getAttribute('data-factorio-columns'),
				gridTemplate: getComputedStyle(dimensionRow).gridTemplateColumns,
				height: {
					inputMode: height.inputMode,
					min: height.min,
					step: height.step,
					style: height.dataset.factorioStyle,
				},
				source: dimensionRow.getAttribute('data-factorio-source'),
				width: {
					inputMode: width.inputMode,
					min: width.min,
					step: width.step,
					style: width.dataset.factorioStyle,
				},
			},
			fieldsetControlledByMaster: master.getAttribute('aria-controls') === fieldset.id,
			fieldsetSource: fieldset.dataset.factorioSource,
			fieldsetStyle: {
				border: getComputedStyle(fieldset).borderStyle,
				opacity: getComputedStyle(fieldset).opacity,
			},
			frameSource: section.dataset.factorioSource,
			frameStyle: section.dataset.factorioStyle,
			headingStyle: heading.dataset.factorioStyle,
			masterOutsideFieldset: !fieldset.contains(master),
			numberWidth: width.getBoundingClientRect().width,
		}).toStrictEqual({
			controlCount: 6,
			dimensions: {
				cells: ['Grid size', '', 'Width:', '', 'Height:', ''],
				columns: '6',
				gridTemplate: dimensionGridTemplate,
				height: {
					inputMode: 'numeric',
					min: '1',
					step: '1',
					style: 'very_short_number_textfield',
				},
				source: 'BlueprintSettingsGui::makeSnappingsFrame',
				width: {
					inputMode: 'numeric',
					min: '1',
					step: '1',
					style: 'very_short_number_textfield',
				},
			},
			fieldsetControlledByMaster: true,
			fieldsetSource: 'BlueprintSettingsGui::updateEditabilityOfSnapToGrid',
			fieldsetStyle: {border: 'none', opacity: '1'},
			frameSource: 'BlueprintSettingsGui::makeSnappingsFrame',
			frameStyle: 'bordered_frame',
			headingStyle: 'caption_checkbox',
			masterOutsideFieldset: true,
			numberWidth: 40,
		});

		await userEvent.click(canvas.getByRole('radio', {name: 'Relative'}));
		await expect(positionX).toBeDisabled();
		await userEvent.click(canvas.getByRole('radio', {name: 'Absolute'}));
		await expect(positionX).not.toBeDisabled();
		await expect(args.onChange.mock.calls).toStrictEqual([
			[
				{
					absolute: false,
					enabled: true,
					height: 64,
					positionX: 0,
					positionY: -16,
					width: 32,
				},
			],
			[
				{
					absolute: true,
					enabled: true,
					height: 64,
					positionX: 0,
					positionY: -16,
					width: 32,
				},
			],
		]);
	},
};

export const KeyboardNumericEditing: Story = {
	play: async ({args, canvasElement}) => {
		const canvas = within(canvasElement);
		const width = canvas.getByRole<HTMLInputElement>('spinbutton', {name: 'Width'});
		const height = canvas.getByRole<HTMLInputElement>('spinbutton', {name: 'Height'});

		await userEvent.clear(width);
		await userEvent.type(width, '48');
		await expect({
			calls: args.onChange.mock.calls,
			value: width.value,
		}).toStrictEqual({
			calls: [
				[
					{
						absolute: true,
						enabled: true,
						height: 64,
						positionX: 0,
						positionY: -16,
						width: 4,
					},
				],
				[
					{
						absolute: true,
						enabled: true,
						height: 64,
						positionX: 0,
						positionY: -16,
						width: 48,
					},
				],
			],
			value: '48',
		});
		await userEvent.keyboard('{Enter}');
		await expect(args.onChange.mock.calls).toStrictEqual([
			[
				{
					absolute: true,
					enabled: true,
					height: 64,
					positionX: 0,
					positionY: -16,
					width: 4,
				},
			],
			[
				{
					absolute: true,
					enabled: true,
					height: 64,
					positionX: 0,
					positionY: -16,
					width: 48,
				},
			],
		]);

		await userEvent.clear(width);
		await userEvent.type(width, '0');
		await userEvent.tab();
		await expect({
			activeElement: document.activeElement,
			calls: args.onChange.mock.calls,
			width: width.value,
		}).toStrictEqual({
			activeElement: height,
			calls: [
				[
					{
						absolute: true,
						enabled: true,
						height: 64,
						positionX: 0,
						positionY: -16,
						width: 4,
					},
				],
				[
					{
						absolute: true,
						enabled: true,
						height: 64,
						positionX: 0,
						positionY: -16,
						width: 48,
					},
				],
			],
			width: '48',
		});

		await userEvent.clear(height);
		await userEvent.type(height, '96');
		await userEvent.tab();
		await expect(args.onChange.mock.calls).toStrictEqual([
			[
				{
					absolute: true,
					enabled: true,
					height: 64,
					positionX: 0,
					positionY: -16,
					width: 4,
				},
			],
			[
				{
					absolute: true,
					enabled: true,
					height: 64,
					positionX: 0,
					positionY: -16,
					width: 48,
				},
			],
			[
				{
					absolute: true,
					enabled: true,
					height: 9,
					positionX: 0,
					positionY: -16,
					width: 48,
				},
			],
			[
				{
					absolute: true,
					enabled: true,
					height: 96,
					positionX: 0,
					positionY: -16,
					width: 48,
				},
			],
		]);
	},
};

export const NarrowDimensions: Story = {
	decorators: [
		(StoryComponent) => (
			<div style={{width: '280px'}}>
				<StoryComponent />
			</div>
		),
	],
	play: async ({canvasElement}) => {
		const canvas = within(canvasElement);
		const width = canvas.getByRole<HTMLInputElement>('spinbutton', {name: 'Width'});
		const dimensionRow = width.closest('.blueprint-snap-grid-editor__dimensions');
		if (dimensionRow === null) {
			throw new Error('Expected the dimension row.');
		}
		const height = canvas.getByRole<HTMLInputElement>('spinbutton', {name: 'Height'});
		const rowBounds = dimensionRow.getBoundingClientRect();

		await expect({
			gridTemplate: getComputedStyle(dimensionRow).gridTemplateColumns,
			heightBounds: height.getBoundingClientRect().right <= rowBounds.right,
			pageOverflow: document.documentElement.scrollWidth - window.innerWidth,
			width: width.getBoundingClientRect().width,
		}).toStrictEqual({
			gridTemplate: '45.3594px 40px 50.7031px 40px',
			heightBounds: true,
			pageOverflow: 0,
			width: 40,
		});
	},
};

export const Disabled: Story = {
	args: {
		settings: {
			absolute: true,
			enabled: false,
			height: 64,
			positionX: 0,
			positionY: -16,
			width: 32,
		},
	},
	play: async ({args, canvasElement}) => {
		const canvas = within(canvasElement);
		const master = canvas.getByRole<HTMLInputElement>('checkbox', {name: 'Snap to grid'});
		const fieldset = canvas.getByRole('group', {name: 'Snap to grid settings'});
		const controls = [...fieldset.querySelectorAll<HTMLInputElement>('input')];
		const width = canvas.getByRole<HTMLInputElement>('spinbutton', {name: 'Width'});

		await expect({
			controlDisabledStates: controls.map((control) => control.matches(':disabled')),
			fieldsetDisabled: fieldset.matches(':disabled'),
			fieldsetOpacity: getComputedStyle(fieldset).opacity,
			masterDisabled: master.disabled,
			numberBackground: getComputedStyle(width).backgroundColor,
		}).toStrictEqual({
			controlDisabledStates: [true, true, true, true, true, true],
			fieldsetDisabled: true,
			fieldsetOpacity: '0.48',
			masterDisabled: false,
			numberBackground: 'rgb(102, 102, 102)',
		});

		await userEvent.click(master);
		await expect(fieldset).not.toBeDisabled();
		await expect(controls.map((control) => control.matches(':disabled'))).toStrictEqual([
			false,
			false,
			false,
			false,
			false,
			false,
		]);
		await userEvent.click(master);
		await expect(fieldset).toBeDisabled();
		await expect(args.onChange.mock.calls).toStrictEqual([
			[
				{
					absolute: true,
					enabled: true,
					height: 64,
					positionX: 0,
					positionY: -16,
					width: 32,
				},
			],
			[
				{
					absolute: true,
					enabled: false,
					height: 64,
					positionX: 0,
					positionY: -16,
					width: 32,
				},
			],
		]);
	},
};
