import {useNavigate} from '@tanstack/react-router';
import {useLiveQuery} from 'dexie-react-hooks';
import {useEffect, useState} from 'react';
import {ErrorBoundary} from 'react-error-boundary';

import type {BlueprintFetchResult} from '../fetching/blueprintFetcher';
import {logger} from '../lib/sentry';
import {BlueprintError, extractBlueprint} from '../parsing/blueprintParser';
import type {BlueprintString} from '../parsing/types';
import {type RootSearch, Route} from '../routes';
import {updateBlueprintMetadata} from '../state/blueprintLocalStorage';
import {db, generateSha} from '../storage/db';

import DisqusComments from './blueprint/disqus/DisqusComments';
import {BlueprintErrorFallback} from './blueprint/error/BlueprintErrorFallback';
import {ExportActions} from './blueprint/export/ExportActions';
import BlueprintSourceHandler from './blueprint/input/BlueprintSourceHandler';
import {BlueprintInfoPanels} from './blueprint/panels/BlueprintInfoPanels';
import {BasicInfoPanel} from './blueprint/panels/info/BasicInfoPanel';
import {ParametersPanel} from './blueprint/panels/parameters/ParametersPanel';
import {BlueprintTree} from './blueprint/tree/BlueprintTree';
import {ErrorAlert} from './ui/ErrorAlert';
import {Panel} from './ui/Panel';

function getFactorioprintsUrl(id?: string): string | undefined {
	if (!id) {
		return undefined;
	}
	return `https://factorioprints.com/view/${id}`;
}

export function BlueprintPlayground() {
	const {pasted, selection: selectedPath, focusTextarea}: RootSearch = Route.useSearch();
	const loaderData: BlueprintFetchResult = Route.useLoaderData();
	const [selectionError, setSelectionError] = useState<string | undefined>(undefined);
	const [selectedBlueprint, setSelectedBlueprint] = useState<BlueprintString | undefined>(undefined);

	const navigate = useNavigate({from: Route.fullPath});
	const rootBlueprint: BlueprintString | undefined = loaderData?.success ? loaderData.blueprintString : undefined;
	const error = loaderData?.success ? undefined : loaderData?.error;
	const disqusId: string | undefined = loaderData?.success ? loaderData.id : undefined;

	useEffect(() => {
		if (error) {
			console.error('Blueprint error:', error);
		}
	}, [error]);

	useEffect(() => {
		setSelectionError(undefined);

		if (!rootBlueprint) {
			setSelectedBlueprint(undefined);
			return;
		}

		if (!selectedPath) {
			setSelectedBlueprint(rootBlueprint);
			return;
		}

		try {
			const extracted = extractBlueprint(rootBlueprint, selectedPath);
			setSelectedBlueprint(extracted);
		} catch (e) {
			if (e instanceof BlueprintError) {
				setSelectionError(e.message);
				console.error('Selection error:', e.message);
			}
			setSelectedBlueprint(undefined);
		}
	}, [rootBlueprint, selectedPath]);

	const existingBlueprint = useLiveQuery(async () => {
		if (!pasted) return null;

		try {
			const sha = await generateSha(pasted);
			return await db.blueprints.get(sha);
		} catch (dbError) {
			logger.error('Error finding blueprint in database', dbError, {
				context: 'BlueprintPlayground.useLiveQuery',
				pasted: pasted?.substring(0, 100),
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

	return (
		<div className="container">
			<h1>Factorio Blueprint Playground</h1>

			<Panel title="Blueprint Input">
				<BlueprintSourceHandler
					pasted={pasted}
					autoFocus={focusTextarea ?? false}
				/>
			</Panel>

			<div style={{width: '100%'}}>
				{error ? <ErrorAlert error={error} /> : null}
				{selectionError ? <ErrorAlert error={selectionError} /> : null}
			</div>

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
