import {fireEvent, render, screen, within} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {expect, test, vi} from 'vite-plus/test';

import {BlueprintEditorActions} from '../../src/components/blueprint/panels/transform/BlueprintEditorActions';
import {
	type BlueprintEditorCommitAction,
	BlueprintEditorCommitActionKind,
	BlueprintEditorCommitState,
} from '../../src/components/blueprint/panels/transform/useBlueprintEditorDraft';

const createAction: BlueprintEditorCommitAction = {
	caption: 'Create blueprint',
	kind: BlueprintEditorCommitActionKind.Create,
	scopeDescription: 'Creates this captured draft as the loaded root blueprint.',
};
const saveRootAction: BlueprintEditorCommitAction = {
	caption: 'Save blueprint',
	kind: BlueprintEditorCommitActionKind.SaveRoot,
	scopeDescription: 'Saves changes to this loaded root blueprint.',
};
const saveChildAction: BlueprintEditorCommitAction = {
	caption: 'Save blueprint',
	kind: BlueprintEditorCommitActionKind.SaveChild,
	scopeDescription: 'Saves this child in its containing book. The whole book remains the loaded result.',
};

function renderActions({
	closeConfirmationOpen = false,
	commitAction = saveRootAction,
	commitState = BlueprintEditorCommitState.Ready,
	onCommit = vi.fn<() => void>(),
	onDiscard = vi.fn<() => void>(),
	onKeepEditing = vi.fn<() => void>(),
}: {
	closeConfirmationOpen?: boolean;
	commitAction?: BlueprintEditorCommitAction;
	commitState?: BlueprintEditorCommitState;
	onCommit?: () => void;
	onDiscard?: () => void;
	onKeepEditing?: () => void;
} = {}) {
	return render(
		<BlueprintEditorActions
			closeConfirmationOpen={closeConfirmationOpen}
			commitAction={commitAction}
			commitState={commitState}
			onCommit={onCommit}
			onDiscard={onDiscard}
			onKeepEditing={onKeepEditing}
		/>,
	);
}

test.each([
	{
		action: createAction,
		busy: 'false',
		disabled: false,
		name: 'new captured root',
		state: BlueprintEditorCommitState.Ready,
		status: 'Blueprint is ready to create.',
	},
	{
		action: saveRootAction,
		busy: 'false',
		disabled: true,
		name: 'clean existing root',
		state: BlueprintEditorCommitState.Clean,
		status: 'No changes to save.',
	},
	{
		action: saveRootAction,
		busy: 'false',
		disabled: false,
		name: 'dirty existing root',
		state: BlueprintEditorCommitState.Ready,
		status: 'Changes are ready to save.',
	},
	{
		action: saveChildAction,
		busy: 'false',
		disabled: false,
		name: 'dirty child in book',
		state: BlueprintEditorCommitState.Ready,
		status: 'Changes are ready to save.',
	},
	{
		action: saveChildAction,
		busy: 'true',
		disabled: true,
		name: 'pending child commit',
		state: BlueprintEditorCommitState.Pending,
		status: 'Saving changes…',
	},
	{
		action: saveRootAction,
		busy: 'false',
		disabled: true,
		name: 'invalid existing root',
		state: BlueprintEditorCommitState.Invalid,
		status: 'This draft cannot be saved.',
	},
])('renders the $name transaction state without a competing footer close action', async (fixture) => {
	const user = userEvent.setup();
	const onCommit = vi.fn<() => void>();
	renderActions({
		commitAction: fixture.action,
		commitState: fixture.state,
		onCommit,
	});
	const footer = screen.getByRole('contentinfo');
	const commit = screen.getByRole<HTMLButtonElement>('button', {name: fixture.action.caption});
	const descriptionIds = commit.getAttribute('aria-describedby')?.split(' ') ?? [];

	expect({
		actionBusy: commit.getAttribute('aria-busy'),
		actionDisabled: commit.disabled,
		actionStyle: commit.dataset.factorioStyle,
		description: document.getElementById(descriptionIds[0] ?? '')?.textContent,
		footerSource: footer.dataset.factorioSource,
		footerKind: footer.dataset.commitKind,
		footerState: footer.dataset.commitState,
		footerStyle: footer.dataset.factorioStyle,
		status: screen.getByRole('status').textContent,
		visibleButtons: screen.getAllByRole('button').map((button) => button.textContent),
	}).toStrictEqual({
		actionBusy: fixture.busy,
		actionDisabled: fixture.disabled,
		actionStyle: 'green_button',
		description: fixture.action.scopeDescription,
		footerSource: 'BlueprintSetupGui::getConfirmCaption',
		footerKind: fixture.action.kind,
		footerState: fixture.state,
		footerStyle: 'dialog_buttons_horizontal_flow',
		status: fixture.status,
		visibleButtons: [fixture.action.caption],
	});

	await user.click(commit);
	expect(onCommit.mock.calls).toStrictEqual(fixture.disabled ? [] : [[]]);
});

test('matches ConfirmationBox and routes cancel or Escape back to the same draft', async () => {
	const user = userEvent.setup();
	const onCommit = vi.fn<() => void>();
	const onDiscard = vi.fn<() => void>();
	const onKeepEditing = vi.fn<() => void>();
	renderActions({
		closeConfirmationOpen: true,
		onCommit,
		onDiscard,
		onKeepEditing,
	});
	const confirmation = screen.getByRole('alertdialog', {name: 'Confirmation'});
	const message = within(confirmation).getByText('There are unconfirmed changes.');
	const cancel = within(confirmation).getByRole('button', {name: 'Cancel'});
	const discard = within(confirmation).getByRole('button', {name: 'Discard changes'});

	expect({
		activeElement: document.activeElement,
		actions: within(confirmation)
			.getAllByRole('button')
			.map((button) => button.textContent),
		describedBy: confirmation.getAttribute('aria-describedby'),
		dialogSource: confirmation.dataset.factorioSource,
		discardStyle: discard.dataset.factorioSourceStyle,
		footerStyle: discard.parentElement?.dataset.factorioStyle,
		message: message.textContent,
		messageStyle: message.parentElement?.dataset.factorioStyle,
	}).toStrictEqual({
		activeElement: cancel,
		actions: ['Cancel', 'Discard changes'],
		describedBy: message.id,
		dialogSource: 'ConfirmationBox',
		discardStyle: 'red_confirm_button',
		footerStyle: 'dialog_buttons_horizontal_flow',
		message: 'There are unconfirmed changes.',
		messageStyle: 'notice_scroll_pane',
	});

	await user.click(discard);
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
