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
	license: 'Test data',
	sources: [
		{id: 'base', label: 'Factorio 2.0'},
		{id: 'space-age', label: 'Space Age', dlc: true},
		{id: 'quality', label: 'Quality', dlc: true},
	],
	names: {
		'transport-belt': 1,
		foundry: 2,
		'quality-module-3': 4,
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
				summary: within(group).getByText(/confidence/).textContent,
				names: within(group)
					.getAllByRole('listitem')
					.map((item) => item.textContent),
			})),
		).toStrictEqual([
			{summary: 'Space Age — medium confidence, 1 matching name', names: ['foundry']},
			{summary: 'Quality — high confidence, 1 matching name', names: ['quality-module-3']},
		]);
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

		expect(screen.getByText('Requires Space Exploration — low confidence, 1 matching name')).toBeInTheDocument();
		const unknownNames = screen.getByText('Unknown names (2)').parentElement;
		expect(unknownNames).not.toBeNull();
		expect(
			within(unknownNames!)
				.getAllByRole('listitem')
				.map((item) => item.textContent),
		).toStrictEqual(['invented-assembler', 'se-imaginary-beacon — likely Space Exploration (name prefix)']);
	});
});
