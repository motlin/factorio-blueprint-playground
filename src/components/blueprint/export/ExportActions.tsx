import {ClipboardCopy, Download, FileJson, type LucideIcon} from 'lucide-react';
import {memo} from 'react';

import {BlueprintWrapper} from '../../../parsing/BlueprintWrapper';
import {serializeBlueprint} from '../../../parsing/blueprintParser';
import type {BlueprintString} from '../../../parsing/types';
import {ButtonGreen} from '../../ui/ButtonGreen';
import {InsetLight} from '../../ui/InsetLight';
import {Panel} from '../../ui/Panel';
import {copyToClipboard} from '../../history/utils/fileUtils';

interface ExportActionsProps {
	blueprint?: BlueprintString;
	path?: string;
	title: string;
}

interface BlueprintExportButtonsProps {
	blueprint: BlueprintString;
	path?: string;
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

function BlueprintExportButtons({blueprint, path}: BlueprintExportButtonsProps) {
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
		<div className="blueprint-export-actions flex-space-between">
			<ButtonWithIcon icon={ClipboardCopy} text="Copy String" onClick={handleCopyString} />
			<ButtonWithIcon icon={FileJson} text="Copy JSON" onClick={handleCopyJSON} />
			<ButtonWithIcon icon={Download} text="Download String" onClick={handleDownloadString} />
		</div>
	);
}

const ExportActionsComponent = ({blueprint, path, title}: ExportActionsProps) => {
	if (!blueprint) return null;

	return (
		<Panel title={`Export ${title}`}>
			<InsetLight>
				<h3>{title}</h3>
				<BlueprintExportButtons blueprint={blueprint} path={path} />
			</InsetLight>
		</Panel>
	);
};

ExportActionsComponent.displayName = 'ExportActions';
export const ExportActions = memo(ExportActionsComponent);
