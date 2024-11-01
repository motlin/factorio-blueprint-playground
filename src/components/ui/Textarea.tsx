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
        style={{
            width: '100%',
            backgroundColor: '#8e8e8e',
            border: 'none',
            borderRadius: '4px',
            padding: '6px',
            boxShadow: 'inset 0px 4px 1px -2px #000, inset 0px -4px 1px -2px #c5c5c5, inset 2px 0px 1px 0px #5f5f5f, inset -2px 0px 1px 0px #5f5f5f, inset 0px -2px 2px 0px #5f5f5f, 0px 0px 4px 1px #2e2521',
            fontFamily: 'inherit',
            lineHeight: 1.2,
            fontSize: '105%'
        }}
    />
);