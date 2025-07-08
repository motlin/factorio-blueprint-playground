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
		return (
			<button
				className={`${className} sortable`}
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
