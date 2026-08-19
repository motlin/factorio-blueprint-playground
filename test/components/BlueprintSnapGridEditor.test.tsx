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

	expect({
		disabled: [
			width.matches(':disabled'),
			height.matches(':disabled'),
			positionX.matches(':disabled'),
			positionY.matches(':disabled'),
		],
		values: [width.value, height.value, positionX.value, positionY.value],
	}).toStrictEqual({
		disabled: [true, true, true, true],
		values: ['32', '64', '0', '-16'],
	});

	await user.click(screen.getByRole('checkbox', {name: 'Snap to grid'}));

	expect({
		calls: onChange.mock.calls,
		disabled: [
			width.matches(':disabled'),
			height.matches(':disabled'),
			positionX.matches(':disabled'),
			positionY.matches(':disabled'),
		],
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
		disabled: [false, false, false, false],
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
