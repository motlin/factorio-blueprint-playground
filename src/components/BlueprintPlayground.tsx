import {useNavigate} from '@tanstack/react-router';

import {BlueprintFetchResult, UrlBlueprintResult} from '../fetching/blueprintFetcher';
import {extractBlueprint} from '../parsing/blueprintParser';
import {RootSearch, Route} from '../routes';

import {BasicInfoPanel} from './BasicInfoPanel';
import {BlueprintInfoPanels} from './BlueprintInfoPanels';
import BlueprintSourceHandler from './BlueprintSourceHandler';
import {BlueprintTree} from './BlueprintTree';
import DisqusComments from './DisqusComments.tsx';
import {ExportActions} from './ExportActions';
import {ParametersPanel} from './ParametersPanel';
import {InsetLight, Panel} from './ui';

function getFactorioprintsUrl(id: string): string {
    return `https://factorioprints.com/view/${id}`;
}

export function BlueprintPlayground() {
    const { pasted, selection: selectedPath }: RootSearch = Route.useSearch();
    const loaderData: BlueprintFetchResult = Route.useLoaderData();
    const method = loaderData?.fetchMethod;
    const rootBlueprint = loaderData?.blueprintString;

    const selectedBlueprint = rootBlueprint && extractBlueprint(rootBlueprint, selectedPath);

    const navigate = useNavigate({ from: Route.fullPath });

    const onSelect: (path: string) => void = (path) => {
        void navigate({
            search: (prev: RootSearch): RootSearch => ({
                ...prev,
                selection: path,
            }),
        });
    };

    return (
        <div className="container">
            <h1>
                Factorio Blueprint Playground
            </h1>

            <Panel title="Blueprint Input">
                <BlueprintSourceHandler pasted={pasted} />
            </Panel>

            {rootBlueprint && <div className="panels2">
                {/* Left side */}
                <div>
                    <Panel title="Export Blueprint">
                        <InsetLight>
                            <ExportActions
                                blueprint={rootBlueprint}
                                path={undefined}
                                title="Root Blueprint"
                            />
                        </InsetLight>
                    </Panel>
                    <Panel title="Blueprint Tree">
                        <BlueprintTree rootBlueprint={rootBlueprint} onSelect={onSelect} selectedPath={selectedPath || ''}/>
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
                {method === 'url' && (
                    <Panel title="Comments">
                        <DisqusComments
                            identifier={(loaderData as UrlBlueprintResult).id}
                            url={getFactorioprintsUrl((loaderData as UrlBlueprintResult).id)}
                            title={rootBlueprint?.blueprint?.label}
                        />
                    </Panel>
                )}
            </>}
        </div>
    );
}

export default BlueprintPlayground;
