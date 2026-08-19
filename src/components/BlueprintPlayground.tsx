import {getRouteApi, useNavigate} from '@tanstack/react-router';
import {useLiveQuery} from 'dexie-react-hooks';
import React, {useEffect, useState} from 'react';
import {ErrorBoundary} from 'react-error-boundary';

import type {BlueprintFetchResult} from '../fetching/blueprintFetcher';
import {logger} from '../lib/sentry';
import {extractBlueprint} from '../parsing/blueprintParser';
import type {BlueprintString} from '../parsing/types';
import type {RootSearch} from '../routes';
import {updateBlueprintMetadata} from '../state/blueprintLocalStorage';
import {db} from '../storage/db';

import DisqusComments from './blueprint/disqus/DisqusComments';
import {BlueprintErrorFallback} from './blueprint/error/BlueprintErrorFallback';
import {ExportActions} from './blueprint/export/ExportActions';
import BlueprintSourceHandler from './blueprint/input/BlueprintSourceHandler';
import {BlueprintInfoPanels} from './blueprint/panels/BlueprintInfoPanels';
import {BasicInfoPanel} from './blueprint/panels/info/BasicInfoPanel';
import {ParametersPanel} from './blueprint/panels/parameters/ParametersPanel';
import {TransformPanel} from './blueprint/panels/transform/TransformPanel';
import {BlueprintEditorSourceMode} from './blueprint/panels/transform/useBlueprintEditorDraft';
import {BlueprintTree} from './blueprint/tree/BlueprintTree';
import {ErrorAlert} from './ui/ErrorAlert';
import {Panel} from './ui/Panel';

const routeApi = getRouteApi('/');

interface BlueprintEditorCommitState {
	committedRoot: BlueprintString;
	sourceInput: string | undefined;
}

function getFactorioprintsUrl(id?: string): string | undefined {
	if (id == null || id === '') {
		return undefined;
	}
	return `https://factorioprints.com/view/${id}`;
}

export function BlueprintPlayground() {
	const {pasted, selection: selectedPath, focusTextarea}: RootSearch = routeApi.useSearch();
	const loaderData: BlueprintFetchResult = routeApi.useLoaderData();

	const navigate = useNavigate({from: routeApi.id});
	const isSuccess = loaderData?.success === true;
	const loadedRootBlueprint: BlueprintString | undefined = isSuccess ? loaderData.blueprintString : undefined;
	const [editorCommitState, setEditorCommitState] = useState<BlueprintEditorCommitState>();
	const editorCommitMatchesSource = editorCommitState !== undefined && editorCommitState.sourceInput === pasted;
	const rootBlueprint = editorCommitMatchesSource ? editorCommitState.committedRoot : loadedRootBlueprint;
	const error: Error | undefined = loaderData != null && !loaderData.success ? loaderData.error : undefined;
	const disqusId: string | undefined = isSuccess ? loaderData.id : undefined;

	React.useEffect(() => {
		if (error != null) {
			console.error('Blueprint error:', error);
		}
	}, [error]);

	const selectedBlueprint = rootBlueprint == null ? undefined : extractBlueprint(rootBlueprint, selectedPath);

	const existingBlueprint = useLiveQuery(async () => {
		if (pasted == null || pasted === '') return null;

		try {
			return await db.findHistoryByData(pasted);
		} catch (dbError) {
			logger.error('Error finding blueprint in database', dbError, {
				context: 'BlueprintPlayground.useLiveQuery',
				pasted: pasted.substring(0, 100),
			});
			return null;
		}
	}, [pasted]);

	const onSelect = (path: string) => {
		void navigate({
			search: (prev) => ({
				...prev,
				selection: path,
			}),
		});
	};
	const existingBlueprintId = existingBlueprint?.id;
	const savedSelection = existingBlueprint?.metadata.selection;

	useEffect(() => {
		if (
			selectedPath != null &&
			selectedPath !== '' &&
			pasted != null &&
			pasted !== '' &&
			isSuccess &&
			existingBlueprintId !== undefined &&
			savedSelection !== selectedPath
		) {
			void updateBlueprintMetadata(existingBlueprintId, {
				selection: selectedPath,
			});
		}
	}, [selectedPath, pasted, isSuccess, existingBlueprintId, savedSelection]);

	const isBook = rootBlueprint?.blueprint_book != null;
	const transformPanel = (
		<TransformPanel
			key={selectedPath ?? ''}
			blueprint={selectedBlueprint}
			blueprintEditorSourceMode={
				editorCommitMatchesSource
					? BlueprintEditorSourceMode.ExistingRecord
					: BlueprintEditorSourceMode.CapturedDraft
			}
			onBlueprintCommit={(committedRoot) => {
				setEditorCommitState({committedRoot, sourceInput: pasted});
			}}
			rootBlueprint={rootBlueprint}
			selectedPath={selectedPath}
		/>
	);

	return (
		<div className="container">
			<h1>Factorio Blueprint Playground</h1>

			<Panel title="Blueprint Input">
				<BlueprintSourceHandler pasted={pasted} autoFocus={focusTextarea ?? false} />
			</Panel>

			{error == null ? null : <ErrorAlert error={error} />}

			<ErrorBoundary
				fallbackRender={({error: boundaryError, resetErrorBoundary}) => (
					<BlueprintErrorFallback
						error={boundaryError instanceof Error ? boundaryError : new Error(String(boundaryError))}
						resetErrorBoundary={resetErrorBoundary}
					/>
				)}
			>
				<div className="panels2">
					{/* The Root/Selected split and the tree only say something when there is a
						book to navigate. A lone blueprint is its own selection, so a second
						column would leave one tree row beside a tall Basic Information panel. */}
					{isBook ? (
						<>
							{/* Left side */}
							<div>
								<ExportActions blueprint={rootBlueprint} path={undefined} title="Root Blueprint" />

								<BlueprintTree
									rootBlueprint={rootBlueprint}
									onSelect={onSelect}
									selectedPath={selectedPath ?? ''}
								/>
							</div>

							{/* Right side */}
							<div>
								<ExportActions
									blueprint={selectedBlueprint}
									path={selectedPath}
									title="Selected Blueprint"
								/>
								{transformPanel}
								<BasicInfoPanel blueprint={selectedBlueprint} />
							</div>
						</>
					) : (
						<div>
							<ExportActions blueprint={selectedBlueprint} path={selectedPath} title="Blueprint" />
							{transformPanel}
							<BasicInfoPanel blueprint={selectedBlueprint} />
						</div>
					)}
				</div>

				<div className="panel-columns">
					<BlueprintInfoPanels blueprint={selectedBlueprint} />
				</div>

				<ParametersPanel blueprintString={selectedBlueprint} />

				<DisqusComments
					identifier={disqusId}
					url={getFactorioprintsUrl(disqusId)}
					title={rootBlueprint?.blueprint?.label}
				/>
			</ErrorBoundary>
		</div>
	);
}
