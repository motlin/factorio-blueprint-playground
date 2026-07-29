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

test('commits positive integer dimensions without emitting invalid intermediate drafts', async () => {
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

	const width = screen.getByRole<HTMLInputElement>('spinbutton', {name: 'Width'});
	const height = screen.getByRole<HTMLInputElement>('spinbutton', {name: 'Height'});
	const dimensionRow = width.closest('.blueprint-snap-grid-editor__dimensions');
	if (dimensionRow === null) {
		throw new Error('Expected the six-column dimension row.');
	}

	await user.clear(width);
	await user.type(width, '48');
	expect({
		calls: onChange.mock.calls,
		dimensionCells: [...dimensionRow.children].map((cell) => cell.textContent),
		dimensionColumns: dimensionRow.getAttribute('data-factorio-columns'),
		heightContract: {
			inputMode: height.inputMode,
			min: height.min,
			step: height.step,
			style: height.dataset.factorioStyle,
		},
		widthContract: {
			inputMode: width.inputMode,
			min: width.min,
			step: width.step,
			style: width.dataset.factorioStyle,
		},
		widthValue: width.value,
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
		dimensionCells: ['Grid size', '', 'Width:', '', 'Height:', ''],
		dimensionColumns: '6',
		heightContract: {
			inputMode: 'numeric',
			min: '1',
			step: '1',
			style: 'very_short_number_textfield',
		},
		widthContract: {
			inputMode: 'numeric',
			min: '1',
			step: '1',
			style: 'very_short_number_textfield',
		},
		widthValue: '48',
	});

	await user.keyboard('{Enter}');
	await user.clear(width);
	await user.type(width, '0');
	await user.tab();
	await user.clear(height);
	await user.type(height, '96');
	await user.tab();

	expect({
		activeElement: document.activeElement,
		calls: onChange.mock.calls,
		values: [width.value, height.value],
	}).toStrictEqual({
		activeElement: screen.getByRole('radio', {name: 'Absolute'}),
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
		],
		values: ['48', '96'],
	});
});
