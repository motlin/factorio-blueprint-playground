import {type SortDirection, SortIndicator} from './SortIndicator';

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

	if (onSort) {
		const sortStateLabel =
			sortDirection === null ? label : `${label}, sorted ${sortDirection === 'asc' ? 'ascending' : 'descending'}`;
		return (
			<button
				className={`${className} sortable`}
				aria-label={sortStateLabel}
				data-sort-direction={sortDirection ?? undefined}
				onClick={handleClick}
				type="button"
			>
				{label}
				<SortIndicator direction={sortDirection} />
			</button>
		);
	}

	return <div className={className}>{label}</div>;
}
