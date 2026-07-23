import {useNavigate} from '@tanstack/react-router';
import {useMemo} from 'react';

import {serializeBlueprint} from '../../../../parsing/blueprintParser';
import type {BlueprintString} from '../../../../parsing/types';
import {updateNestedBlueprint} from '../../../../transform/applyAtPath';
import {ButtonGreen} from '../../../ui/ButtonGreen';

interface BlueprintEditorActionsProps {
	dirty: boolean;
	draftBlueprint?: BlueprintString;
	onClose: () => void;
	onSaved: (savedRoot: BlueprintString) => void;
	rootBlueprint: BlueprintString;
	selectedPath: string;
}

export function BlueprintEditorActions({
	dirty,
	draftBlueprint,
	onClose,
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

	return (
		<footer className="transform-workbench__footer transform-workbench__footer--actions blueprint-editor-actions">
			<button type="button" className="transform-button" onClick={onClose}>
				Cancel
			</button>
			<p className="blueprint-editor-actions__scope">{scopeHelp}</p>
			<ButtonGreen
				disabled={saveDisabled}
				onClick={(event) => {
					event.preventDefault();
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
				}}
			>
				{saveLabel}
			</ButtonGreen>
		</footer>
	);
}
