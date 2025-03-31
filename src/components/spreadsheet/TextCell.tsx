import type {ReactNode} from 'react';

interface TextCellProps {
	children: ReactNode;
	width?: string;
	align?: 'left' | 'center' | 'right';
	grow?: boolean;
}

export const TextCell = ({children, width, align = 'left', grow = true}: TextCellProps) => {
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
