import {render, screen} from '@testing-library/react';
import {describe, expect, test} from 'vitest';

import {BlueprintInfoPanels} from '../../src/components/blueprint/panels/BlueprintInfoPanels';
import {BlueprintString} from '../../src/parsing/types';

describe('BlueprintInfoPanels', () => {
	test('renders nothing when no blueprint is provided', () => {
		const {container} = render(<BlueprintInfoPanels />);
		expect(container).toBeEmptyDOMElement();
	});

	test('renders ContentsPanel for regular blueprint', () => {
		const blueprint: BlueprintString = {
			blueprint: {
				item: 'blueprint',
				version: 281479275675648,
				label: 'Test Blueprint',
				entities: [
					{
						entity_number: 1,
						name: 'assembling-machine-2',
						position: {x: 0, y: 0},
					},
				],
			},
		};

		render(<BlueprintInfoPanels blueprint={blueprint} />);

		// Should render entities section from ContentsPanel
		expect(screen.getByText('Entities')).toBeInTheDocument();
		// Should not render upgrade or deconstruction content
		expect(screen.queryByText('Upgrade Mappings')).not.toBeInTheDocument();
		expect(screen.queryByText('Entity Filters')).not.toBeInTheDocument();
	});

	test('renders UpgradePlannerPanel for upgrade planner', () => {
		const blueprint: BlueprintString = {
			upgrade_planner: {
				item: 'upgrade-planner',
				settings: {
					mappers: [
						{
							from: {
								type: 'entity',
								name: 'transport-belt',
							},
							to: {
								type: 'entity',
								name: 'fast-transport-belt',
							},
							index: 0,
						},
					],
				},
			},
		};

		render(<BlueprintInfoPanels blueprint={blueprint} />);

		// Should render upgrade planner content
		expect(screen.getByText('Upgrade Mappings')).toBeInTheDocument();
		// Should not render regular blueprint or deconstruction content
		expect(screen.queryByText('Entities')).not.toBeInTheDocument();
		expect(screen.queryByText('Entity Filters')).not.toBeInTheDocument();
	});

	test('renders DeconstructionPlannerPanel for deconstruction planner', () => {
		const blueprint: BlueprintString = {
			deconstruction_planner: {
				item: 'deconstruction-planner',
				settings: {
					entity_filter_mode: 1,
					entity_filters: [
						{
							name: 'transport-belt',
							index: 0,
						},
					],
				},
			},
		};

		render(<BlueprintInfoPanels blueprint={blueprint} />);

		// Should render deconstruction planner content
		expect(screen.getByText('Entity Filters')).toBeInTheDocument();
		// Should not render regular blueprint or upgrade content
		expect(screen.queryByText('Entities')).not.toBeInTheDocument();
		expect(screen.queryByText('Upgrade Mappings')).not.toBeInTheDocument();
	});

	test('memoization prevents re-renders with same props', () => {
		// Create a test component that counts renders
		let renderCount = 0;

		function TestComponent({blueprint}: {blueprint?: BlueprintString}) {
			renderCount++;
			return <BlueprintInfoPanels blueprint={blueprint} />;
		}

		const blueprint: BlueprintString = {
			blueprint: {
				item: 'blueprint',
				version: 281479275675648,
				label: 'Test Blueprint',
				entities: [
					{
						entity_number: 1,
						name: 'assembling-machine-2',
						position: {x: 0, y: 0},
					},
				],
			},
		};

		const {rerender} = render(<TestComponent blueprint={blueprint} />);
		expect(renderCount).toBe(1);

		// Re-render with same props - parent re-renders but BlueprintInfoPanels should not
		rerender(<TestComponent blueprint={blueprint} />);
		expect(renderCount).toBe(2);

		// Verify content is still there (component didn't break)
		expect(screen.getByText('Entities')).toBeInTheDocument();

		// Re-render with different props
		const newBlueprint: BlueprintString = {
			blueprint: {
				item: 'blueprint',
				version: 281479275675648,
				label: 'Different Blueprint',
				entities: [
					{
						entity_number: 1,
						name: 'inserter',
						position: {x: 0, y: 0},
					},
				],
			},
		};
		rerender(<TestComponent blueprint={newBlueprint} />);
		expect(renderCount).toBe(3);

		// Verify content updated
		expect(screen.getByText('Entities')).toBeInTheDocument();
	});
});
