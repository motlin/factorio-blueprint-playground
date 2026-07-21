import {QueryClient, QueryClientProvider} from '@tanstack/react-query';
import type {Decorator, Meta, StoryObj} from '@storybook/react-vite';

import type {ModDatabase} from '../../../../parsing/modDetection/types';
import {ModDetectionPanel} from './ModDetectionPanel';

const database: ModDatabase = {
	generatedAt: '2000-01-01',
	factoriolabCommit: '0000000000000000000000000000000000000000',
	license: 'Story data',
	sources: [
		{id: 'base', label: 'Factorio 2.0'},
		{id: 'space-age', label: 'Space Age', dlc: true},
		{id: 'quality', label: 'Quality', dlc: true},
		{id: 'map-editor', label: 'Map editor', editor: true},
		{id: 'space-age-map-editor', label: 'Space Age map editor', dlc: true, editor: true},
		{id: 'kr2', label: 'Krastorio 2'},
	],
	names: {
		'transport-belt': 1,
		foundry: 2,
		'quality-module-3': 4,
		'infinity-chest': 8,
		'turbo-loader': 16,
		'kr-advanced-assembler': 32,
		'kr-imersite-crystal': 32,
		'kr-singularity-beacon': 32,
	},
	prefixes: {
		'kr-': 'Krastorio 2',
		'se-': 'Space Exploration',
	},
};

function withDatabase(state: ModDatabase | 'loading'): Decorator {
	return (StoryComponent) => {
		const queryClient = new QueryClient({
			defaultOptions: {queries: {retry: false}},
		});
		if (state === 'loading') {
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
		} else {
			queryClient.setQueryData(['mod-db'], {default: state});
		}

		return (
			<QueryClientProvider client={queryClient}>
				<StoryComponent />
			</QueryClientProvider>
		);
	};
}

const meta: Meta<typeof ModDetectionPanel> = {
	title: 'Blueprint/Panels/Mod Detection/ModDetectionPanel',
	component: ModDetectionPanel,
	parameters: {
		layout: 'centered',
	},
	tags: ['autodocs'],
	decorators: [
		(StoryComponent) => (
			<div style={{minWidth: '500px'}}>
				<StoryComponent />
			</div>
		),
	],
};

export default meta;
type Story = StoryObj<typeof ModDetectionPanel>;

export const Loading: Story = {
	args: {
		blueprint: {
			blueprint: {
				item: 'blueprint',
				version: 562949954076673,
			},
		},
	},
	decorators: [withDatabase('loading')],
};

export const Vanilla: Story = {
	args: {
		blueprint: {
			blueprint: {
				item: 'blueprint',
				version: 562949954076673,
				entities: [{entity_number: 1, name: 'transport-belt', position: {x: 0, y: 0}}],
			},
		},
	},
	decorators: [withDatabase(database)],
};

export const SpaceAge: Story = {
	args: {
		blueprint: {
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
		},
	},
	decorators: [withDatabase(database)],
};

export const Modded: Story = {
	args: {
		blueprint: {
			blueprint: {
				item: 'blueprint',
				version: 562949954076673,
				entities: [
					{entity_number: 1, name: 'kr-advanced-assembler', position: {x: 0, y: 0}},
					{entity_number: 2, name: 'kr-imersite-crystal', position: {x: 2, y: 0}},
					{entity_number: 3, name: 'kr-singularity-beacon', position: {x: 4, y: 0}},
				],
			},
		},
	},
	decorators: [withDatabase(database)],
};

export const MapEditor: Story = {
	args: {
		blueprint: {
			blueprint: {
				item: 'blueprint',
				version: 562949954076673,
				entities: [
					{entity_number: 1, name: 'infinity-chest', position: {x: 0, y: 0}},
					{entity_number: 2, name: 'turbo-loader', position: {x: 2, y: 0}},
				],
			},
		},
	},
	decorators: [withDatabase(database)],
};

export const Unknowns: Story = {
	args: {
		blueprint: {
			blueprint: {
				item: 'blueprint',
				version: 562949954076673,
				entities: [
					{entity_number: 1, name: 'invented-assembler', position: {x: 0, y: 0}},
					{entity_number: 2, name: 'se-imaginary-beacon', position: {x: 2, y: 0}},
				],
			},
		},
	},
	decorators: [withDatabase(database)],
};
