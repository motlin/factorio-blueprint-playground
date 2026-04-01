import type React from 'react';
import {useEffect, useRef, useState} from 'react';

import {Button} from './Button';
import {Textarea} from './Textarea';

interface EditableTextProps {
	value: string;
	onChange: (value: string) => void;
	multiline?: boolean;
	placeholder?: string;
	rows?: number;
	className?: string;
	richText?: React.ReactNode;
}

export const EditableText = ({
	value,
	onChange,
	multiline = false,
	placeholder = 'Enter text...',
	rows = 3,
	className = '',
	richText,
}: EditableTextProps) => {
	const [isEditing, setIsEditing] = useState(false);
	const [editValue, setEditValue] = useState(value);
	const inputRef = useRef<HTMLInputElement>(null);
	const textareaRef = useRef<HTMLTextAreaElement>(null);

	useEffect(() => {
		setEditValue(value);
	}, [value]);

	useEffect(() => {
		if (isEditing) {
			inputRef.current?.focus();
			textareaRef.current?.focus();
		}
	}, [isEditing]);

	const handleSave = () => {
		onChange(editValue);
		setIsEditing(false);
	};

	const handleCancel = () => {
		setEditValue(value);
		setIsEditing(false);
	};

	const handleKeyDown = (e: React.KeyboardEvent) => {
		if (e.key === 'Escape') {
			handleCancel();
		} else if (e.key === 'Enter' && !multiline) {
			e.preventDefault();
			handleSave();
		} else if (e.key === 'Enter' && e.ctrlKey) {
			e.preventDefault();
			handleSave();
		}
	};

	if (isEditing) {
		return (
			<div className={`editable-container ${className}`}>
				{multiline ? (
					<Textarea
						value={editValue}
						onChange={setEditValue}
						placeholder={placeholder}
						rows={rows}
						ref={textareaRef}
						onKeyDown={handleKeyDown}
					/>
				) : (
					<input
						type="text"
						value={editValue}
						onChange={(e) => {
							setEditValue(e.target.value);
						}}
						placeholder={placeholder}
						className="editable-input w100p"
						ref={inputRef}
						onKeyDown={handleKeyDown}
					/>
				)}
				<div className="editable-actions">
					<Button onClick={handleSave}>✓ Save</Button>
					<Button onClick={handleCancel}>✗ Cancel</Button>
				</div>
			</div>
		);
	}

	return (
		<button
			type="button"
			className={`editable-display ${className}`}
			onClick={() => {
				setIsEditing(true);
			}}
			title="Click to edit"
		>
			{richText ?? (value === '' ? <span className="editable-placeholder">{placeholder}</span> : value)}
			<span className="edit-icon">✎</span>
		</button>
	);
};
