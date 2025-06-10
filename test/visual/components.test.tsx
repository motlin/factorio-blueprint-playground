import {render} from '@testing-library/react';
import type React from 'react';
import {describe, it} from 'vitest';

import {ContentsPanel} from '../../src/components/blueprint/panels/contents/ContentsPanel';
import {DeconstructionPlannerPanel} from '../../src/components/blueprint/panels/deconstruction/DeconstructionPlannerPanel';
import {BasicInfoPanel} from '../../src/components/blueprint/panels/info/BasicInfoPanel';
import {ParametersPanel} from '../../src/components/blueprint/panels/parameters/ParametersPanel';
import {UpgradePlannerPanel} from '../../src/components/blueprint/panels/upgrade/UpgradePlannerPanel';
import {BlueprintTree} from '../../src/components/blueprint/tree';

import {compareScreenshots} from './setup';

function renderToStaticHTML(element: React.ReactElement): string {
	const div = document.createElement('div');
	render(element, {container: div});
	return div.innerHTML;
}

// Helper to replace icon URLs with placeholders for tests
function replaceIconUrls(html: string): string {
	return html.replace(
		/https:\/\/factorio-icon-cdn\.pages\.dev\/[^"]+/g,
		'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%2232%22 height=%2232%22 viewBox=%220 0 32 32%22%3E%3Crect width=%2232%22 height=%2232%22 fill=%22%23666%22/%3E%3C/svg%3E',
	);
}

describe.sequential('Visual regression tests', () => {
	it('BasicInfoPanel renders consistently', async () => {
		const mockBlueprint = {
			blueprint: {
				item: 'blueprint',
				version: 281479275675648,
				label: 'Test Blueprint',
				description: 'Test description with [item=iron-plate] and [color=red]colored text[/color]',
				icons: [
					{
						signal: {type: 'item', name: 'iron-plate'},
						index: 1,
					},
				],
			},
		};

		const html = renderToStaticHTML(<BasicInfoPanel blueprint={mockBlueprint} />);
		await compareScreenshots('basic-info-panel', replaceIconUrls(html));
	});

	it('BlueprintTree renders consistently', async () => {
		const mockBlueprint = {
			blueprint_book: {
				item: 'blueprint-book',
				version: 281479275675648,
				label: 'Simple Test Book',
				active_index: 0,
				blueprints: [
					{
						blueprint: {
							item: 'blueprint',
							label: 'First Blueprint',
							icons: [{signal: {type: 'item', name: 'iron-plate'}, index: 1}],
						},
					},
				],
			},
		};

		const html = renderToStaticHTML(
			<BlueprintTree
				rootBlueprint={mockBlueprint}
				selectedPath=""
				onSelect={() => {}}
			/>,
		);

		await compareScreenshots('blueprint-tree', replaceIconUrls(html));
	}, 15000); // timeout 15 seconds

	it('ContentsPanel renders entities and recipes consistently', async () => {
		const mockBlueprint = {
			blueprint: {
				item: 'blueprint',
				version: 281479275675648,
				label: 'Test Blueprint with Entities',
				entities: [
					{
						entity_number: 1,
						name: 'assembling-machine-2',
						position: {x: 0, y: 0},
						recipe: 'electronic-circuit',
					},
					{
						entity_number: 2,
						name: 'assembling-machine-2',
						position: {x: 0, y: 0},
						recipe: 'electronic-circuit',
					},
					{
						entity_number: 3,
						name: 'inserter',
						position: {x: 0, y: 0},
					},
					{
						entity_number: 4,
						name: 'fast-inserter',
						position: {x: 0, y: 0},
					},
				],
				tiles: [
					{name: 'concrete', position: {x: 0, y: 0}},
					{name: 'concrete', position: {x: 1, y: 0}},
					{name: 'hazard-concrete', position: {x: 2, y: 0}},
				],
			},
		};

		const html = renderToStaticHTML(<ContentsPanel blueprint={mockBlueprint} />);
		await compareScreenshots('contents-panel', replaceIconUrls(html));
	});

	it('ParametersPanel renders consistently', async () => {
		const mockBlueprint = {
			blueprint: {
				item: 'blueprint',
				version: 281479275675648,
				label: 'Parameterized Blueprint',
				parameters: [
					{
						type: 'id',
						name: 'Primary Item',
						id: 'iron-plate',
						'quality-condition': {
							quality: 'normal',
							comparator: '=',
						},
					},
					{
						type: 'number',
						number: '10',
						name: 'Threshold',
						variable: 'x',
					},
					{
						type: 'number',
						number: '20',
						name: 'Derived Value',
						variable: 'y',
						formula: 'x * 2',
					},
					{
						type: 'id',
						name: 'Secondary Item',
						id: 'copper-plate',
						'ingredient-of': 'parameter-0',
					},
				],
			},
		};

		const html = renderToStaticHTML(<ParametersPanel blueprintString={mockBlueprint} />);
		await compareScreenshots('parameters-panel', replaceIconUrls(html));
	});

	it('UpgradePlannerPanel renders consistently', async () => {
		const mockBlueprint = {
			upgrade_planner: {
				item: 'upgrade-planner',
				settings: {
					mappers: [
						{
							from: {
								type: 'entity',
								name: 'transport-belt',
								quality: 'normal',
								comparator: '=',
							},
							to: {
								type: 'entity',
								name: 'fast-transport-belt',
							},
							index: 0,
						},
						{
							from: {
								type: 'entity',
								name: 'inserter',
								quality: 'normal',
								comparator: '=',
							},
							to: {
								type: 'entity',
								name: 'fast-inserter',
							},
							index: 1,
						},
					],
				},
			},
		};

		const html = renderToStaticHTML(<UpgradePlannerPanel blueprint={mockBlueprint} />);
		await compareScreenshots('upgrade-planner-panel', replaceIconUrls(html));
	});

	it('DeconstructionPlannerPanel renders consistently', async () => {
		const mockBlueprint = {
			deconstruction_planner: {
				item: 'deconstruction-planner',
				settings: {
					entity_filter_mode: 1,
					entity_filters: [
						{
							name: 'transport-belt',
							index: 0,
						},
						{
							name: 'inserter',
							index: 1,
						},
					],
					tile_selection_mode: 2,
					tile_filters: [
						{
							name: 'concrete',
							index: 0,
						},
					],
				},
			},
		};

		const html = renderToStaticHTML(<DeconstructionPlannerPanel blueprint={mockBlueprint} />);
		await compareScreenshots('deconstruction-planner-panel', replaceIconUrls(html));
	});
});
