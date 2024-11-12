import type {ComponentChildren} from 'preact';
import type {CSSProperties} from 'preact/compat';

interface CellProps {
    children: ComponentChildren;
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
                         align = 'left',
                     }: CellProps) => {
    const classNames = ['spreadsheet-cell'];
    if (!grow) {
        classNames.push('spreadsheet-cell-fixed');
    }

    const style: CSSProperties = {
        flexGrow: grow ? 1 : 0,
        flexShrink: shrink ? 1 : 0,
        width,
        textAlign: align,
    };

    return (
        <div className={classNames.join(' ')} style={style}>
            {children}
        </div>
    );
};
