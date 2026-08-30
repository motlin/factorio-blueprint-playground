import {ClipboardCopy, Download, FileJson, type LucideIcon, SquarePen} from 'lucide-react';
import {memo, useMemo} from 'react';

import {buildEditorUrl} from '../../../lib/factorioBlueprintEditor';
import {BlueprintWrapper} from '../../../parsing/BlueprintWrapper';
import {serializeBlueprint} from '../../../parsing/blueprintParser';
import type {BlueprintString} from '../../../parsing/types';
import {ButtonGreen} from '../../ui/ButtonGreen';
import {InsetLight} from '../../ui/InsetLight';
import {LinkGreen} from '../../ui/LinkGreen';
import {Panel} from '../../ui/Panel';

const IOS_DEVICE_REGEX = /ipad|ipod|iphone/i;

interface ExportActionsProps {
	blueprint?: BlueprintString;
	path?: string;
	title: string;
	/** Factorio Prints API url addressing this exact blueprint, when it has one. */
	apiSourceUrl?: string;
	/** Where the blueprint was fetched from, used when it is too big to put in a url. */
	sourceUrl?: string;
}

async function copyToClipboard(text: string): Promise<boolean> {
	// Try the modern Clipboard API first
	try {
		await navigator.clipboard.writeText(text);
		return true;
	} catch (err) {
		console.error('Clipboard API failed:', err);
	}

	// If Clipboard API fails or isn't available, try ClipboardItem API
	try {
		const type = 'text/plain';
		const blob = new Blob([text], {type});
		const data = [new ClipboardItem({[type]: blob})];
		await navigator.clipboard.write(data);
		return true;
	} catch (err) {
		console.error('ClipboardItem API failed:', err);
	}

	// Final fallback using Selection API
	try {
		const textArea = document.createElement('textarea');
		textArea.value = text;

		// Avoid scrolling to bottom
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
			// Handle iOS devices
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
			// All other devices
			textArea.select();
		}

		// oxlint-disable-next-line typescript/no-deprecated -- execCommand is the last-resort clipboard fallback for browsers lacking the async Clipboard API
		const successful = document.execCommand('copy');
		document.body.removeChild(textArea);

		if (!successful) {
			throw new Error('Copy command failed');
		}

		return true;
	} catch (err) {
		console.error('Selection API failed:', err);
		return false;
	}
}

function getFilename(blueprint: BlueprintString, path?: string): string {
	const wrapper = new BlueprintWrapper(blueprint);
	const label = wrapper.getLabel();

	// Use label if available, fallback to "blueprint"
	let base = label != null && label !== '' ? label.replace(/[^a-zA-Z0-9-_]/g, '-') : 'blueprint';

	// Add path suffix if it exists
	if (path != null && path !== '') {
		base += `-${path}`;
	}

	return base;
}

function downloadFile(filename: string, data: string) {
	const blob = new Blob([data], {type: 'application/json'});
	const url = URL.createObjectURL(blob);
	const a = document.createElement('a');
	a.href = url;
	a.download = filename;
	document.body.appendChild(a);
	a.click();
	document.body.removeChild(a);
	URL.revokeObjectURL(url);
}

interface ButtonWithIconProps {
	icon: LucideIcon;
	text: string;
	onClick: () => void;
}

const ButtonWithIcon = ({icon: Icon, text, onClick}: ButtonWithIconProps) => (
	<ButtonGreen
		onClick={(e) => {
			e.preventDefault();
			onClick();
		}}
	>
		{' '}
		<Icon size={18} className="mr8" />
		{text}
	</ButtonGreen>
);

const ExportActionsComponent = ({blueprint, path, title, apiSourceUrl, sourceUrl}: ExportActionsProps) => {
	const editorUrl = useMemo(() => {
		if (blueprint == null) {
			return undefined;
		}

		// Serializing is the expensive part, so skip it when the api already
		// addresses this blueprint.
		if (apiSourceUrl != null && apiSourceUrl !== '') {
			return buildEditorUrl({apiSourceUrl});
		}

		return buildEditorUrl({blueprintString: serializeBlueprint(blueprint), sourceUrl});
	}, [blueprint, apiSourceUrl, sourceUrl]);

	if (!blueprint) return null;

	const handleCopyString = () => {
		const str = serializeBlueprint(blueprint);
		void copyToClipboard(str);
	};

	const handleCopyJSON = () => {
		const json = JSON.stringify(blueprint, null, 2);
		void copyToClipboard(json);
	};

	const handleDownloadString = () => {
		const str = serializeBlueprint(blueprint);
		const filename = `${getFilename(blueprint, path)}.txt`;
		downloadFile(filename, str);
	};

	return (
		<Panel title={`Export ${title}`}>
			<InsetLight>
				<h3>{title}</h3>
				{/* Wraps because a fourth action does not fit on one line in a side-by-side panel. */}
				<div className="flex-space-between flex-wrap export-actions">
					<ButtonWithIcon icon={ClipboardCopy} text="Copy String" onClick={handleCopyString} />
					<ButtonWithIcon icon={FileJson} text="Copy JSON" onClick={handleCopyJSON} />
					<ButtonWithIcon icon={Download} text="Download String" onClick={handleDownloadString} />
					{editorUrl == null ? null : (
						<LinkGreen href={editorUrl}>
							<SquarePen size={18} className="mr8" />
							Open in Editor
						</LinkGreen>
					)}
				</div>
			</InsetLight>
		</Panel>
	);
};

ExportActionsComponent.displayName = 'ExportActions';
export const ExportActions = memo(ExportActionsComponent);
