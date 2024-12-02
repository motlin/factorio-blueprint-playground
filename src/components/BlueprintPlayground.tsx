import {useNavigate} from '@tanstack/react-router';
import React from 'react';

import {extractBlueprint} from '../parsing/blueprintParser';
import {RootSearch, Route} from '../routes';

import {BasicInfoPanel} from './BasicInfoPanel';
import {BlueprintInfoPanels} from './BlueprintInfoPanels';
import BlueprintSourceHandler from './BlueprintSourceHandler';
import {BlueprintTree} from './BlueprintTree';
import DisqusComments from './DisqusComments';
import {ExportActions} from './ExportActions';
import {ParametersPanel} from './ParametersPanel';
import {ErrorAlert, InsetLight, Panel} from './ui';

export function BlueprintPlayground() {
	const {pasted, selection: selectedPath}: RootSearch = Route.useSearch();
	const loaderResult = Route.useLoaderData();
	const navigate = useNavigate({from: Route.fullPath});

	// Extract error and blueprint data
	const error = loaderResult?.error;
	const method = loaderResult?.fetchMethod;
	const rootBlueprint = loaderResult?.blueprintString;

	// Log error to console if present
	React.useEffect(() => {
		if (error) {
			console.error('Blueprint error:', error);
		}
	}, [error]);

	const selectedBlueprint =
		rootBlueprint && selectedPath ? extractBlueprint(rootBlueprint, selectedPath) : rootBlueprint;

	const onSelect = (path: string) => {
		void navigate({
			search: (prev: RootSearch): RootSearch => ({
				...prev,
				selection: path,
			}),
		});
	};

	return (
		<div className="container">
			<h1>Factorio Blueprint Playground</h1>

			<Panel title="Blueprint Input">
				<BlueprintSourceHandler pasted={pasted} />
			</Panel>

			{error && <ErrorAlert error={error.message} />}

			{rootBlueprint && (
				<div className="panels2">
					{/* Left side */}
					<div>
						<Panel title="Export Blueprint">
							<InsetLight>
								<ExportActions blueprint={rootBlueprint} path={undefined} title="Root Blueprint" />
							</InsetLight>
						</Panel>
						<Panel title="Blueprint Tree">
							<BlueprintTree
								rootBlueprint={rootBlueprint}
								onSelect={onSelect}
								selectedPath={selectedPath || ''}
							/>
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
								<BasicInfoPanel blueprint={selectedBlueprint} />
								<BlueprintInfoPanels blueprint={selectedBlueprint} />
							</>
						)}
					</div>
				</div>
			)}

			{rootBlueprint && (
				<>
					{/* Full-width parameters panel at bottom */}
					<ParametersPanel blueprintString={selectedBlueprint} />

					{/* Comments panel - only shown for root blueprint when ID is present */}
					{method === 'url' && loaderResult.id && (
						<Panel title="Comments">
							<DisqusComments
								identifier={loaderResult.id}
								url={`https://factorioprints.com/view/${loaderResult.id}`}
								title={rootBlueprint?.blueprint?.label}
							/>
						</Panel>
					)}
				</>
			)}
		</div>
	);
}

export default BlueprintPlayground;
