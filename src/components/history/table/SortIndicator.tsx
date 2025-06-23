export type SortDirection = 'asc' | 'desc' | null;

interface SortIndicatorProps {
	direction: SortDirection;
	className?: string;
}

export function SortIndicator({direction, className = ''}: SortIndicatorProps) {
	if (direction === null) {
		return null;
	}

	return <span className={`sort-indicator ${className}`}>{direction === 'asc' ? '↑' : '↓'}</span>;
}
