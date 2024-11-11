import {rootBlueprintSignal, selectedPathSignal} from '../state/blueprintState';

import {BasicInfoPanel} from './BasicInfoPanel';
import {BlueprintInfoPanels} from './BlueprintInfoPanels';
import {BlueprintSourceHandler} from './BlueprintSourceHandler';
import {BlueprintTree} from './BlueprintTree';
import {ExportActions} from './ExportActions';
import {ParametersPanel} from './ParametersPanel';
import {InsetLight, Panel} from './ui';
import {selectedBlueprintSignal} from "../state/blueprintTree.ts";

export function BlueprintPlayground() {
    // Get current blueprints from signals
    const rootBlueprint = rootBlueprintSignal.value;
    const selectedBlueprint = selectedBlueprintSignal.value;
    const selectedPath = selectedPathSignal.value;

    return (
        <div className="container">
            <h1>
                Factorio Blueprint Playground
            </h1>

            <Panel title="Blueprint Input">
                <BlueprintSourceHandler />
            </Panel>

            <div className="panels2">
                {/* Left side */}
                <div>
                    {rootBlueprint && (
                        <>
                            <Panel title="Export Blueprint">
                                <InsetLight>
                                    <ExportActions
                                        blueprint={rootBlueprint}
                                        path={null}
                                        title="Root Blueprint"
                                    />
                                </InsetLight>
                            </Panel>
                            <Panel title="Blueprint Tree">
                                <BlueprintTree/>
                            </Panel>
                        </>
                    )}
                </div>

                {/* Right side */}
                <div>
                    {selectedBlueprint && (
                        <>
                            <Panel title="Export Selected Blueprint">
                                <InsetLight>
                                    <ExportActions
                                        blueprint={selectedBlueprint}
                                        path={selectedPath}
                                        title="Selected Blueprint"
                                    />
                                </InsetLight>
                            </Panel>
                            <BasicInfoPanel blueprint={selectedBlueprint} />
                            <BlueprintInfoPanels blueprint={selectedBlueprint} />
                        </>
                    )}
                </div>
            </div>

            {/* Full-width parameters panel at bottom */}
            <ParametersPanel blueprintString={selectedBlueprint} />
        </div>
    );
}

export default BlueprintPlayground;
