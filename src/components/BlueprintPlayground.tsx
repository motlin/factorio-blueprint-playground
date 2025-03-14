import {useNavigate} from '@tanstack/react-router';
import React, {useEffect} from 'react';

import {BlueprintFetchResult} from '../fetching/blueprintFetcher';
import {extractBlueprint} from '../parsing/blueprintParser';
import type {BlueprintString} from '../parsing/types';
import {RootSearch, Route} from '../routes';
import {updateBlueprint} from '../state/blueprintLocalStorage';
import {blueprintStorage} from '../storage/blueprints';

import {BasicInfoPanel} from './BasicInfoPanel';
import {BlueprintInfoPanels} from './BlueprintInfoPanels';
import BlueprintSourceHandler from './BlueprintSourceHandler';
import {BlueprintTree} from './BlueprintTree';
import DisqusComments from './DisqusComments';
import {ExportActions} from './ExportActions';
import {ParametersPanel} from './ParametersPanel';
import {ErrorAlert, Panel} from './ui';

function getFactorioprintsUrl(id?: string): string | undefined {
	if (!id) {
		return undefined;
	}
	return `https://factorioprints.com/view/${id}`;
}

export function BlueprintPlayground() {
	const {pasted, selection: selectedPath}: RootSearch = Route.useSearch();
	const loaderData: BlueprintFetchResult = Route.useLoaderData();

	const navigate = useNavigate({from: Route.fullPath});
	const rootBlueprint: BlueprintString | undefined = loaderData?.success ? loaderData.blueprintString : undefined;
	const error = loaderData?.success ? undefined : loaderData?.error;
	const disqusId: string | undefined = loaderData?.success ? loaderData.id : undefined;

	// Log errors to console in development
	React.useEffect(() => {
		if (error) {
			console.error('Blueprint error:', error);
		}
	}, [error]);

	const selectedBlueprint = rootBlueprint && extractBlueprint(rootBlueprint, selectedPath);

	// Store the selection path in IndexedDB when it changes
	const onSelect = (path: string) => {
		// Update navigation
		void navigate({
			search: (prev: RootSearch): RootSearch => ({
				...prev,
				selection: path,
			}),
		});

		// If we have a pasted blueprint and it was loaded successfully, update its selection in IndexedDB
		if (pasted && rootBlueprint && loaderData.success) {
			void (async () => {
				try {
					// Only update selection if the path is valid for this blueprint
					try {
						// Try to extract the blueprint at this path to validate it works
						extractBlueprint(rootBlueprint, path);

						// Find this specific blueprint in history and update its selection
						const blueprints = await blueprintStorage.list();
						for (const bp of blueprints) {
							if (bp.metadata.data === pasted) {
								await updateBlueprint(bp.metadata.createdOn, {
									metadata: {
										selection: path,
									},
								});
								break;
							}
						}
					} catch (error) {
						console.warn('Invalid selection path, not updating in history:', error);
					}
				} catch (error) {
					console.error('Failed to update selection in IndexedDB:', error);
				}
			})();
		}
	};

	// Update selection in IndexedDB when it changes via URL
	useEffect(() => {
		if (selectedPath && pasted && rootBlueprint && loaderData.success) {
			void (async () => {
				try {
					// Only update selection if the path is valid for this blueprint
					try {
						// Try to extract the blueprint at this path to validate it works
						extractBlueprint(rootBlueprint, selectedPath);

						// Find this specific blueprint in history and update its selection
						const blueprints = await blueprintStorage.list();
						for (const bp of blueprints) {
							if (bp.metadata.data === pasted) {
								await updateBlueprint(bp.metadata.createdOn, {
									metadata: {
										selection: selectedPath,
									},
								});
								break;
							}
						}
					} catch (error) {
						console.warn('Invalid selection path from URL, not updating in history:', error);
					}
				} catch (error) {
					console.error('Failed to update selection in IndexedDB:', error);
				}
			})();
		}
	}, [selectedPath, pasted, rootBlueprint, loaderData?.success]);

	return (
		<div className="container">
			<h1>Factorio Blueprint Playground</h1>

			<Panel title="Blueprint Input">
				<BlueprintSourceHandler pasted={pasted} />
			</Panel>

			{error && <ErrorAlert error={error} />}

			<div className="panels2">
				{/* Left side */}
				<div>
					<ExportActions blueprint={rootBlueprint} path={undefined} title="Root Blueprint" />

					<BlueprintTree
						rootBlueprint={rootBlueprint}
						onSelect={onSelect}
						selectedPath={selectedPath || ''}
					/>
				</div>

				{/* Right side */}
				<div>
					<ExportActions blueprint={selectedBlueprint} path={selectedPath} title="Selected Blueprint" />
					<BasicInfoPanel blueprint={selectedBlueprint} />
					<BlueprintInfoPanels blueprint={selectedBlueprint} />
				</div>
			</div>

			<ParametersPanel blueprintString={selectedBlueprint} />

			<DisqusComments
				identifier={disqusId}
				url={getFactorioprintsUrl(disqusId)}
				title={rootBlueprint?.blueprint?.label}
			/>
		</div>
	);
}

export default BlueprintPlayground;
