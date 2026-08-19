import {Pencil} from 'lucide-react';
import {useState} from 'react';

import {FactorioButton} from '../../../ui/FactorioUi';

interface BlueprintTitleEditorProps {
	editLabel?: string;
	emptyLabel?: string;
	inputLabel?: string;
	label: string;
	onLabelChange: (label: string) => void;
}

export function BlueprintTitleEditor({
	editLabel = 'Edit blueprint title',
	emptyLabel = 'Untitled blueprint',
	inputLabel = 'Blueprint title',
	label,
	onLabelChange,
}: BlueprintTitleEditorProps) {
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
					<span className="transform-visually-hidden">{inputLabel}</span>
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
					<span className="blueprint-editor__title">{label === '' ? emptyLabel : label}</span>
					<FactorioButton
						className="blueprint-editor__title-edit"
						aria-label={editLabel}
						title={editLabel}
						onClick={beginEditing}
					>
						<Pencil size={14} aria-hidden="true" />
					</FactorioButton>
				</>
			)}
		</div>
	);
}
