import {Pencil} from 'lucide-react';
import {useState} from 'react';

interface BlueprintTitleEditorProps {
	label: string;
	onLabelChange: (label: string) => void;
}

export function BlueprintTitleEditor({label, onLabelChange}: BlueprintTitleEditorProps) {
	const [editing, setEditing] = useState(false);
	const [draftLabel, setDraftLabel] = useState(label);

	const beginEditing = () => {
		setDraftLabel(label);
		setEditing(true);
	};
	const commit = () => {
		onLabelChange(draftLabel);
		setEditing(false);
	};
	const cancel = () => {
		setDraftLabel(label);
		setEditing(false);
	};

	return (
		<div className="blueprint-editor__title-editor">
			{editing ? (
				<label className="blueprint-editor__title-input">
					<span className="transform-visually-hidden">Blueprint title</span>
					<input
						type="text"
						autoFocus
						value={draftLabel}
						onBlur={commit}
						onChange={(event) => {
							setDraftLabel(event.currentTarget.value);
						}}
						onKeyDown={(event) => {
							if (event.key === 'Enter') {
								event.preventDefault();
								event.stopPropagation();
								commit();
							} else if (event.key === 'Escape') {
								event.preventDefault();
								event.stopPropagation();
								cancel();
							}
						}}
					/>
				</label>
			) : (
				<>
					<span className="blueprint-editor__title">{label === '' ? 'Untitled blueprint' : label}</span>
					<button
						type="button"
						className="factorio-toolbar-button blueprint-editor__title-edit"
						aria-label="Edit blueprint title"
						title="Edit blueprint title"
						onClick={beginEditing}
					>
						<Pencil size={14} aria-hidden="true" />
					</button>
				</>
			)}
		</div>
	);
}
