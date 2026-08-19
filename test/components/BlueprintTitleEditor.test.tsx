import {render, screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {useState} from 'react';
import {expect, test, vi} from 'vite-plus/test';

import {BlueprintTitleEditor} from '../../src/components/blueprint/panels/transform/BlueprintTitleEditor';

function EditorHarness({onLabelChange}: {onLabelChange: (label: string) => void}) {
	const [label, setLabel] = useState('Test reactor');
	return (
		<BlueprintTitleEditor
			label={label}
			onLabelChange={(nextLabel) => {
				onLabelChange(nextLabel);
				setLabel(nextLabel);
			}}
		/>
	);
}

test('opens the selectable title for editing with the labelled pencil control', async () => {
	const user = userEvent.setup();
	const onLabelChange = vi.fn<(label: string) => void>();
	render(<EditorHarness onLabelChange={onLabelChange} />);

	const title = screen.getByText('Test reactor');
	await user.tab();
	await user.keyboard('{Enter}');

	expect({
		button: screen.queryByRole('button', {name: 'Edit blueprint title'}),
		input: screen.getByRole<HTMLInputElement>('textbox', {name: 'Blueprint title'}).value,
		selectableClass: title.className,
	}).toStrictEqual({
		button: null,
		input: 'Test reactor',
		selectableClass: 'blueprint-editor__title',
	});
});

test('commits a title edit with Enter', async () => {
	const user = userEvent.setup();
	const onLabelChange = vi.fn<(label: string) => void>();
	render(<EditorHarness onLabelChange={onLabelChange} />);

	await user.click(screen.getByRole('button', {name: 'Edit blueprint title'}));
	await user.clear(screen.getByRole('textbox', {name: 'Blueprint title'}));
	await user.type(screen.getByRole('textbox', {name: 'Blueprint title'}), 'Updated reactor{Enter}');

	expect({
		calls: onLabelChange.mock.calls,
		title: screen.getByText('Updated reactor').textContent,
	}).toStrictEqual({calls: [['Updated reactor']], title: 'Updated reactor'});
});

test('commits a title edit when the field loses focus', async () => {
	const user = userEvent.setup();
	const onLabelChange = vi.fn<(label: string) => void>();
	render(
		<div>
			<EditorHarness onLabelChange={onLabelChange} />
			<button type="button">Outside</button>
		</div>,
	);

	await user.click(screen.getByRole('button', {name: 'Edit blueprint title'}));
	await user.clear(screen.getByRole('textbox', {name: 'Blueprint title'}));
	await user.type(screen.getByRole('textbox', {name: 'Blueprint title'}), 'Blurred reactor');
	await user.click(screen.getByRole('button', {name: 'Outside'}));

	expect({
		calls: onLabelChange.mock.calls,
		title: screen.getByText('Blurred reactor').textContent,
	}).toStrictEqual({calls: [['Blurred reactor']], title: 'Blurred reactor'});
});

test('cancels title editing with Escape without propagating to the editor', async () => {
	const user = userEvent.setup();
	const onLabelChange = vi.fn<(label: string) => void>();
	const onEditorEscape = vi.fn<() => void>();
	render(
		<div
			onKeyDown={(event) => {
				if (event.key === 'Escape') onEditorEscape();
			}}
		>
			<EditorHarness onLabelChange={onLabelChange} />
		</div>,
	);

	await user.click(screen.getByRole('button', {name: 'Edit blueprint title'}));
	await user.clear(screen.getByRole('textbox', {name: 'Blueprint title'}));
	await user.type(screen.getByRole('textbox', {name: 'Blueprint title'}), 'Cancelled reactor');
	await user.keyboard('{Escape}');

	expect({
		calls: onLabelChange.mock.calls,
		editorEscapeCalls: onEditorEscape.mock.calls,
		input: screen.queryByRole('textbox', {name: 'Blueprint title'}),
		title: screen.getByText('Test reactor').textContent,
	}).toStrictEqual({calls: [], editorEscapeCalls: [], input: null, title: 'Test reactor'});
});
