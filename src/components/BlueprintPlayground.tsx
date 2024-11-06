import {signal} from '@preact/signals';

import {deserializeBlueprint} from '../parsing/blueprintParser';
import {
    resetBlueprintTree,
    rootBlueprintSignal,
    selectedBlueprintPathSignal,
    selectedBlueprintSignal,
} from '../state/blueprintTree';

import {BasicInfoPanel} from './BasicInfoPanel';
import {BlueprintInfoPanels} from './BlueprintInfoPanels';
import { BlueprintSourceHandler } from './BlueprintSourceHandler';
import { BlueprintTree } from './BlueprintTree';
import {ExportActions} from './ExportActions.tsx';
import {ParametersPanel} from './ParametersPanel';
import {ErrorAlert, InsetLight, Panel} from './ui';

// Local UI state signal
const errorSignal = signal<string | null>(null);

export function BlueprintPlayground() {
    const handleBlueprintPaste = (value: string) => {
        // Guard against undefined/null value
        if (!value) {
            resetBlueprintTree();
            errorSignal.value = null;
            return;
        }

        // Handle empty input
        if (!value.trim()) {
            resetBlueprintTree();
            errorSignal.value = null;
            return;
        }

        try {
            errorSignal.value = null;
            rootBlueprintSignal.value = deserializeBlueprint(value.trim());

            // Always select root with empty string path
            selectedBlueprintPathSignal.value = '';
        } catch (err: unknown) {
            console.error('Failed to parse blueprint:', err);
            if (err instanceof Error) {
                errorSignal.value = err.message;
            } else {
                errorSignal.value = String(err);
            }
            resetBlueprintTree();
        }
    };

    return (
        <div className="container">
            <h1>
                Factorio Blueprint Playground
            </h1>

            <Panel title="Blueprint Input">
                <BlueprintSourceHandler onBlueprintString={handleBlueprintPaste} />
                <ErrorAlert error={errorSignal.value}/>
            </Panel>

            <div className="panels2">
                {/* Left side */}
                <div>
                    {rootBlueprintSignal.value && <Panel title="Export Blueprint">
                        <InsetLight>
                            <ExportActions
                                blueprint={rootBlueprintSignal.value}
                                path={null}
                                title="Root Blueprint"
                            />
                        </InsetLight>
                    </Panel>
                    }
                    {rootBlueprintSignal.value?.blueprint_book && (
                        <Panel title="Blueprint Tree">
                            <BlueprintTree/>
                        </Panel>
                    )}
                </div>

                {/* Right side */}
                <div>
                    {selectedBlueprintSignal.value && (
                        <>
                            <Panel title="Export Blueprint">
                                <InsetLight>
                                    <ExportActions
                                        blueprint={selectedBlueprintSignal.value}
                                        path={selectedBlueprintPathSignal.value}
                                        title="Selected Blueprint"
                                    />
                                </InsetLight>
                            </Panel>
                            <BasicInfoPanel blueprint={selectedBlueprintSignal.value}/>
                            <BlueprintInfoPanels blueprint={selectedBlueprintSignal.value}/>
                        </>
                    )}
                </div>
            </div>

            {/* Full-width parameters panel at bottom */}
            <ParametersPanel blueprintString={selectedBlueprintSignal.value}/>
        </div>
    );
}

export default BlueprintPlayground;
