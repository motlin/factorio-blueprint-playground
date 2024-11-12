import type {ComponentChildren} from 'preact';

interface TextCellProps {
    children: ComponentChildren;
    width?: string;
    align?: 'left' | 'center' | 'right';
    grow?: boolean;
}

export const TextCell = ({ children, width, align = 'left', grow = true }: TextCellProps) => {
    return (
        <div
            className={`spreadsheet-cell ${!grow ? 'spreadsheet-cell-fixed' : ''}`}
            style={{
                width,
                textAlign: align,
                justifyContent: align === 'center' ? 'center' : align === 'right' ? 'flex-end' : 'flex-start',
            }}
        >
            {children}
        </div>
    );
};
