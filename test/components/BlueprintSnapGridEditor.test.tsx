import {render, screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {useState} from 'react';
import {expect, test, vi} from 'vite-plus/test';

import {BlueprintSnapGridEditor} from '../../src/components/blueprint/panels/transform/BlueprintSnapGridEditor';
import type {BlueprintSnapGrid} from '../../src/transform/blueprintEditor';

interface EditorHarnessProps {
	initialSettings: BlueprintSnapGrid;
	onChange: (settings: BlueprintSnapGrid) => void;
}

function EditorHarness({initialSettings, onChange}: EditorHarnessProps) {
	const [settings, setSettings] = useState(initialSettings);
	return (
		<BlueprintSnapGridEditor
			settings={settings}
			onChange={(nextSettings) => {
				setSettings(nextSettings);
				onChange(nextSettings);
			}}
		/>
	);
}

test('enables every grid control while preserving zero and negative draft positions', async () => {
	const user = userEvent.setup();
	const onChange = vi.fn<(settings: BlueprintSnapGrid) => void>();
	render(
		<EditorHarness
			initialSettings={{
				absolute: true,
				enabled: false,
				height: 64,
				positionX: 0,
				positionY: -16,
				width: 32,
			}}
			onChange={onChange}
		/>,
	);

	const width = screen.getByRole<HTMLInputElement>('spinbutton', {name: 'Width'});
	const height = screen.getByRole<HTMLInputElement>('spinbutton', {name: 'Height'});
	const positionX = screen.getByRole<HTMLInputElement>('spinbutton', {name: 'X'});
	const positionY = screen.getByRole<HTMLInputElement>('spinbutton', {name: 'Y'});
	const master = screen.getByRole<HTMLInputElement>('checkbox', {name: 'Snap to grid'});
	const fieldset = screen.getByRole<HTMLFieldSetElement>('group', {name: 'Snap to grid settings'});
	const controls = [...fieldset.querySelectorAll<HTMLInputElement>('input')];
	const section = master.closest('section');
	if (section === null) {
		throw new Error('Expected the snap-to-grid bordered frame.');
	}

	expect({
		controlDisabledStates: controls.map((control) => control.matches(':disabled')),
		fieldsetControlledByMaster: master.getAttribute('aria-controls') === fieldset.id,
		fieldsetDisabled: fieldset.disabled,
		fieldsetSource: fieldset.dataset.factorioSource,
		frameSource: section.dataset.factorioSource,
		frameStyle: section.dataset.factorioStyle,
		headingStyle: screen.getByRole('heading', {name: 'Snap to grid'}).dataset.factorioStyle,
		masterDisabled: master.disabled,
		masterOutsideFieldset: !fieldset.contains(master),
		values: [width.value, height.value, positionX.value, positionY.value],
	}).toStrictEqual({
		controlDisabledStates: [true, true, true, true, true, true],
		fieldsetControlledByMaster: true,
		fieldsetDisabled: true,
		fieldsetSource: 'BlueprintSettingsGui::updateEditabilityOfSnapToGrid',
		frameSource: 'BlueprintSettingsGui::makeSnappingsFrame',
		frameStyle: 'bordered_frame',
		headingStyle: 'caption_checkbox',
		masterDisabled: false,
		masterOutsideFieldset: true,
		values: ['32', '64', '0', '-16'],
	});

	await user.click(master);

	expect({
		calls: onChange.mock.calls,
		controlDisabledStates: controls.map((control) => control.matches(':disabled')),
		fieldsetDisabled: fieldset.disabled,
		values: [width.value, height.value, positionX.value, positionY.value],
	}).toStrictEqual({
		calls: [
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
		],
		controlDisabledStates: [false, false, false, false, false, false],
		fieldsetDisabled: false,
		values: ['32', '64', '0', '-16'],
	});
});

test('distinguishes relative placement while retaining the absolute position draft', async () => {
	const user = userEvent.setup();
	const onChange = vi.fn<(settings: BlueprintSnapGrid) => void>();
	render(
		<EditorHarness
			initialSettings={{
				absolute: true,
				enabled: true,
				height: 64,
				positionX: 0,
				positionY: -16,
				width: 32,
			}}
			onChange={onChange}
		/>,
	);

	await user.click(screen.getByRole('radio', {name: 'Relative'}));

	const positionX = screen.getByRole<HTMLInputElement>('spinbutton', {name: 'X'});
	const positionY = screen.getByRole<HTMLInputElement>('spinbutton', {name: 'Y'});
	expect({
		absoluteChecked: screen.getByRole<HTMLInputElement>('radio', {name: 'Absolute'}).checked,
		calls: onChange.mock.calls,
		positionDisabled: [positionX.disabled, positionY.disabled],
		positionValues: [positionX.value, positionY.value],
		relativeChecked: screen.getByRole<HTMLInputElement>('radio', {name: 'Relative'}).checked,
	}).toStrictEqual({
		absoluteChecked: false,
		calls: [
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
		],
		positionDisabled: [true, true],
		positionValues: ['0', '-16'],
		relativeChecked: true,
	});
});
