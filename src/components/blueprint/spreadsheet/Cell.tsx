import type {ReactNode, CSSProperties} from 'react';

interface CellProps {
	children: ReactNode;
	// Allows cell to grow
	grow?: boolean;
	// Allows cell to shrink
	shrink?: boolean;
	// Sets a fixed width
	width?: string;
	// Text alignment
	align?: 'left' | 'center' | 'right';
}

export const Cell = ({children, grow = false, shrink = false, width, align = 'left'}: CellProps) => {
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
		<div
			className={classNames.join(' ')}
			style={style}
		>
			{children}
		</div>
	);
};
