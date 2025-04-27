import {format, formatDistanceToNow, isAfter, sub} from 'date-fns';

/**
 * Formats a timestamp in a user-friendly way:
 * - "just now" for updates within the last 30 seconds
 * - Relative time (e.g., "2 hours ago") for updates within the last 7 days
 * - MM/dd/yy format for older timestamps
 */
export function formatDate(timestamp: number): string {
	const date = new Date(timestamp);
	const now = new Date();

	// For very recent updates (less than 30 seconds ago)
	if (isAfter(date, sub(now, {seconds: 30}))) {
		return 'just now';
	}

	// For times within the past week, show relative time
	if (isAfter(date, sub(now, {days: 7}))) {
		return formatDistanceToNow(date, {addSuffix: true});
	}

	// For older times, show the date in MM/DD/YY format
	return format(date, 'MM/dd/yy');
}

/**
 * Formats a date in ISO format for export filenames
 */
export function formatDateForExport(date: Date): string {
	return format(date, 'yyyy-MM-dd HH:mm');
}
