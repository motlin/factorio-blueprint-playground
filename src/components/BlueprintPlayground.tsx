import {
    blueprintIdSignal, getFactorioprintsUrl,
    rootBlueprintSignal,
    selectedBlueprintSignal,
    selectedPathSignal,
} from '../state/blueprintState';

import {BasicInfoPanel} from './BasicInfoPanel';
import {BlueprintInfoPanels} from './BlueprintInfoPanels';
import {BlueprintSourceHandler} from './BlueprintSourceHandler';
import {BlueprintTree} from './BlueprintTree';
import DisqusComments from './DisqusComments.tsx';
import {ExportActions} from './ExportActions';
import {ParametersPanel} from './ParametersPanel';
import {InsetLight, Panel} from './ui';
import { useEffect } from 'preact/hooks';
import { useSearch } from '@tanstack/react-router';

export function BlueprintPlayground() {
    // Get current blueprints from signals
    const rootBlueprint = rootBlueprintSignal.value;
    const selectedBlueprint = selectedBlueprintSignal.value;
    const selectedPath = selectedPathSignal.value;
    const search = useSearch({ from: '/' });

    useEffect(() => {
        if (typeof search.selection === 'string') {
            selectedPathSignal.value = search.selection;
        }
    }, [search.selection]);

    return (
        <div className="container">
            <h1>
                Factorio Blueprint Playground
            </h1>

            <Panel title="Blueprint Input">
                <BlueprintSourceHandler />
            </Panel>

            {rootBlueprint && <div className="panels2">
                {/* Left side */}
                <div>
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
                            <BasicInfoPanel blueprint={selectedBlueprint}/>
                            <BlueprintInfoPanels blueprint={selectedBlueprint}/>
                        </>
                    )}
                </div>
            </div>
            }

            {rootBlueprint && <>
                {/* Full-width parameters panel at bottom */}
                <ParametersPanel blueprintString={selectedBlueprint} />

                {/* Comments panel - only shown for root blueprint when ID is present */}
                {blueprintIdSignal.value && (
                    <Panel title="Comments">
                        <DisqusComments
                            identifier={blueprintIdSignal.value}
                            url={getFactorioprintsUrl(blueprintIdSignal.value)}
                            title={rootBlueprint?.blueprint?.label}
                        />
                    </Panel>
                )}
            </>}
        </div>
    );
}

export default BlueprintPlayground;
