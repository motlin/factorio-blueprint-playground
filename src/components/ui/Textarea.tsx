import React from 'react';

export interface TextareaProps {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    rows?: number;
}

export const Textarea = ({
                             value,
                             onChange,
                             placeholder,
                             rows = 4
                         }: TextareaProps) => (
    <textarea
        value={value}
        onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => {
            const target = e.target as HTMLTextAreaElement;
            onChange(target.value);
        }}
        placeholder={placeholder}
        rows={rows}
        className="w100p"
    />
);
