import type React from 'react';
import {useEffect, useId, useRef, useState} from 'react';

import {Textarea} from './Textarea';

interface EditableLabelDescriptionProps {
	label: string;
	description: string;
	onSave: (label: string, description: string) => void;
	onCancel?: () => void;
	isEditing: boolean;
}

export const EditableLabelDescription = ({
	label,
	description,
	onSave,
	onCancel,
	isEditing,
}: EditableLabelDescriptionProps) => {
	const [editedLabel, setEditedLabel] = useState(label);
	const [editedDescription, setEditedDescription] = useState(description);
	const labelInputRef = useRef<HTMLInputElement>(null);
	const labelId = useId();
	const descriptionId = useId();

	useEffect(() => {
		setEditedLabel(label);
		setEditedDescription(description);
	}, [label, description, isEditing]);

	useEffect(() => {
		if (isEditing && labelInputRef.current) {
			labelInputRef.current.focus();
		}
	}, [isEditing]);

	useEffect(() => {
		const labelChanged = editedLabel !== label;
		const descriptionChanged = editedDescription !== description;

		if (labelChanged || descriptionChanged) {
			onSave(editedLabel, editedDescription);
		}
	}, [editedLabel, editedDescription, label, description, onSave]);

	const handleKeyDown = (e: React.KeyboardEvent) => {
		if (e.key === 'Escape') {
			onCancel?.();
		} else if (e.key === 'Enter' && e.ctrlKey) {
			e.preventDefault();
			onSave(editedLabel, editedDescription);
		}
	};

	if (!isEditing) {
		return null;
	}

	return (
		<div className="blueprint-info-edit">
			<div className="editable-field">
				<label htmlFor={labelId}>Label:</label>
				<input
					id={labelId}
					type="text"
					value={editedLabel}
					onChange={(e) => {
						setEditedLabel(e.target.value);
					}}
					placeholder="Enter blueprint label..."
					className="editable-input w100p"
					ref={labelInputRef}
					onKeyDown={handleKeyDown}
					maxLength={100}
				/>
			</div>

			<div className="editable-field">
				<label htmlFor={descriptionId}>Description:</label>
				<Textarea
					id={descriptionId}
					value={editedDescription}
					onChange={setEditedDescription}
					placeholder="Enter blueprint description..."
					rows={5}
					onKeyDown={handleKeyDown}
				/>
				<div className="field-help">Press Ctrl+Enter to save. Esc to cancel.</div>
			</div>
		</div>
	);
};
