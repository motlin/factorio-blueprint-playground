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

declare global {
    interface Window {
        adsAreWithUs?: boolean;
    }
}

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

            {window.adsAreWithUs === undefined && (
                <Panel title="Adblocker Detected">
                    <p>We noticed you're using an adblocker. Ad revenue is used for hosting the project. Please consider turning off your adblocker to support us.</p>
                </Panel>
            )}

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
