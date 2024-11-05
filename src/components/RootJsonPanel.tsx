import {memo} from 'preact/compat';
import {InsetLight, Panel} from './ui';
import type {BlueprintString} from '../parsing/types';
import { ExportActions } from './ExportActions';

interface ExportPanelProps {
    rootBlueprint: BlueprintString | null;
}

export const RootJsonPanel = memo(({ rootBlueprint }: ExportPanelProps) => {
    if (!rootBlueprint) return null;


    return (
        <Panel title="Export Blueprint">
            <InsetLight>
                <ExportActions
                    blueprint={rootBlueprint}
                    path={null}
                    title="Root Blueprint"
                />
            </InsetLight>
        </Panel>
    );
});