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

const IOS_DEVICE_REGEX = /ipad|ipod|iphone/i;

export async function copyToClipboard(text: string): Promise<boolean> {
	try {
		await navigator.clipboard.writeText(text);
		return true;
	} catch (error) {
		console.error('Clipboard API failed:', error);
	}

	try {
		const type = 'text/plain';
		const blob = new Blob([text], {type});
		await navigator.clipboard.write([new ClipboardItem({[type]: blob})]);
		return true;
	} catch (error) {
		console.error('ClipboardItem API failed:', error);
	}

	try {
		const textArea = document.createElement('textarea');
		textArea.value = text;
		textArea.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 2em;
            height: 2em;
            padding: 0;
            border: none;
            outline: none;
            boxShadow: none;
            background: transparent;
        `;
		document.body.appendChild(textArea);

		if (IOS_DEVICE_REGEX.exec(navigator.userAgent)) {
			textArea.contentEditable = 'true';
			textArea.readOnly = false;
			const range = document.createRange();
			range.selectNodeContents(textArea);
			const selection = window.getSelection();
			if (selection) {
				selection.removeAllRanges();
				selection.addRange(range);
				textArea.setSelectionRange(0, 999999);
			}
		} else {
			textArea.select();
		}

		// oxlint-disable-next-line typescript/no-deprecated -- Last-resort fallback for browsers without the async Clipboard API.
		const successful = document.execCommand('copy');
		document.body.removeChild(textArea);
		if (!successful) throw new Error('Copy command failed');
		return true;
	} catch (error) {
		console.error('Selection API failed:', error);
		return false;
	}
}
