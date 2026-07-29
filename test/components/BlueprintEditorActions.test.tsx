import {fireEvent, render, screen, within} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {expect, test, vi} from 'vite-plus/test';

import {BlueprintEditorActions} from '../../src/components/blueprint/panels/transform/BlueprintEditorActions';
import type {BlueprintEditorCommitAction} from '../../src/components/blueprint/panels/transform/useBlueprintEditorDraft';

const createAction: BlueprintEditorCommitAction = {
	caption: 'Create Blueprint',
	scopeDescription: 'Creates this newly captured draft as the committed root blueprint.',
};
const saveAction: BlueprintEditorCommitAction = {
	caption: 'Save Blueprint',
	scopeDescription: 'Commits changes to the existing blueprint record.',
};
const saveToBookAction: BlueprintEditorCommitAction = {
	caption: 'Save to Book',
	scopeDescription: 'Commits this selection into its containing root book.',
};

function renderActions({
	closeConfirmationOpen = false,
	commitAction = saveAction,
	commitDisabled = false,
	onClose = vi.fn<() => void>(),
	onCommit = vi.fn<() => void>(),
	onDiscard = vi.fn<() => void>(),
	onKeepEditing = vi.fn<() => void>(),
}: {
	closeConfirmationOpen?: boolean;
	commitAction?: BlueprintEditorCommitAction;
	commitDisabled?: boolean;
	onClose?: () => void;
	onCommit?: () => void;
	onDiscard?: () => void;
	onKeepEditing?: () => void;
} = {}) {
	return render(
		<BlueprintEditorActions
			closeConfirmationOpen={closeConfirmationOpen}
			commitAction={commitAction}
			commitDisabled={commitDisabled}
			onClose={onClose}
			onCommit={onCommit}
			onDiscard={onDiscard}
			onKeepEditing={onKeepEditing}
		/>,
	);
}

test('uses the existing-record caption and does not expose export or navigation as save actions', async () => {
	const user = userEvent.setup();
	const onClose = vi.fn<() => void>();
	const onCommit = vi.fn<() => void>();
	renderActions({commitAction: saveAction, onClose, onCommit});

	expect({
		actions: screen.getAllByRole('button').map((button) => button.textContent),
		scope: screen.getByText(saveAction.scopeDescription).textContent,
	}).toStrictEqual({
		actions: ['Close', 'Save Blueprint'],
		scope: saveAction.scopeDescription,
	});

	await user.click(screen.getByRole('button', {name: 'Save Blueprint'}));
	await user.click(screen.getByRole('button', {name: 'Close'}));

	expect({onClose: onClose.mock.calls, onCommit: onCommit.mock.calls}).toStrictEqual({
		onClose: [[]],
		onCommit: [[]],
	});
	expect(['Export', 'Open in Playground'].map((name) => screen.queryByRole('button', {name}))).toStrictEqual([
		null,
		null,
	]);
});

test('enables Create Blueprint for a first captured draft without inspecting its label', async () => {
	const user = userEvent.setup();
	const onCommit = vi.fn<() => void>();
	renderActions({commitAction: createAction, onCommit});
	const createButton = screen.getByRole<HTMLButtonElement>('button', {name: 'Create Blueprint'});

	expect({
		disabled: createButton.disabled,
		scope: screen.getByText(createAction.scopeDescription).textContent,
	}).toStrictEqual({disabled: false, scope: createAction.scopeDescription});

	await user.click(createButton);
	expect(onCommit).toHaveBeenCalledExactlyOnceWith();
});

test('uses Save to Book for a child commit whose root scope needs clarification', async () => {
	const user = userEvent.setup();
	const onCommit = vi.fn<() => void>();
	renderActions({commitAction: saveToBookAction, onCommit});

	expect(screen.getByText(saveToBookAction.scopeDescription).textContent).toBe(
		'Commits this selection into its containing root book.',
	);
	await user.click(screen.getByRole('button', {name: 'Save to Book'}));
	expect(onCommit).toHaveBeenCalledExactlyOnceWith();
});

test('offers explicit discard or continued editing and routes Escape back to the same draft', async () => {
	const user = userEvent.setup();
	const onCommit = vi.fn<() => void>();
	const onDiscard = vi.fn<() => void>();
	const onKeepEditing = vi.fn<() => void>();
	renderActions({closeConfirmationOpen: true, onCommit, onDiscard, onKeepEditing});
	const confirmation = screen.getByRole('alertdialog', {name: 'There are uncommitted changes'});

	expect({
		actions: within(confirmation)
			.getAllByRole('button')
			.map((button) => button.textContent),
		message: within(confirmation).getByText('Closing now will discard this draft. Keep editing to save it first.')
			.textContent,
	}).toStrictEqual({
		actions: ['Keep Editing', 'Discard Changes'],
		message: 'Closing now will discard this draft. Keep editing to save it first.',
	});

	await user.click(within(confirmation).getByRole('button', {name: 'Discard Changes'}));
	fireEvent.keyDown(window, {key: 'Escape'});

	expect({
		onCommit: onCommit.mock.calls,
		onDiscard: onDiscard.mock.calls,
		onKeepEditing: onKeepEditing.mock.calls,
	}).toStrictEqual({
		onCommit: [],
		onDiscard: [[]],
		onKeepEditing: [[]],
	});
});
