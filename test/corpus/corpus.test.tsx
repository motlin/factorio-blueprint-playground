/// <reference types="node" />
import {readFileSync, readdirSync} from 'node:fs';
import {join} from 'node:path';

import {QueryClient, QueryClientProvider} from '@tanstack/react-query';
import {cleanup, render} from '@testing-library/react';
import type {ReactElement, ReactNode} from 'react';
import {afterEach, describe, test} from 'vite-plus/test';

import {BlueprintInfoPanels} from '../../src/components/blueprint/panels/BlueprintInfoPanels';
import {BasicInfoPanel} from '../../src/components/blueprint/panels/info/BasicInfoPanel';
import {ParametersPanel} from '../../src/components/blueprint/panels/parameters/ParametersPanel';
import {BlueprintTree} from '../../src/components/blueprint/tree/BlueprintTree';
import databaseJson from '../../src/generated/mod-db.json';
import {lintBlueprint} from '../../src/lint/engine';
import {deserializeBlueprint} from '../../src/parsing/blueprintParser';
import type {ModDatabase} from '../../src/parsing/modDetection/types';
import type {BlueprintString} from '../../src/parsing/types';

// Opt-in: download a corpus with scripts/corpus/fetch-top-blueprints.sh, then run with CORPUS_DIR set.
const corpusDirectory = process.env.CORPUS_DIR;
const files = corpusDirectory === undefined ? [] : readdirSync(corpusDirectory).filter((file) => file.endsWith('.txt'));

function* selectableBlueprints(blueprint: BlueprintString): Generator<BlueprintString> {
	yield blueprint;
	for (const child of blueprint.blueprint_book?.blueprints ?? []) {
		yield* selectableBlueprints(child);
	}
}

const queryClient = new QueryClient({defaultOptions: {queries: {retry: false}}});
queryClient.setQueryData(['mod-db'], {default: databaseJson as ModDatabase});

function renderOnce(element: ReactElement) {
	render(element, {
		wrapper: ({children}: {children: ReactNode}) => (
			<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
		),
	});
	cleanup();
}

afterEach(() => {
	cleanup();
});

describe.skipIf(files.length === 0)('blueprint corpus', () => {
	test.each(files)(
		'renders every selectable blueprint in %s',
		(file) => {
			const encoded = readFileSync(join(corpusDirectory ?? '', file), 'utf8').trim();
			const root = deserializeBlueprint(encoded);
			renderOnce(<BlueprintTree rootBlueprint={root} selectedPath="" onSelect={() => undefined} />);
			for (const selected of selectableBlueprints(root)) {
				// The panel reports lint failures as a message, so call the engine directly to surface them.
				lintBlueprint(selected);
				renderOnce(
					<>
						<BasicInfoPanel blueprint={selected} />
						<BlueprintInfoPanels blueprint={selected} />
						<ParametersPanel blueprintString={selected} />
					</>,
				);
			}
		},
		300_000,
	);
});
