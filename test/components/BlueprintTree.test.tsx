import {render} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import {describe, expect, it, vi} from 'vitest';

import {BlueprintTree} from '../../src/components/blueprint/tree';
import type {BlueprintString} from '../../src/parsing/types';

/**
 * Test suite for BlueprintTree component.
 * Verifies tree structure rendering and selection behavior.
 */
describe('BlueprintTree Component', () => {
	const testBlueprintData: BlueprintString = {
		blueprint_book: {
			item: 'blueprint-book',
			version: 1,
			active_index: 1,
			blueprints: [
				{
					index: 0,
					blueprint: {
						item: 'blueprint',
						label: 'First Blueprint',
						version: 1,
					},
				},
				{
					index: 1,
					blueprint: {
						item: 'blueprint',
						label: 'Second Blueprint',
						version: 1,
					},
				},
			],
		},
	};

	it('highlights active blueprint on initial render', () => {
		const onSelect = vi.fn();
		const {container} = render(
			<BlueprintTree
				rootBlueprint={testBlueprintData}
				onSelect={onSelect}
			/>,
		);

		const treeRows = container.querySelectorAll('.tree-row');
		expect(treeRows).toHaveLength(3);
		expect(treeRows[2].className).toContain('active');
		expect(treeRows[1].className).not.toContain('active');
		expect(treeRows[1].textContent).toContain('First Blueprint');
		expect(treeRows[2].textContent).toContain('Second Blueprint');
	});

	it('calls onSelect when clicking blueprints', async () => {
		const user = userEvent.setup();
		const onSelect = vi.fn();

		const {container} = render(
			<BlueprintTree
				rootBlueprint={testBlueprintData}
				onSelect={onSelect}
			/>,
		);

		const firstBlueprint = container.querySelectorAll('.tree-row')[1];
		await user.click(firstBlueprint);

		expect(onSelect).toHaveBeenCalledWith('1');
	});

	it('maintains selection state across rerenders', () => {
		const onSelect = vi.fn();
		const {container, rerender} = render(
			<BlueprintTree
				rootBlueprint={testBlueprintData}
				selectedPath="1"
				onSelect={onSelect}
			/>,
		);

		const initialRows = container.querySelectorAll('.tree-row');
		expect(initialRows[1].className).toContain('selected');

		rerender(
			<BlueprintTree
				rootBlueprint={testBlueprintData}
				selectedPath="1"
				onSelect={onSelect}
			/>,
		);

		const rerenderedRows = container.querySelectorAll('.tree-row');
		expect(rerenderedRows[1].className).toContain('selected');
	});
});
