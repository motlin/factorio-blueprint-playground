import { memo } from 'preact/compat';
import { BlueprintString } from '../parsing/types';
import { BlueprintWrapper } from '../parsing/BlueprintWrapper';
import { serializeBlueprint } from '../parsing/blueprintParser';
import { ButtonGreen } from './ui';
import { ClipboardCopy, Download, FileJson } from 'lucide-react';

interface ExportActionsProps {
    blueprint: BlueprintString;
    path: string | null;
    title: string;
}

async function copyToClipboard(text: string) {
    try {
        await navigator.clipboard.writeText(text);
    } catch (err) {
        console.error('Failed to copy:', err);
        // Fallback for older browsers
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed';
        document.body.appendChild(textarea);
        textarea.select();
        try {
            document.execCommand('copy');
        } catch (err) {
            console.error('Fallback copy failed:', err);
        }
        document.body.removeChild(textarea);
    }
}

function getFilename(blueprint: BlueprintString, path: string | null): string {
    const wrapper = new BlueprintWrapper(blueprint);
    const label = wrapper.getLabel();

    // Use label if available, fallback to "blueprint"
    let base = label
        ? label.replace(/[^a-zA-Z0-9-_]/g, '-')
        : 'blueprint';

    // Add path suffix if it exists
    if (path) {
        base += `-${path}`;
    }

    return base;
}

function downloadFile(filename: string, data: string) {
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

const ButtonWithIcon = ({icon: Icon, text, onClick}: { icon: any, text: string, onClick: () => void }) => (
    <ButtonGreen onClick={onClick}>
        <Icon size={18} className="mr8"/>
        {text}
    </ButtonGreen>
);

export const ExportActions = memo(({ blueprint, path, title }: ExportActionsProps) => {
    if (!blueprint) return null;

    const handleCopyString = async () => {
        const str = serializeBlueprint(blueprint);
        await copyToClipboard(str);
    };

    const handleCopyJSON = async () => {
        const json = JSON.stringify(blueprint, null, 2);
        await copyToClipboard(json);
    };

    const handleDownloadString = () => {
        const str = serializeBlueprint(blueprint);
        const filename = getFilename(blueprint, path) + '.txt';
        downloadFile(filename, str);
    };

    return (
        <>
            <h3>{title}</h3>
            <div className="flex-space-between">
                <ButtonWithIcon
                    icon={ClipboardCopy}
                    text="Copy String"
                    onClick={handleCopyString}
                />
                <ButtonWithIcon
                    icon={FileJson}
                    text="Copy JSON"
                    onClick={handleCopyJSON}
                />
                <ButtonWithIcon
                    icon={Download}
                    text="Download String"
                    onClick={handleDownloadString}
                />
            </div>
        </>
    );
});