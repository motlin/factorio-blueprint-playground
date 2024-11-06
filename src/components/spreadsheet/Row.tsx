interface RowProps {
    children: React.ReactNode;
}

export const Row = ({ children }: RowProps) => {
    return (
        <div className="spreadsheet-row">
            {children}
        </div>
    );
};
