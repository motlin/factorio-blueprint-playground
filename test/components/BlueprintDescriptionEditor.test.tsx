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
	const frame = textarea.closest('section');
	expect({
		calls: onDescriptionChange.mock.calls,
		element: textarea.tagName,
		frameSource: frame?.getAttribute('data-factorio-source'),
		frameStyle: frame?.getAttribute('data-factorio-style'),
		maxLength: textarea.maxLength,
		selection: [textarea.selectionStart, textarea.selectionEnd],
		textboxSource: textarea.dataset.factorioSource,
		textboxStyle: textarea.dataset.factorioStyle,
		value: textarea.value,
		wrap: textarea.wrap,
	}).toStrictEqual({
		calls: [[description]],
		element: 'TEXTAREA',
		frameSource: 'BlueprintSettingsGui::makeDescriptionFrame',
		frameStyle: 'bordered_frame',
		maxLength: 500,
		selection: [6, 22],
		textboxSource: 'BlueprintSettingsGui::descriptionEdit',
		textboxStyle: 'edit_blueprint_description_textbox',
		value: description,
		wrap: 'soft',
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

test('enforces the game description limit without collapsing the multiline editor', async () => {
	const user = userEvent.setup();
	const onDescriptionChange = vi.fn<(description: string) => void>();
	const onShortcut = vi.fn<(key: string) => void>();
	render(
		<EditorHarness
			initialDescription={'x'.repeat(499)}
			onDescriptionChange={onDescriptionChange}
			onShortcut={onShortcut}
		/>,
	);
	const textarea = screen.getByRole<HTMLTextAreaElement>('textbox', {name: 'Blueprint description'});

	await user.click(textarea);
	textarea.setSelectionRange(499, 499);
	await user.type(textarea, 'YZ');

	expect({
		changeLengths: onDescriptionChange.mock.calls.map(([description]) => description.length),
		collapsibleControl: textarea.closest('section')?.querySelector('button'),
		ending: textarea.value.slice(-2),
		length: textarea.value.length,
	}).toStrictEqual({
		changeLengths: [500],
		collapsibleControl: null,
		ending: 'xY',
		length: 500,
	});
});
