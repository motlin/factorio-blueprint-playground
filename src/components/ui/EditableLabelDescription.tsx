import React, {useEffect, useId, useRef, useState} from 'react';

import {Textarea} from './Textarea';

interface EditableLabelDescriptionProps {
	label: string;
	description: string;
	onSave: (label: string, description: string) => void;
	onCancel: () => void;
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

	// Update local state when props change
	useEffect(() => {
		setEditedLabel(label);
		setEditedDescription(description);
	}, [label, description, isEditing]);

	// Focus label input when entering edit mode
	useEffect(() => {
		if (isEditing && labelInputRef.current) {
			labelInputRef.current.focus();
		}
	}, [isEditing]);

	// Track changes and notify parent
	useEffect(() => {
		const labelChanged = editedLabel !== label;
		const descriptionChanged = editedDescription !== description;

		// Notify parent of changes so it can enable/disable the save button
		if (labelChanged || descriptionChanged) {
			onSave(editedLabel, editedDescription);
		}
	}, [editedLabel, editedDescription, label, description, onSave]);

	// Handle keyboard events
	const handleKeyDown = (e: React.KeyboardEvent) => {
		if (e.key === 'Escape') {
			onCancel();
		} else if (e.key === 'Enter' && e.ctrlKey) {
			// Save on Ctrl+Enter
			e.preventDefault();
			onSave(editedLabel, editedDescription);
		}
	};

	// Component is not rendered in non-editing state now
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
					onChange={(e) => setEditedLabel(e.target.value)}
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
