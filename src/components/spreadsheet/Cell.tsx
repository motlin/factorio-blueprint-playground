interface CellProps {
    children: React.ReactNode;
    grow?: boolean;      // Allows cell to grow
    shrink?: boolean;    // Allows cell to shrink
    width?: string;      // Sets a fixed width
    align?: 'left' | 'center' | 'right';  // Text alignment
}

export const Cell = ({
                         children,
                         grow = false,
                         shrink = false,
                         width,
                         align = 'left'
                     }: CellProps) => {
    const style: React.CSSProperties = {
        flexGrow: grow ? 1 : 0,
        flexShrink: shrink ? 1 : 0,
        width,
        textAlign: align
    };

    return (
        <div className="spreadsheet-cell" style={style}>
            {children}
        </div>
    );
};
