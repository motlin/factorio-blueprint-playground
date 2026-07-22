import {QueryClient, QueryClientProvider} from '@tanstack/react-query';
import {render, screen, within} from '@testing-library/react';
import type {ReactElement} from 'react';
import {describe, expect, it} from 'vite-plus/test';

import {ModDetectionPanel} from '../../src/components/blueprint/panels/mod-detection/ModDetectionPanel';
import type {ModDatabase} from '../../src/parsing/modDetection/types';
import type {BlueprintString} from '../../src/parsing/types';
import '../../test/setup';

const database: ModDatabase = {
	generatedAt: '2000-01-01',
	factoriolabCommit: '0000000000000000000000000000000000000000',
	factorioDataVersion: '0.0.0',
	license: 'Test data',
	sources: [
		{id: 'base', label: 'Factorio 2.0'},
		{id: 'space-age', label: 'Space Age', dlc: true},
		{id: 'quality', label: 'Quality', dlc: true},
		{id: 'map-editor', label: 'Map editor', editor: true},
		{id: 'space-age-map-editor', label: 'Space Age map editor', dlc: true, editor: true},
	],
	names: {
		'transport-belt': 1,
		foundry: 2,
		'quality-module-3': 4,
		'infinity-chest': 8,
		'turbo-loader': 16,
	},
	prefixes: {
		'se-': 'Space Exploration',
	},
};

const vanillaBlueprint: BlueprintString = {
	blueprint: {
		item: 'blueprint',
		version: 562949954076673,
		entities: [{entity_number: 1, name: 'transport-belt', position: {x: 0, y: 0}}],
	},
};

function renderWithClient(element: ReactElement, queryClient: QueryClient) {
	return render(<QueryClientProvider client={queryClient}>{element}</QueryClientProvider>);
}

function resolvedClient(): QueryClient {
	const queryClient = new QueryClient({defaultOptions: {queries: {retry: false}}});
	queryClient.setQueryData(['mod-db'], {default: database});
	return queryClient;
}

function loadingClient(): QueryClient {
	const queryClient = new QueryClient({defaultOptions: {queries: {retry: false}}});
	const query = queryClient.getQueryCache().build(queryClient, {
		queryKey: ['mod-db'],
		queryFn: async () => {
			await new Promise<void>((resolve) => {
				void resolve;
			});
			return {default: database};
		},
	});
	void query.fetch();
	return queryClient;
}

describe('ModDetectionPanel', () => {
	it('shows a loading row while the database chunk is pending', () => {
		const {container} = renderWithClient(<ModDetectionPanel blueprint={vanillaBlueprint} />, loadingClient());

		expect(container.textContent).toBe('Mod DetectionChecking mod requirements…');
	});

	it('summarizes the verdict and lists source evidence', () => {
		const blueprint: BlueprintString = {
			blueprint: {
				item: 'blueprint',
				version: 562949954076673,
				entities: [
					{entity_number: 1, name: 'foundry', position: {x: 0, y: 0}},
					{
						entity_number: 2,
						name: 'quality-module-3',
						quality: 'legendary',
						position: {x: 2, y: 0},
					},
				],
			},
		};
		renderWithClient(<ModDetectionPanel blueprint={blueprint} />, resolvedClient());

		expect(screen.getByText('Requires Space Age + Quality')).toBeInTheDocument();
		expect(
			screen.getAllByRole('group').map((group) => ({
				summary: group.querySelector('summary')?.textContent,
				names: within(group)
					.getAllByRole('listitem')
					.map((item) => item.textContent),
			})),
		).toStrictEqual([
			{summary: 'Space Agemedium confidence1 matching name', names: ['foundry']},
			{summary: 'Qualityhigh confidence1 matching name', names: ['quality-module-3']},
		]);
	});

	it('identifies base and Space Age map editor entities separately from vanilla', () => {
		const blueprint: BlueprintString = {
			blueprint: {
				item: 'blueprint',
				version: 562949954076673,
				entities: [
					{entity_number: 100, name: 'infinity-chest', position: {x: 0, y: 0}},
					{entity_number: 200, name: 'turbo-loader', position: {x: 2, y: 0}},
				],
			},
		};
		renderWithClient(<ModDetectionPanel blueprint={blueprint} />, resolvedClient());

		expect({
			headline: screen.getByText('Contains base + Space Age map editor entities').textContent,
			sources: screen.getAllByRole('group').map((group) => ({
				summary: group.querySelector('summary')?.textContent,
				names: within(group)
					.getAllByRole('listitem')
					.map((item) => item.textContent),
			})),
		}).toStrictEqual({
			headline: 'Contains base + Space Age map editor entities',
			sources: [
				{summary: 'Map editorEditorhigh confidence1 matching name', names: ['infinity-chest']},
				{summary: 'Space Age map editorEditorhigh confidence1 matching name', names: ['turbo-loader']},
			],
		});
	});

	it('lists unknown names and their prefix hints', () => {
		const blueprint: BlueprintString = {
			blueprint: {
				item: 'blueprint',
				version: 562949954076673,
				entities: [
					{entity_number: 1, name: 'invented-assembler', position: {x: 0, y: 0}},
					{entity_number: 2, name: 'se-imaginary-beacon', position: {x: 2, y: 0}},
				],
			},
		};
		renderWithClient(<ModDetectionPanel blueprint={blueprint} />, resolvedClient());

		expect(
			screen.getByText(
				'Requires Space Exploration — low confidence, 1 matching name · Likely modded — 2 unknown names',
			).textContent,
		).toBe('Requires Space Exploration — low confidence, 1 matching name · Likely modded — 2 unknown names');
		expect(
			screen.getAllByRole('group').map((group) => ({
				summary: group.querySelector('summary')?.textContent,
				names: within(group)
					.getAllByRole('listitem')
					.map((item) => item.textContent),
			})),
		).toStrictEqual([
			{
				summary: 'Space Explorationlow confidence1 matching name',
				names: ['se-imaginary-beacon'],
			},
			{
				summary: 'Unknown names2 names',
				names: ['invented-assembler', 'se-imaginary-beaconLikely Space Exploration from the name prefix'],
			},
		]);
	});
});
