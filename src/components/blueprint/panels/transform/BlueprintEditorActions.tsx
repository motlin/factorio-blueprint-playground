import {useNavigate} from '@tanstack/react-router';
import {useMemo} from 'react';

import {serializeBlueprint} from '../../../../parsing/blueprintParser';
import type {BlueprintString} from '../../../../parsing/types';
import {updateNestedBlueprint} from '../../../../transform/applyAtPath';
import {ButtonGreen} from '../../../ui/ButtonGreen';

interface BlueprintEditorActionsProps {
	closeConfirmationOpen: boolean;
	dirty: boolean;
	draftBlueprint?: BlueprintString;
	onClose: () => void;
	onDiscard: () => void;
	onKeepEditing: () => void;
	onSaved: (savedRoot: BlueprintString) => void;
	rootBlueprint: BlueprintString;
	selectedPath: string;
}

/**
 * Commit contract from Factorio 2.1.12's setup and record-preview editors:
 *
 * - The footer exposes one green commit action, not an intermediate Apply step.
 * - An explicit `NewBlueprint` versus `ExistingBlueprint` view mode owns
 *   Create-versus-Commit wording. Transform sessions edit loaded data, so their
 *   existing-root action is `Save blueprint`; a nested library entry is
 *   `Save to book`.
 * - Dirty close offers keep, discard, or that same commit action. Saving a nested
 *   selection writes it back into the root book before navigation/export state is
 *   replaced.
 *
 * Evidence: BlueprintSetupGui, BlueprintRecordPreviewEdit, and
 * BlueprintToBeSetup.
 */
export function BlueprintEditorActions({
	closeConfirmationOpen,
	dirty,
	draftBlueprint,
	onClose,
	onDiscard,
	onKeepEditing,
	onSaved,
	rootBlueprint,
	selectedPath,
}: BlueprintEditorActionsProps) {
	const navigate = useNavigate();
	const savedRoot = useMemo(
		() =>
			draftBlueprint === undefined
				? null
				: updateNestedBlueprint(rootBlueprint, selectedPath, () => draftBlueprint),
		[draftBlueprint, rootBlueprint, selectedPath],
	);
	const saveDisabled = !dirty || savedRoot === null;
	const saveLabel = selectedPath === '' ? 'Save blueprint' : 'Save to book';
	const scopeHelp =
		selectedPath === ''
			? 'Saves changes to the loaded blueprint. Export and Open in Playground use the saved blueprint.'
			: 'Saves this entry into the loaded book. Export and Open in Playground use the entire saved book.';
	const saveBlueprint = () => {
		if (savedRoot === null) {
			throw new Error('Cannot save an invalid blueprint draft.');
		}
		void navigate({
			to: '/',
			search: {
				pasted: serializeBlueprint(savedRoot),
				selection: selectedPath,
			},
		});
		onSaved(savedRoot);
	};

	return (
		<>
			<footer className="transform-workbench__footer transform-workbench__footer--actions blueprint-editor-actions">
				<button type="button" className="transform-button" onClick={onClose}>
					Cancel
				</button>
				<p className="blueprint-editor-actions__scope">{scopeHelp}</p>
				<ButtonGreen disabled={saveDisabled} onClick={saveBlueprint}>
					{saveLabel}
				</ButtonGreen>
			</footer>
			{closeConfirmationOpen ? (
				<div className="transform-dialog-backdrop transform-dialog-backdrop--confirmation">
					<section
						className="transform-dialog transform-dialog--confirmation"
						role="alertdialog"
						aria-modal="true"
						aria-labelledby="discard-blueprint-heading"
					>
						<header className="transform-dialog__header">
							<h3 id="discard-blueprint-heading">Discard unsaved changes?</h3>
						</header>
						<p>Your changes have not been written back to the loaded blueprint or book.</p>
						<div className="transform-dialog__actions">
							<button
								type="button"
								className="transform-button"
								onClick={() => {
									onKeepEditing();
								}}
							>
								Keep editing
							</button>
							<button
								type="button"
								className="transform-button transform-button--danger"
								onClick={() => {
									onDiscard();
								}}
							>
								Discard changes
							</button>
							<ButtonGreen onClick={saveBlueprint}>{saveLabel}</ButtonGreen>
						</div>
					</section>
				</div>
			) : null}
		</>
	);
}
