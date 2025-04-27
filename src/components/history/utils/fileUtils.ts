/**
 * Sanitizes a filename by replacing invalid characters and spaces
 * @param name The original filename to sanitize
 * @returns A sanitized filename that's safe for download
 */
export function sanitizeFilename(name: string): string {
	return (
		name
			.replace(/[/?%*:|"<>]/g, '-')
			.replace(/\s+/g, '-')
			.trim() || 'blueprint'
	);
}

/**
 * Creates and triggers a download for blueprint string data
 * @param blueprintString The blueprint string to download
 * @param filename The name to use for the file (without extension)
 */
export function downloadBlueprint(blueprintString: string, filename: string): void {
	const blob = new Blob([blueprintString], {type: 'text/plain'});
	const url = URL.createObjectURL(blob);
	const a = document.createElement('a');
	a.href = url;
	a.download = `${sanitizeFilename(filename)}.txt`;
	document.body.appendChild(a);
	a.click();
	document.body.removeChild(a);
	URL.revokeObjectURL(url);
}
