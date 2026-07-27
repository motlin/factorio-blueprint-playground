import {useId} from 'react';
import {createPortal} from 'react-dom';

import {ButtonGreen} from '../../../ui/ButtonGreen';
import {FactorioButton, FactorioButtonKind} from '../../../ui/FactorioUi';
import type {BlueprintEditorCommitAction} from './useBlueprintEditorDraft';
import {useDialogFocus} from './useDialogFocus';

interface BlueprintEditorActionsProps {
	closeConfirmationOpen: boolean;
	commitAction: BlueprintEditorCommitAction;
	commitDisabled: boolean;
	onClose: () => void;
	onCommit: () => void;
	onDiscard: () => void;
	onKeepEditing: () => void;
}

interface BlueprintEditorCloseConfirmationProps {
	commitDisabled: boolean;
	onCommit: () => void;
	onDiscard: () => void;
	onKeepEditing: () => void;
}

function BlueprintEditorCloseConfirmation({
	commitDisabled,
	onCommit,
	onDiscard,
	onKeepEditing,
}: BlueprintEditorCloseConfirmationProps) {
	const confirmationHeadingId = useId();
	const confirmationReference = useDialogFocus<HTMLElement>({
		initialFocusSelector: '[data-dialog-initial-focus="true"]',
		onClose: onKeepEditing,
	});

	return createPortal(
		<div className="transform-dialog-backdrop transform-dialog-backdrop--confirmation">
			<section
				ref={confirmationReference}
				className="factorio-frame factorio-frame--shallow transform-dialog transform-dialog--confirmation"
				role="alertdialog"
				aria-modal="true"
				aria-labelledby={confirmationHeadingId}
			>
				<header className="factorio-title-bar transform-dialog__header">
					<h3 id={confirmationHeadingId}>There are uncommitted changes</h3>
				</header>
				<p>Commit the draft, discard it, or return to editing.</p>
				<div className="transform-dialog__actions">
					<FactorioButton
						data-dialog-initial-focus="true"
						className="transform-button"
						onClick={() => {
							onKeepEditing();
						}}
					>
						Keep Editing
					</FactorioButton>
					<FactorioButton
						kind={FactorioButtonKind.Delete}
						className="transform-button"
						onClick={() => {
							onDiscard();
						}}
					>
						Discard
					</FactorioButton>
					<ButtonGreen
						disabled={commitDisabled}
						onClick={() => {
							onCommit();
						}}
					>
						Commit
					</ButtonGreen>
				</div>
			</section>
		</div>,
		document.body,
	);
}

/**
 * Factorio 2.1.12 `BlueprintSetupGui` commit contract:
 *
 * - `getConfirmCaption` supplies one green context-aware action.
 * - Both the footer action and dirty-close Commit invoke the same callback, so
 *   draft validation, root reinsertion, and serialization cannot diverge.
 * - Export and navigation are consumers of the committed root. They do not live
 *   in this editor action component.
 *
 * Evidence: `confirm`, `confirmClose`, and `getConfirmCaption`.
 */
export function BlueprintEditorActions({
	closeConfirmationOpen,
	commitAction,
	commitDisabled,
	onClose,
	onCommit,
	onDiscard,
	onKeepEditing,
}: BlueprintEditorActionsProps) {
	return (
		<>
			<footer className="transform-workbench__footer transform-workbench__footer--actions blueprint-editor-actions">
				<FactorioButton
					className="transform-button"
					onClick={() => {
						onClose();
					}}
				>
					Close
				</FactorioButton>
				<p className="blueprint-editor-actions__scope">{commitAction.scopeDescription}</p>
				<ButtonGreen
					disabled={commitDisabled}
					onClick={() => {
						onCommit();
					}}
				>
					{commitAction.caption}
				</ButtonGreen>
			</footer>
			{closeConfirmationOpen ? (
				<BlueprintEditorCloseConfirmation
					commitDisabled={commitDisabled}
					onCommit={onCommit}
					onDiscard={onDiscard}
					onKeepEditing={onKeepEditing}
				/>
			) : null}
		</>
	);
}
