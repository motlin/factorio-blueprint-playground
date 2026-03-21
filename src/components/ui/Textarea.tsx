import type React from 'react';

export interface TextareaProps {
	value: string;
	onChange: (value: string) => void;
	placeholder?: string;
	rows?: number;
	id?: string;
	onKeyDown?: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
}

export const Textarea = ({value, onChange, placeholder, rows = 4, id, onKeyDown}: TextareaProps) => (
	<textarea
		id={id}
		value={value}
		onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => {
			const target = e.target as HTMLTextAreaElement;
			onChange(target.value);
		}}
		onKeyDown={onKeyDown}
		placeholder={placeholder}
		rows={rows}
		className="w100p editable-textarea"
	/>
);
