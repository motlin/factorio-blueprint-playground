import {render} from '@testing-library/preact';
import userEvent from '@testing-library/user-event';
import React from 'react';
import {beforeEach, describe, expect, it, vi} from 'vitest';

import {BlueprintTree} from '../../src/components/BlueprintTree';
// Import the mocked module after mocking it
import * as blueprintState from '../../src/state/blueprintState';
import {TreeNode} from '../../src/state/blueprintState';
import {BlueprintString} from '../parsing/types.ts';

// Mock the state module
vi.mock('../../src/state/blueprintState', () => ({
    blueprintTreeSignal: { value: null },
    selectedPathSignal: { value: null },
    selectBlueprintPath: vi.fn(),
}));

describe('BlueprintTree', () => {
    const simpleBlueprintBook: TreeNode = {
        path: '',
        blueprint: {
            blueprint_book: {
                item: 'blueprint-book' as const,
                version: 1,
                active_index: 1, // Second blueprint should be active
                blueprints: [
                    {
                        index: 0,
                        blueprint: {
                            item: 'blueprint' as const,
                            label: 'First',
                            version: 1,
            },
        },
                    {
                        index: 1,
                        blueprint: {
                            item: 'blueprint' as const,
                            label: 'Second',
                            version: 1,
                        },
                    },
                ],
            },
        } as BlueprintString,
        children: [
            {
                path: '1',
                blueprint: {
                    blueprint: {
                        item: 'blueprint' as const,
                        label: 'First',
                        version: 1,
                    },
                } as BlueprintString,
                children: [],
            },
            {
                path: '2',
                blueprint: {
                    blueprint: {
                        item: 'blueprint' as const,
                        label: 'Second',
                        version: 1,
                    },
                } as BlueprintString,
                children: [],
            },
        ],
    };

    beforeEach(() => {
        // Reset mock state before each test
        // Access the mock directly through vi.mocked
        const mockedState = vi.mocked(blueprintState);
        // Type assertion to allow setting read-only properties for testing
        (mockedState.blueprintTreeSignal as { value: TreeNode | null }).value = simpleBlueprintBook;
        (mockedState.selectedPathSignal as { value: string | null }).value = null;
        mockedState.selectBlueprintPath.mockReset();
    });

    it('highlights active blueprint', () => {
        const { container } = render(<BlueprintTree />);

        // The second blueprint (index 1) should have the active class
        const allRows = container.querySelectorAll('.tree-row');
        expect(allRows[2].className).toContain('active'); // Second blueprint
        expect(allRows[1].className).not.toContain('active'); // First blueprint
    });

    it('allows selecting blueprints by clicking', async () => {
        const user = userEvent.setup();
        const { container } = render(<BlueprintTree />);

        // Click the first blueprint
        const firstBlueprint = container.querySelectorAll('.tree-row')[1];
        await user.click(firstBlueprint);

        // Should have called selectBlueprintPath with the correct path
        expect(blueprintState.selectBlueprintPath).toHaveBeenCalledWith('1');
    });

    it('avoids infinite loops between clicks updating the URL and URL changes updating the state', async () => {
        const user = userEvent.setup();
        const { container } = render(<BlueprintTree />);

        // Click the first blueprint
        const firstBlueprint = container.querySelectorAll('.tree-row')[1];
        await user.click(firstBlueprint);

        // Simulate URL change
        blueprintState.selectedPathSignal.value = '1';

        // Click the second blueprint
        const secondBlueprint = container.querySelectorAll('.tree-row')[2];
        await user.click(secondBlueprint);

        // Simulate URL change
        blueprintState.selectedPathSignal.value = '2';

        // Ensure no infinite loop occurred
        expect(blueprintState.selectBlueprintPath).toHaveBeenCalledTimes(2);
    });

    it('updates selection state correctly when starting with a URL with data and selection', () => {
        const mockedState = vi.mocked(blueprintState);
        mockedState.selectedPathSignal.value = '2';

        const { container } = render(<BlueprintTree />);

        const allRows = container.querySelectorAll('.tree-row');
        expect(allRows[2].className).toContain('selected'); // Second blueprint should be selected
        expect(allRows[1].className).not.toContain('selected'); // First blueprint should not be selected
    });

    it('updates selection state correctly when starting with data and then selecting an item in the tree', async () => {
        const user = userEvent.setup();
        const { container } = render(<BlueprintTree />);

        // Click the first blueprint
        const firstBlueprint = container.querySelectorAll('.tree-row')[1];
        await user.click(firstBlueprint);

        // Simulate URL change
        blueprintState.selectedPathSignal.value = '1';

        const allRows = container.querySelectorAll('.tree-row');
        expect(allRows[1].className).toContain('selected'); // First blueprint should be selected
        expect(allRows[2].className).not.toContain('selected'); // Second blueprint should not be selected
    });
});
