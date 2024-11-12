import type {ComponentChildren} from 'preact';

interface RowProps {
    children: ComponentChildren;
}

export const Row = ({ children }: RowProps) => {
    return (
        <div className="spreadsheet-row">
            {children}
        </div>
    );
};
