import { memo } from 'preact/compat';
import {Panel, ButtonGreen, InsetLight} from './ui';
import { serializeBlueprint } from '../parsing/blueprintParser';
import type { BlueprintString } from '../parsing/types';
import { getBlueprintContent } from '../parsing/blueprintUtils';

interface ExportPanelProps {
    rootBlueprint: BlueprintString | null;
    selectedBlueprint: BlueprintString | null;
    selectedPath: string | null;
}

// Helper function to generate filename
function getFilename(blueprint: BlueprintString, path: string | null): string {
    const content = getBlueprintContent(blueprint);

    // Use label if available, fallback to "blueprint"
    let base = content.label
        ? content.label.replace(/[^a-zA-Z0-9-_]/g, '-')
        : 'blueprint';

    // Add path suffix if it exists
    if (path) {
        base += `-${path}`;
    }

    return base;
}

// Helper function to safely copy text to clipboard
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

// Helper function to download data as a file
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

    // Handler for copying blueprint string
    const handleCopyString = async (blueprint: BlueprintString) => {
        const str = serializeBlueprint(blueprint);
        await copyToClipboard(str);
    };

    // Handler for copying JSON
    const handleCopyJSON = async (blueprint: BlueprintString) => {
        const json = JSON.stringify(blueprint, null, 2);
        await copyToClipboard(json);
    };

    // Handler for downloading JSON
    const handleDownloadJSON = (blueprint: BlueprintString, path: string | null) => {
        const json = JSON.stringify(blueprint, null, 2);
        const filename = getFilename(blueprint, path) + '.json';
        downloadFile(filename, json);
    };

    return (
        <Panel title="Export Blueprint">
            {/* Root blueprint actions */}
            <InsetLight>
                <h3>Root Blueprint</h3>
                <div className="flex flex-wrap">
                    <ButtonGreen onClick={() => handleCopyString(rootBlueprint)}>
                        Copy String
                    </ButtonGreen>
                    <ButtonGreen onClick={() => handleCopyJSON(rootBlueprint)} >
                        Copy JSON
                    </ButtonGreen>
                    <ButtonGreen onClick={() => handleDownloadJSON(rootBlueprint, null)} >
                        Download JSON
                    </ButtonGreen>
                </div>
            </InsetLight>

            {/* Selected blueprint actions (only show if different from root) */}
            {selectedBlueprint && selectedBlueprint !== rootBlueprint && (
                <InsetLight>
                    <h3>Selected Blueprint</h3>
                    <div className="flex flex-wrap">
                        <ButtonGreen onClick={() => handleCopyString(selectedBlueprint)} >
                            Copy String
                        </ButtonGreen>
                        <ButtonGreen onClick={() => handleCopyJSON(selectedBlueprint)} >
                            Copy JSON
                        </ButtonGreen>
                        <ButtonGreen onClick={() => handleDownloadJSON(selectedBlueprint, selectedPath)} >
                            Download JSON
                        </ButtonGreen>
                    </div>
                </InsetLight>
            )}
        </Panel>
    );
});