import type {ReactNode} from 'react';

interface RowProps {
	children: ReactNode;
}

export const Row = ({children}: RowProps) => {
	return <div className="spreadsheet-row">{children}</div>;
};
