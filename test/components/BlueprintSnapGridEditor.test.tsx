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

function accessibleDescriptions(control: HTMLElement): string[] {
	const descriptionIds = control.getAttribute('aria-describedby');
	if (descriptionIds === null) {
		throw new Error('Expected the control to reference an accessible description.');
	}
	return descriptionIds.split(' ').map((descriptionId) => {
		const description = document.getElementById(descriptionId);
		if (description === null) {
			throw new Error(`Expected accessible description ${descriptionId}.`);
		}
		return description.textContent;
	});
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
	const positionX = screen.getByRole<HTMLInputElement>('spinbutton', {name: 'Grid position X'});
	const positionY = screen.getByRole<HTMLInputElement>('spinbutton', {name: 'Grid position Y'});
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
		masterStyle: master.dataset.factorioStyle,
		positionContracts: [positionX, positionY].map((position) => ({
			descriptions: accessibleDescriptions(position),
			step: position.step,
			style: position.dataset.factorioStyle,
		})),
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
		masterStyle: 'caption_checkbox',
		positionContracts: [
			{
				descriptions: [
					'Coordinates that position the blueprint relative to the global grid.',
					'Snaps to the global grid. Grid position X and Y set the blueprint offset.',
				],
				step: '1',
				style: 'very_short_number_textfield',
			},
			{
				descriptions: [
					'Coordinates that position the blueprint relative to the global grid.',
					'Snaps to the global grid. Grid position X and Y set the blueprint offset.',
				],
				step: '1',
				style: 'very_short_number_textfield',
			},
		],
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

	const positionX = screen.getByRole<HTMLInputElement>('spinbutton', {name: 'Grid position X'});
	const positionY = screen.getByRole<HTMLInputElement>('spinbutton', {name: 'Grid position Y'});
	const absolute = screen.getByRole<HTMLInputElement>('radio', {name: 'Absolute'});
	const relative = screen.getByRole<HTMLInputElement>('radio', {name: 'Relative'});
	expect({
		absolute: {
			checked: absolute.checked,
			description: screen.getByText('Snaps to the global grid. Grid position X and Y set the blueprint offset.')
				.textContent,
			style: absolute.dataset.factorioStyle,
		},
		calls: onChange.mock.calls,
		positionDisabled: [positionX.disabled, positionY.disabled],
		positionValues: [positionX.value, positionY.value],
		relative: {
			checked: relative.checked,
			description: screen.getByText(
				'Snaps relative to where dragging the blueprint started. Grid position is unavailable in this mode.',
			).textContent,
			style: relative.dataset.factorioStyle,
		},
	}).toStrictEqual({
		absolute: {
			checked: false,
			description: 'Snaps to the global grid. Grid position X and Y set the blueprint offset.',
			style: 'radiobutton',
		},
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
		relative: {
			checked: true,
			description:
				'Snaps relative to where dragging the blueprint started. Grid position is unavailable in this mode.',
			style: 'radiobutton',
		},
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
		activeElement: screen.getByRole('spinbutton', {name: 'Grid position X'}),
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

test('accepts a typed negative grid offset through its intermediate minus sign', async () => {
	const user = userEvent.setup();
	const onChange = vi.fn<(settings: BlueprintSnapGrid) => void>();
	render(
		<EditorHarness
			initialSettings={{
				absolute: true,
				enabled: true,
				height: 64,
				positionX: 0,
				positionY: 0,
				width: 32,
			}}
			onChange={onChange}
		/>,
	);

	const positionX = screen.getByRole<HTMLInputElement>('spinbutton', {name: 'Grid position X'});
	await user.clear(positionX);
	await user.type(positionX, '-16');

	expect({
		lastCall: onChange.mock.calls.at(-1),
		value: positionX.value,
	}).toStrictEqual({
		lastCall: [
			{
				absolute: true,
				enabled: true,
				height: 64,
				positionX: -16,
				positionY: 0,
				width: 32,
			},
		],
		value: '-16',
	});
});
