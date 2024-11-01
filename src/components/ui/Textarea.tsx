export const Textarea = ({
                             value,
                             onChange,
                             placeholder,
                             rows = 4
                         }: {
    value: string
    onChange: (value: string) => void
    placeholder?: string
    rows?: number
}) => (
    <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        className="w100p"
    />
);