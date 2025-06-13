import {useNavigate} from '@tanstack/react-router';
import {useLiveQuery} from 'dexie-react-hooks';
import React, {useEffect} from 'react';
import {ErrorBoundary} from 'react-error-boundary';

import {BlueprintFetchResult} from '../fetching/blueprintFetcher';
import {logger} from '../lib/sentry';
import {extractBlueprint} from '../parsing/blueprintParser';
import type {BlueprintString} from '../parsing/types';
import {RootSearch, Route} from '../routes';
import {updateBlueprintMetadata} from '../state/blueprintLocalStorage';
import {db, generateSha} from '../storage/db';

import DisqusComments from './blueprint/disqus/DisqusComments';
import {ExportActions} from './blueprint/export/ExportActions';
import BlueprintSourceHandler from './blueprint/input/BlueprintSourceHandler';
import {BlueprintInfoPanels} from './blueprint/panels/BlueprintInfoPanels';
import {BasicInfoPanel} from './blueprint/panels/info/BasicInfoPanel';
import {ParametersPanel} from './blueprint/panels/parameters/ParametersPanel';
import {BlueprintTree} from './blueprint/tree';
import {ButtonGreen, ErrorAlert, InsetDark, Panel} from './ui';

function getFactorioprintsUrl(id?: string): string | undefined {
	if (!id) {
		return undefined;
	}
	return `https://factorioprints.com/view/${id}`;
}

export function BlueprintPlayground() {
	const {pasted, selection: selectedPath, focusTextarea}: RootSearch = Route.useSearch();
	const loaderData: BlueprintFetchResult = Route.useLoaderData();

	const navigate = useNavigate({from: Route.fullPath});
	const rootBlueprint: BlueprintString | undefined = loaderData?.success ? loaderData.blueprintString : undefined;
	const error = loaderData?.success ? undefined : loaderData?.error;
	const disqusId: string | undefined = loaderData?.success ? loaderData.id : undefined;

	// Log errors using Sentry
	React.useEffect(() => {
		if (error) {
			logger.error('Blueprint error occurred', error, {
				context: 'BlueprintPlayground',
				pasted,
				selectedPath,
			});
		}
	}, [error, pasted, selectedPath]);

	const selectedBlueprint = rootBlueprint && extractBlueprint(rootBlueprint, selectedPath);

	const existingBlueprint = useLiveQuery(async () => {
		if (!pasted) return null;

		try {
			const sha = await generateSha(pasted);
			return await db.blueprints.get(sha);
		} catch (error) {
			logger.error('Error finding blueprint in database', error, {
				context: 'BlueprintPlayground.useLiveQuery',
				pasted: pasted?.substring(0, 100), // Only log first 100 chars for privacy
			});
			return null;
		}
	}, [pasted]);

	const onSelect = (path: string) => {
		void navigate({
			search: (prev: RootSearch): RootSearch => ({
				...prev,
				selection: path,
			}),
		});

		if (pasted && rootBlueprint && loaderData.success && existingBlueprint) {
			void updateBlueprintMetadata(existingBlueprint.metadata.sha, {
				selection: path,
			});
		}
	};

	useEffect(() => {
		if (selectedPath && pasted && rootBlueprint && loaderData.success && existingBlueprint) {
			void updateBlueprintMetadata(existingBlueprint.metadata.sha, {
				selection: selectedPath,
			});
		}
	}, [selectedPath, pasted, rootBlueprint, loaderData?.success, existingBlueprint]);

	const BlueprintErrorFallback = ({error, resetErrorBoundary}: {error: Error; resetErrorBoundary: () => void}) => {
		// Log the error to Sentry when the error boundary catches it
		React.useEffect(() => {
			logger.error('Blueprint display error caught by error boundary', error, {
				context: 'BlueprintErrorFallback',
				selectedPath,
				rootBlueprintExists: !!rootBlueprint,
			});
		}, [error]);

		return (
			<Panel title="Blueprint Error">
				<InsetDark>
					<p>There was an error displaying the blueprint: {error.message}</p>
					<p>Please try pasting a different blueprint string above.</p>
					<p />
					<ButtonGreen onClick={resetErrorBoundary}>Try Again</ButtonGreen>
				</InsetDark>
			</Panel>
		);
	};

	return (
		<div className="container">
			<h1>Factorio Blueprint Playground</h1>

			<Panel title="Blueprint Input">
				<BlueprintSourceHandler
					pasted={pasted}
					autoFocus={focusTextarea ?? false}
				/>
			</Panel>

			{error && <ErrorAlert error={error} />}

			<ErrorBoundary FallbackComponent={BlueprintErrorFallback}>
				<div className="panels2">
					{/* Left side */}
					<div>
						<ExportActions
							blueprint={rootBlueprint}
							path={undefined}
							title="Root Blueprint"
						/>

						<BlueprintTree
							rootBlueprint={rootBlueprint}
							onSelect={onSelect}
							selectedPath={selectedPath || ''}
						/>
					</div>

					{/* Right side */}
					<div>
						<ExportActions
							blueprint={selectedBlueprint}
							path={selectedPath}
							title="Selected Blueprint"
						/>
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
			</ErrorBoundary>
		</div>
	);
}

export default BlueprintPlayground;
