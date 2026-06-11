export function getErrorMessage(error: unknown): string {
	// If the error is already a string, return it
	if (typeof error === 'string') {
		return error;
	}

	// If it's an Error object, get its message
	if (error instanceof Error) {
		return error.message;
	}

	// If it's an object with a message property
	if (typeof error === 'object' && error !== null && 'message' in error) {
		return String(error.message);
	}

	// Fallback for completely unknown errors
	return 'An unknown error occurred';
}
