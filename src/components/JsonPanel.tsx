import {memo} from 'preact/compat';
import {ButtonGreen, InsetLight, Panel} from './ui';
import {serializeBlueprint} from '../parsing/blueprintParser';
import type {BlueprintString} from '../parsing/types';
import {ClipboardCopy, Download, FileJson} from 'lucide-react';
import {BlueprintWrapper} from "../parsing/BlueprintWrapper.ts";

interface ExportPanelProps {
    rootBlueprint: BlueprintString | null;
    selectedBlueprint: BlueprintString | null;
    selectedPath: string | null;
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

export const JsonPanel = memo(({ rootBlueprint, selectedBlueprint, selectedPath }: ExportPanelProps) => {
    if (!rootBlueprint) return null;

    const handleCopyString = async (blueprint: BlueprintString) => {
        const str = serializeBlueprint(blueprint);
        await copyToClipboard(str);
    };

    const handleCopyJSON = async (blueprint: BlueprintString) => {
        const json = JSON.stringify(blueprint, null, 2);
        await copyToClipboard(json);
    };

    const handleDownloadJSON = (blueprint: BlueprintString, path: string | null) => {
        const json = JSON.stringify(blueprint, null, 2);
        const filename = getFilename(blueprint, path) + '.json';
        downloadFile(filename, json);
    };

    const ButtonWithIcon = ({icon: Icon, text, onClick}: { icon: any, text: string, onClick: () => void }) => (
        <ButtonGreen onClick={onClick}>
            <Icon size={18} className="mr8"/>
            {text}
        </ButtonGreen>
    );

    return (
        <Panel title="Export Blueprint">
            {/* Root blueprint actions */}
            <InsetLight>
                <h3>Root Blueprint</h3>
                <div className="flex-space-between">
                    <ButtonWithIcon
                        icon={ClipboardCopy}
                        text="Copy String"
                        onClick={() => handleCopyString(rootBlueprint)}
                    />
                    <ButtonWithIcon
                        icon={FileJson}
                        text="Copy JSON"
                        onClick={() => handleCopyJSON(rootBlueprint)}
                    />
                    <ButtonWithIcon
                        icon={Download}
                        text="Download JSON"
                        onClick={() => handleDownloadJSON(rootBlueprint, null)}
                    />
                </div>
            </InsetLight>

            {/* Selected blueprint actions */}
            {selectedBlueprint && selectedBlueprint !== rootBlueprint && (
                <InsetLight>
                    <h3>Selected Blueprint</h3>
                    <div className="flex-space-between">
                        <ButtonWithIcon
                            icon={ClipboardCopy}
                            text="Copy String"
                            onClick={() => handleCopyString(selectedBlueprint)}
                        />
                        <ButtonWithIcon
                            icon={FileJson}
                            text="Copy JSON"
                            onClick={() => handleCopyJSON(selectedBlueprint)}
                        />
                        <ButtonWithIcon
                            icon={Download}
                            text="Download JSON"
                            onClick={() => handleDownloadJSON(selectedBlueprint, selectedPath)}
                        />
                    </div>
                </InsetLight>
            )}
        </Panel>
    );
});