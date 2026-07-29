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
		const positionX = canvas.getByRole<HTMLInputElement>('spinbutton', {name: 'X'});
		const section = master.closest('section');
		if (section === null) {
			throw new Error('Expected the snap-to-grid bordered frame.');
		}

		await expect({
			controlCount: fieldset.querySelectorAll('input').length,
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
