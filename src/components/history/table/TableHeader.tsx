import React from 'react';

import {SortIndicator, type SortDirection} from './SortIndicator';

interface TableHeaderProps {
	label: string;
	className?: string;
	sortDirection?: SortDirection;
	onSort?: () => void;
}

export function TableHeader({label, className = 'history-header', sortDirection = null, onSort}: TableHeaderProps) {
	const handleClick = () => {
		if (onSort) {
			onSort();
		}
	};

	return (
		<div
			className={onSort ? `${className} sortable` : className}
			onClick={onSort ? handleClick : undefined}
		>
			{label}
			{onSort && <SortIndicator direction={sortDirection} />}
		</div>
	);
}
