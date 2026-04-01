import type React from 'react';
import {forwardRef} from 'react';

interface TextareaProps {
	value: string;
	onChange: (value: string) => void;
	placeholder?: string;
	rows?: number;
	id?: string;
	onKeyDown?: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
	{value, onChange, placeholder, rows = 4, id, onKeyDown},
	ref,
) {
	return (
		<textarea
			ref={ref}
			id={id}
			value={value}
			onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => {
				const target = e.target;
				onChange(target.value);
			}}
			onKeyDown={onKeyDown}
			placeholder={placeholder}
			rows={rows}
			className="w100p editable-textarea"
		/>
	);
});
