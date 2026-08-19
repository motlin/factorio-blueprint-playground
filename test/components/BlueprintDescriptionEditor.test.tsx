import {fireEvent, render, screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {useState} from 'react';
import {expect, test, vi} from 'vite-plus/test';

import {BlueprintDescriptionEditor} from '../../src/components/blueprint/panels/transform/BlueprintDescriptionEditor';

interface EditorHarnessProps {
	initialDescription: string;
	onDescriptionChange: (description: string) => void;
	onShortcut: (key: string) => void;
}

function EditorHarness({initialDescription, onDescriptionChange, onShortcut}: EditorHarnessProps) {
	const [description, setDescription] = useState(initialDescription);
	const [showSibling, setShowSibling] = useState(false);

	return (
		<div
			onKeyDown={(event) => {
				onShortcut(event.key);
			}}
		>
			<BlueprintDescriptionEditor
				description={description}
				onDescriptionChange={(nextDescription) => {
					setDescription(nextDescription);
					onDescriptionChange(nextDescription);
				}}
			/>
			<button
				type="button"
				onClick={() => {
					setShowSibling((current) => !current);
				}}
			>
				Toggle sibling
			</button>
			{showSibling ? <span>Sibling content</span> : null}
		</div>
	);
}

test('edits multiline rich text as an unchanged native textarea value', () => {
	const onDescriptionChange = vi.fn<(description: string) => void>();
	const onShortcut = vi.fn<(key: string) => void>();
	render(<EditorHarness initialDescription="" onDescriptionChange={onDescriptionChange} onShortcut={onShortcut} />);
	const description = '[item=transport-belt,quality=legendary]\n[color=red]Test belt[/color]';

	fireEvent.change(screen.getByRole('textbox', {name: 'Blueprint description'}), {
		target: {value: description},
	});

	const textarea = screen.getByRole<HTMLTextAreaElement>('textbox', {name: 'Blueprint description'});
	textarea.setSelectionRange(6, 22);
	expect({
		calls: onDescriptionChange.mock.calls,
		element: textarea.tagName,
		selection: [textarea.selectionStart, textarea.selectionEnd],
		value: textarea.value,
	}).toStrictEqual({
		calls: [[description]],
		element: 'TEXTAREA',
		selection: [6, 22],
		value: description,
	});
});

test('preserves the draft through parent updates and contains editor shortcut keys', async () => {
	const user = userEvent.setup();
	const onDescriptionChange = vi.fn<(description: string) => void>();
	const onShortcut = vi.fn<(key: string) => void>();
	render(
		<EditorHarness
			initialDescription="Draft: "
			onDescriptionChange={onDescriptionChange}
			onShortcut={onShortcut}
		/>,
	);
	const textarea = screen.getByRole<HTMLTextAreaElement>('textbox', {name: 'Blueprint description'});

	await user.click(textarea);
	await user.type(textarea, 'BUQ');
	await user.keyboard('{Escape}');
	await user.click(screen.getByRole('button', {name: 'Toggle sibling'}));

	expect({
		changeCalls: onDescriptionChange.mock.calls,
		draft: screen.getByRole<HTMLTextAreaElement>('textbox', {name: 'Blueprint description'}).value,
		shortcutCalls: onShortcut.mock.calls,
		sibling: screen.getByText('Sibling content').textContent,
	}).toStrictEqual({
		changeCalls: [['Draft: B'], ['Draft: BU'], ['Draft: BUQ']],
		draft: 'Draft: BUQ',
		shortcutCalls: [],
		sibling: 'Sibling content',
	});
});
