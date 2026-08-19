import {Pencil} from 'lucide-react';
import {useState} from 'react';

import {FactorioButton} from '../../../ui/FactorioUi';

const MAXIMUM_LABEL_LENGTH = 200;

interface BlueprintTitleEditorProps {
	editLabel?: string;
	emptyLabel?: string;
	inputLabel?: string;
	label: string;
	onLabelChange: (label: string) => void;
	saveLabel?: string;
}

export function BlueprintTitleEditor({
	editLabel = 'Edit blueprint title',
	emptyLabel = '<Unnamed blueprint>',
	inputLabel = 'Blueprint title',
	label,
	onLabelChange,
	saveLabel = 'Save label',
}: BlueprintTitleEditorProps) {
	const [editing, setEditing] = useState(false);
	const [draftLabel, setDraftLabel] = useState(label);

	const beginEditing = () => {
		setDraftLabel(label);
		setEditing(true);
	};
	const commit = () => {
		if (draftLabel !== label) {
			onLabelChange(draftLabel);
		}
		setEditing(false);
	};
	const cancel = () => {
		setDraftLabel(label);
		setEditing(false);
	};

	return (
		<div
			className="blueprint-editor__title-editor"
			data-testid="blueprint-title-editor"
			data-factorio-source="BlueprintLabelEdit"
		>
			{editing ? (
				<label className="blueprint-editor__title-input">
					<span className="transform-visually-hidden">{inputLabel}</span>
					<input
						type="text"
						autoFocus
						maxLength={MAXIMUM_LABEL_LENGTH}
						value={draftLabel}
						data-factorio-style="textbox"
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
				<span className="blueprint-editor__title" data-factorio-style="subheader_caption_label">
					{label === '' ? emptyLabel : label}
				</span>
			)}
			<FactorioButton
				className="blueprint-editor__title-edit"
				aria-label={editing ? saveLabel : editLabel}
				data-factorio-source-style="mini_button_aligned_to_text_vertically_when_centered"
				title={editing ? 'Save label' : 'Edit label'}
				onClick={editing ? commit : beginEditing}
				onPointerDown={(event) => {
					if (editing) {
						event.preventDefault();
					}
				}}
			>
				<Pencil size={12} aria-hidden="true" />
			</FactorioButton>
		</div>
	);
}
