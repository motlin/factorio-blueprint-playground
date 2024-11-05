import {memo} from 'preact/compat';
import {InsetLight, Panel} from './ui';
import type {BlueprintString} from '../parsing/types';
import {ExportActions} from './ExportActions';

interface ExportPanelProps {
    selectedBlueprint?: BlueprintString | null;
    selectedPath?: string | null;
}

export const SelectedJsonPanel = memo(({ selectedBlueprint, selectedPath }: ExportPanelProps) => {
    if (!selectedBlueprint) return null;

    return (
        <Panel title="Export Blueprint">
            <InsetLight>
                <ExportActions
                    blueprint={selectedBlueprint}
                    path={selectedPath || null}
                    title="Selected Blueprint"
                />
            </InsetLight>
        </Panel>
    );
});