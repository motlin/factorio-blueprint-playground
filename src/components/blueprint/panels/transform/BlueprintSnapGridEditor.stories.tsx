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

function accessibleDescription(control: HTMLElement): string {
	const descriptionId = control.getAttribute('aria-describedby');
	if (descriptionId === null) {
		throw new Error('Expected the control to reference an accessible description.');
	}
	const description = control.ownerDocument.getElementById(descriptionId);
	if (description === null) {
		throw new Error(`Expected accessible description ${descriptionId}.`);
	}
	return description.textContent;
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
		const positionX = canvas.getByRole<HTMLInputElement>('spinbutton', {name: 'Grid position X'});
		const positionY = canvas.getByRole<HTMLInputElement>('spinbutton', {name: 'Grid position Y'});
		const positionRow = positionX.closest('.blueprint-snap-grid-editor__position');
		const absolute = canvas.getByRole<HTMLInputElement>('radio', {name: 'Absolute'});
		const placement = absolute.closest('.blueprint-snap-grid-editor__placement');
		const section = master.closest('section');
		if (section === null || dimensionRow === null || !(placement instanceof HTMLElement) || positionRow === null) {
			throw new Error('Expected the snap-to-grid frame, six-column rows, and radio group.');
		}
		const dimensionGridTemplate =
			section.getBoundingClientRect().width <= 400 ? '46px 40px 51px 40px' : '110px 101px 46px 40px 51px 40px';

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
			gridPosition: {
				cells: [...positionRow.children].map((cell) => cell.textContent),
				columns: positionRow.getAttribute('data-factorio-columns'),
				disabled: [positionX.disabled, positionY.disabled],
				gridTemplate: getComputedStyle(positionRow).gridTemplateColumns,
				source: positionRow.getAttribute('data-factorio-source'),
				styles: [positionX.dataset.factorioStyle, positionY.dataset.factorioStyle],
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
			masterSize: [master.getBoundingClientRect().width, master.getBoundingClientRect().height],
			masterOutsideFieldset: !fieldset.contains(master),
			numberWidth: width.getBoundingClientRect().width,
			placement: {
				direction: getComputedStyle(placement).display,
				gap: getComputedStyle(placement).gap,
				labelCount: placement.querySelectorAll('label').length,
				radioSize: [absolute.getBoundingClientRect().width, absolute.getBoundingClientRect().height],
				source: placement.dataset.factorioSource,
			},
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
			gridPosition: {
				cells: ['Grid positioni', '', 'X:Grid position X', '', 'Y:Grid position Y', ''],
				columns: '6',
				disabled: [false, false],
				gridTemplate: dimensionGridTemplate,
				source: 'BlueprintSettingsGui::makeSnappingsFrame',
				styles: ['very_short_number_textfield', 'very_short_number_textfield'],
			},
			fieldsetControlledByMaster: true,
			fieldsetSource: 'BlueprintSettingsGui::updateEditabilityOfSnapToGrid',
			fieldsetStyle: {border: 'none', opacity: '1'},
			frameSource: 'BlueprintSettingsGui::makeSnappingsFrame',
			frameStyle: 'bordered_frame',
			headingStyle: 'caption_checkbox',
			masterSize: [28, 28],
			masterOutsideFieldset: true,
			numberWidth: 40,
			placement: {
				direction: 'grid',
				gap: '4px',
				labelCount: 2,
				radioSize: [24, 24],
				source: 'BlueprintSettingsGui::makeSnappingsFrame',
			},
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

export const EnabledRelative: Story = {
	args: {
		settings: {
			absolute: false,
			enabled: true,
			height: 64,
			positionX: 0,
			positionY: -16,
			width: 32,
		},
	},
	play: async ({canvasElement}) => {
		const canvas = within(canvasElement);
		const absolute = canvas.getByRole<HTMLInputElement>('radio', {name: 'Absolute'});
		const relative = canvas.getByRole<HTMLInputElement>('radio', {name: 'Relative'});
		const positionX = canvas.getByRole<HTMLInputElement>('spinbutton', {name: 'Grid position X'});
		const positionY = canvas.getByRole<HTMLInputElement>('spinbutton', {name: 'Grid position Y'});

		await expect({
			absolute: {
				checked: absolute.checked,
				description: accessibleDescription(absolute),
				style: absolute.dataset.factorioStyle,
			},
			positionDisabled: [positionX.disabled, positionY.disabled],
			positionValues: [positionX.value, positionY.value],
			relative: {
				checked: relative.checked,
				description: accessibleDescription(relative),
				style: relative.dataset.factorioStyle,
			},
		}).toStrictEqual({
			absolute: {
				checked: false,
				description: 'Snaps to the global grid. Grid position X and Y set the blueprint offset.',
				style: 'radiobutton',
			},
			positionDisabled: [true, true],
			positionValues: ['0', '-16'],
			relative: {
				checked: true,
				description:
					'Snaps relative to where dragging the blueprint started. Grid position is unavailable in this mode.',
				style: 'radiobutton',
			},
		});
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
			gridTemplate: '46px 40px 51px 40px',
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
